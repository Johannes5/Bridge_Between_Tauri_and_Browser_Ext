use anyhow::{anyhow, Context, Result};
use once_cell::sync::Lazy;
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::Mutex;

#[cfg(target_os = "windows")]
use std::ffi::OsString;
#[cfg(target_os = "windows")]
use std::os::windows::ffi::OsStringExt;

#[cfg(target_os = "windows")]
use windows::Win32::Foundation::{CloseHandle, BOOL, HWND, LPARAM};
#[cfg(target_os = "windows")]
use windows::Win32::System::ProcessStatus::K32GetModuleBaseNameW;
#[cfg(target_os = "windows")]
use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};
#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{
    AllowSetForegroundWindow, BringWindowToTop, EnumWindows,
    GetWindowTextLengthW, GetWindowTextW, GetWindowThreadProcessId, IsWindow, IsWindowVisible,
    SetForegroundWindow, SetWindowPos, ShowWindow, HWND_NOTOPMOST, HWND_TOPMOST,
    SWP_NOMOVE, SWP_NOSIZE, SW_RESTORE, ASFW_ANY,
};

#[derive(Debug, Deserialize)]
pub struct FocusWindowPayload {
    #[serde(rename = "windowId")]
    pub window_id: Option<i32>,
    pub title: Option<String>,
    pub url: Option<String>,
    pub browser: Option<String>,
    #[serde(rename = "connectionId")]
    pub connection_id: Option<String>,
}

pub fn focus_window(payload: &FocusWindowPayload) -> Result<()> {
    #[cfg(target_os = "windows")]
    {
        focus_window_windows(payload)
    }

    #[cfg(not(target_os = "windows"))]
    {
        println!("[sidecar] focus.window not supported on this platform");
        Ok(())
    }
}

#[cfg(target_os = "windows")]
static WINDOW_CACHE: Lazy<Mutex<HashMap<i32, isize>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

#[cfg(target_os = "windows")]
fn focus_window_windows(payload: &FocusWindowPayload) -> Result<()> {
    eprintln!("[sidecar] focus_window_windows payload: {:?}", payload);

    let mut cache = WINDOW_CACHE
        .lock()
        .map_err(|err| anyhow!("focus cache poisoned: {err:#}"))?;

    // Currently unused but kept for future routing logic
    let _ = &payload.connection_id;

    if let Some(window_id) = payload.window_id {
        if let Some(raw_hwnd) = cache.get(&window_id).copied() {
            let hwnd = HWND(raw_hwnd);
            if unsafe { IsWindow(hwnd).as_bool() } {
                drop(cache);
                bring_window_to_front(hwnd)?;
                return Ok(());
            } else {
                cache.remove(&window_id);
            }
        }
    }

    drop(cache);

    let target_hint = payload
        .title
        .as_ref()
        .map(|s| s.to_lowercase())
        .or_else(|| payload.url.as_ref().map(|s| s.to_lowercase()));
    let process_names = expected_process_names(payload.browser.as_deref());

    let mut state = SearchState {
        target_hint,
        process_names,
        best_hwnd: None,
        best_score: 0,
    };

    unsafe {
        let _ = EnumWindows(
            Some(enum_windows_proc),
            LPARAM(&mut state as *mut _ as isize),
        );
    }

    let hwnd = state
        .best_hwnd
        .context("No suitable browser window found")?;

    if let Some(window_id) = payload.window_id {
        if let Ok(mut guard) = WINDOW_CACHE.lock() {
            guard.insert(window_id, hwnd.0);
        }
    }

    bring_window_to_front(hwnd)?;
    Ok(())
}

#[cfg(target_os = "windows")]
fn expected_process_names(browser: Option<&str>) -> Vec<String> {
    let mut result = Vec::new();
    if let Some(name) = browser {
        let lower = name.to_lowercase();
        if lower.contains("chrome") {
            result.push("chrome.exe".to_string());
        } else if lower.contains("edge") {
            result.push("msedge.exe".to_string());
        } else if lower.contains("brave") {
            result.push("brave.exe".to_string());
        } else if lower.contains("firefox") {
            result.push("firefox.exe".to_string());
        } else if lower.contains("comet") || lower.contains("perplexity") {
            result.push("comet.exe".to_string());
            result.push("chrome.exe".to_string());
        } else {
            result.push(format!("{lower}.exe"));
        }
    }

    if result.is_empty() {
        result.extend(
            [
                "chrome.exe",
                "msedge.exe",
                "brave.exe",
                "comet.exe",
                "firefox.exe",
            ]
            .iter()
            .map(|s| s.to_string()),
        );
    }

    result
}

#[cfg(target_os = "windows")]
fn bring_window_to_front(hwnd: HWND) -> Result<()> {
    eprintln!("[sidecar] bring_window_to_front hwnd=0x{:X}", hwnd.0 as usize);

    unsafe {
        let mut pid = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));

        let _ = AllowSetForegroundWindow(ASFW_ANY);
        let _ = AllowSetForegroundWindow(pid);

        let _ = ShowWindow(hwnd, SW_RESTORE);

        let _ = SetWindowPos(
            hwnd,
            HWND_TOPMOST,
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE,
        );
        let _ = SetWindowPos(
            hwnd,
            HWND_NOTOPMOST,
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE,
        );
        let _ = BringWindowToTop(hwnd);
        let _ = SetForegroundWindow(hwnd);
    }

    eprintln!("[sidecar] bring_window_to_front completed for hwnd=0x{:X}", hwnd.0 as usize);
    Ok(())
}

#[cfg(target_os = "windows")]
struct SearchState {
    target_hint: Option<String>,
    process_names: Vec<String>,
    best_hwnd: Option<HWND>,
    best_score: i32,
}

#[cfg(target_os = "windows")]
unsafe extern "system" fn enum_windows_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let state = &mut *(lparam.0 as *mut SearchState);

    if !IsWindow(hwnd).as_bool() || !IsWindowVisible(hwnd).as_bool() {
        return BOOL(1);
    }

    let mut score = 0;

    let mut pid = 0;
    GetWindowThreadProcessId(hwnd, Some(&mut pid));

    if let Some(name) = get_process_name(pid) {
        if !state.process_names.is_empty()
            && !state
                .process_names
                .iter()
                .any(|expected| name.ends_with(expected))
        {
            return BOOL(1);
        }
        score += 100;
    } else {
        return BOOL(1);
    }

    let length = GetWindowTextLengthW(hwnd);
    if length > 0 {
        let mut buffer = vec![0u16; (length + 1) as usize];
        let read = GetWindowTextW(hwnd, &mut buffer) as usize;
        if read > 0 {
            buffer.truncate(read);
            let title = OsString::from_wide(&buffer).to_string_lossy().to_string();
            if let Some(target) = &state.target_hint {
                if !target.is_empty() && title.to_lowercase().contains(target) {
                    score += 50;
                }
            }
            if !title.is_empty() {
                score += 5;
            }
        }
    }

    if score > state.best_score {
        state.best_score = score;
        state.best_hwnd = Some(hwnd);
    }

    BOOL(1)
}

#[cfg(target_os = "windows")]
fn get_process_name(pid: u32) -> Option<String> {
    unsafe {
        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;

        let mut buffer = vec![0u16; 260];
        let len = K32GetModuleBaseNameW(handle, None, &mut buffer) as usize;
        let _ = CloseHandle(handle);

        if len == 0 {
            return None;
        }

        buffer.truncate(len);
        let name = OsString::from_wide(&buffer).to_string_lossy().to_string();
        Some(name.to_lowercase())
    }
}

