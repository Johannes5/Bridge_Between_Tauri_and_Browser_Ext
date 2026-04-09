use anyhow::{anyhow, Result};
#[cfg(target_os = "windows")]
use anyhow::Context;
use serde::{Deserialize, Serialize};

#[cfg(target_os = "windows")]
use std::ffi::OsString;
#[cfg(target_os = "windows")]
use std::os::windows::ffi::OsStringExt;

#[cfg(target_os = "windows")]
use std::collections::HashSet;
#[cfg(target_os = "windows")]
use std::thread;
#[cfg(target_os = "windows")]
use std::time::Duration;

#[cfg(target_os = "windows")]
use windows::Win32::Foundation::{CloseHandle, GetLastError, BOOL, HWND, LPARAM};
#[cfg(target_os = "windows")]
use windows::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
};
#[cfg(target_os = "windows")]
use windows::Win32::System::ProcessStatus::K32GetModuleBaseNameW;
#[cfg(target_os = "windows")]
use windows::Win32::System::Threading::{
    AttachThreadInput, GetCurrentThreadId, OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION,
};
#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{
    AllowSetForegroundWindow, BringWindowToTop, EnumWindows, GetAncestor, GetClassNameW,
    GetForegroundWindow, GetWindowTextLengthW, GetWindowTextW, GetWindowThreadProcessId, IsWindow,
    IsWindowVisible, SetForegroundWindow, SetWindowPos, ShowWindow, SwitchToThisWindow, ASFW_ANY,
    GA_ROOT, HWND_NOTOPMOST, HWND_TOPMOST, SWP_NOMOVE, SWP_NOSIZE, SW_RESTORE,
};

#[derive(Debug, Deserialize)]
pub struct FocusWindowPayload {
    #[allow(dead_code)]
    pub hwnd: Option<isize>,
    pub browser: Option<String>,
    pub title: Option<String>,
}

#[derive(Debug, Serialize)]
#[allow(dead_code)]
pub struct WindowInfo {
    pub hwnd: isize,
    pub pid: u32,
    pub title: String,
}

pub fn focus_window(payload: &FocusWindowPayload) -> Result<()> {
    #[cfg(target_os = "windows")]
    {
        focus_window_windows(payload)
    }

    #[cfg(target_os = "macos")]
    {
        focus_window_macos(payload)
    }

    #[cfg(target_os = "linux")]
    {
        focus_window_linux(payload)
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        println!("[sidecar] focus.window not supported on this platform");
        Ok(())
    }
}

#[cfg(target_os = "linux")]
fn focus_window_linux(payload: &FocusWindowPayload) -> Result<()> {
    use std::process::Command;

    // Try using wmctrl if available
    if let Some(title) = &payload.title {
        // -a activates the window
        let output = Command::new("wmctrl")
            .arg("-a")
            .arg(title)
            .output();

        match output {
            Ok(out) => {
                if !out.status.success() {
                    eprintln!("[sidecar] wmctrl failed: {}", String::from_utf8_lossy(&out.stderr));
                    // If wmctrl fails or is not installed, we might want to try other methods or just log it.
                }
            }
            Err(e) => {
                eprintln!("[sidecar] wmctrl execution failed (is it installed?): {}", e);
            }
        }
    } else {
        eprintln!("[sidecar] No title provided for linux window focus");
    }

    Ok(())
}

#[cfg(target_os = "macos")]
fn focus_window_macos(payload: &FocusWindowPayload) -> Result<()> {
    use std::process::Command;

    let browser_name = payload.browser.as_deref().unwrap_or("Chrome");
    let app_name = match browser_name.to_lowercase().as_str() {
        b if b.contains("chrome") => "Google Chrome",
        b if b.contains("firefox") => "Firefox",
        b if b.contains("edge") => "Microsoft Edge",
        b if b.contains("brave") => "Brave Browser",
        b if b.contains("safari") => "Safari",
        _ => browser_name,
    };

    let script = if let Some(title) = &payload.title {
        // Simple AppleScript to find window by title for Chrome/Brave
        if app_name == "Google Chrome" || app_name == "Brave Browser" {
            format!(
                r#"
                tell application "{}"
                    activate
                    repeat with w in windows
                        if title of w contains "{}" then
                            set index of w to 1
                            exit repeat
                        end if
                    end repeat
                end tell
                "#,
                app_name, title
            )
        } else {
            // Fallback for other browsers or if title handling is different
            format!(r#"tell application "{}" to activate"#, app_name)
        }
    } else {
        format!(r#"tell application "{}" to activate"#, app_name)
    };

    let output = Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output()?;

    if !output.status.success() {
        return Err(anyhow!(
            "osascript failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    Ok(())
}

#[cfg(target_os = "windows")]
fn focus_window_windows(payload: &FocusWindowPayload) -> Result<()> {
    eprintln!("[sidecar] focus_window_windows payload: {:?}", payload);

    let hwnd_val = payload.hwnd.context("No HWND provided in payload")?;
    let hwnd = HWND(hwnd_val);

    if !unsafe { IsWindow(hwnd).as_bool() } {
        return Err(anyhow!("Invalid HWND received: {}", hwnd_val));
    }

    let root = unsafe { GetAncestor(hwnd, GA_ROOT) };
    let target = if root.0 != 0 {
        root
    } else {
        hwnd
    };

    if std::env::var("BRIDGE_FOCUS_DEBUG_CLASS").ok().as_deref() == Some("1") {
        let cls = window_class_name(target);
        eprintln!(
            "[sidecar] focus debug: raw_hwnd=0x{:x} root_hwnd=0x{:x} class={:?}",
            hwnd_val,
            target.0,
            cls
        );
    }

    const ATTEMPTS: u32 = 3;
    const PAUSE_MS: u64 = 200;

    for attempt in 1..=ATTEMPTS {
        bring_window_to_front_attempt(target, attempt)?;

        let fg = unsafe { GetForegroundWindow() };
        if fg.0 == target.0 {
            eprintln!(
                "[sidecar] foreground matches target 0x{:x} after attempt {}/{}",
                target.0, attempt, ATTEMPTS
            );
            return Ok(());
        }

        eprintln!(
            "[sidecar] foreground mismatch: have 0x{:x} want 0x{:x} (attempt {}/{})",
            fg.0,
            target.0,
            attempt,
            ATTEMPTS
        );

        if attempt < ATTEMPTS {
            thread::sleep(Duration::from_millis(PAUSE_MS));
        }
    }

    Ok(())
}

#[cfg(target_os = "windows")]
pub fn list_browser_windows(browser_pid: u32) -> Result<Vec<WindowInfo>> {
    let allowed_pids = collect_descendant_pids(browser_pid);
    let chromium_class_filter = browser_uses_chromium_top_level(browser_pid);

    let mut state = ListWindowsState {
        allowed_pids,
        chromium_class_filter,
        windows: Vec::new(),
    };

    unsafe {
        let _ = EnumWindows(
            Some(enum_windows_proc),
            LPARAM(&mut state as *mut _ as isize),
        );
    }

    Ok(state.windows)
}

#[cfg(target_os = "windows")]
fn collect_descendant_pids(browser_root: u32) -> HashSet<u32> {
    let mut pairs: Vec<(u32, u32)> = Vec::new();

    unsafe {
        let snap = match CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) {
            Ok(h) => h,
            Err(_) => return HashSet::from([browser_root]),
        };

        let mut entry = PROCESSENTRY32W::default();
        entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;

        if Process32FirstW(snap, &mut entry).is_ok() {
            loop {
                pairs.push((entry.th32ProcessID, entry.th32ParentProcessID));
                if Process32NextW(snap, &mut entry).is_err() {
                    break;
                }
            }
        }

        let _ = CloseHandle(snap);
    }

    let mut allowed = HashSet::new();
    allowed.insert(browser_root);
    let mut changed = true;
    while changed {
        changed = false;
        for &(pid, parent) in &pairs {
            if allowed.contains(&parent) && allowed.insert(pid) {
                changed = true;
            }
        }
    }

    allowed
}

#[cfg(target_os = "windows")]
fn browser_uses_chromium_top_level(browser_pid: u32) -> bool {
    get_process_name(browser_pid)
        .map(|n| {
            n.contains("chrome")
                || n.contains("msedge")
                || n.contains("brave")
                || n.contains("comet")
        })
        .unwrap_or(false)
}

#[cfg(target_os = "windows")]
fn window_class_name(hwnd: HWND) -> String {
    unsafe {
        let mut buf = [0u16; 256];
        let n = GetClassNameW(hwnd, &mut buf) as usize;
        if n == 0 {
            return String::new();
        }
        String::from_utf16_lossy(&buf[..n])
    }
}

#[cfg(target_os = "windows")]
fn is_chromium_top_level_frame(hwnd: HWND) -> bool {
    let cls = window_class_name(hwnd);
    cls.starts_with("Chrome_WidgetWin_")
}

#[cfg(target_os = "windows")]
fn bring_window_to_front_attempt(hwnd: HWND, attempt: u32) -> Result<()> {
    eprintln!(
        "[sidecar] bring_window_to_front_attempt hwnd={hwnd:?} attempt={attempt}"
    );

    unsafe {
        let browser_thread_id = GetWindowThreadProcessId(hwnd, None);
        let current_thread_id = GetCurrentThreadId();

        let _ = AllowSetForegroundWindow(ASFW_ANY);

        let attached = AttachThreadInput(current_thread_id, browser_thread_id, true).as_bool();

        let _ = ShowWindow(hwnd, SW_RESTORE);
        let _ = SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE);
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

        let sfw_ok = SetForegroundWindow(hwnd);
        if !sfw_ok.as_bool() {
            let err = GetLastError().0;
            eprintln!(
                "[sidecar] SetForegroundWindow returned false, GetLastError=0x{:x} (attempt {})",
                err, attempt
            );
        }

        SwitchToThisWindow(hwnd, true);

        if attached {
            let _ = AttachThreadInput(current_thread_id, browser_thread_id, false);
        }
    }

    Ok(())
}

#[cfg(target_os = "windows")]
struct ListWindowsState {
    allowed_pids: HashSet<u32>,
    chromium_class_filter: bool,
    windows: Vec<WindowInfo>,
}

#[cfg(target_os = "windows")]
unsafe extern "system" fn enum_windows_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let state = &mut *(lparam.0 as *mut ListWindowsState);

    if !IsWindow(hwnd).as_bool() || !IsWindowVisible(hwnd).as_bool() {
        return BOOL(1);
    }

    let mut pid = 0;
    GetWindowThreadProcessId(hwnd, Some(&mut pid));

    if !state.allowed_pids.contains(&pid) {
        return BOOL(1);
    }

    if state.chromium_class_filter && !is_chromium_top_level_frame(hwnd) {
        return BOOL(1);
    }

    let length = GetWindowTextLengthW(hwnd);
    if length == 0 {
        return BOOL(1);
    }

    let mut buffer = vec![0u16; (length + 1) as usize];
    let read = GetWindowTextW(hwnd, &mut buffer) as usize;
    if read > 0 {
        buffer.truncate(read);
        let title = OsString::from_wide(&buffer).to_string_lossy().to_string();
        
        // Basic filter to avoid capturing internal/utility windows
        if !title.is_empty() && title.len() > 2 {
             state.windows.push(WindowInfo {
                hwnd: hwnd.0,
                pid,
                title,
            });
        }
    }

    BOOL(1)
}

#[cfg(target_os = "windows")]
fn get_process_name(pid: u32) -> Option<String> {
    unsafe {
        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;

        let mut buffer = vec![0u16; 260];
        let len = K32GetModuleBaseNameW(handle, None, &mut buffer) as usize;
        
        if let Err(e) = CloseHandle(handle) {
            eprintln!("[sidecar] Warning: Failed to close process handle: {:?}", e);
        }

        if len == 0 {
            return None;
        }

        buffer.truncate(len);
        let name = OsString::from_wide(&buffer).to_string_lossy().to_string();
        Some(name.to_lowercase())
    }
}

