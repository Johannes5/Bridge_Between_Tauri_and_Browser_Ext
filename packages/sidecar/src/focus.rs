use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};

#[cfg(target_os = "windows")]
use std::ffi::OsString;
#[cfg(target_os = "windows")]
use std::os::windows::ffi::OsStringExt;

#[cfg(target_os = "windows")]
use windows::Win32::Foundation::{CloseHandle, BOOL, HWND, LPARAM};
#[cfg(target_os = "windows")]
use windows::Win32::System::ProcessStatus::K32GetModuleBaseNameW;
#[cfg(target_os = "windows")]
use windows::Win32::System::Threading::{
    AttachThreadInput, GetCurrentThreadId, OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION,
};
#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{
    AllowSetForegroundWindow, BringWindowToTop, EnumWindows, GetWindowTextLengthW, GetWindowTextW,
    GetWindowThreadProcessId, IsWindow, IsWindowVisible, SetForegroundWindow, SetWindowPos,
    ShowWindow, SwitchToThisWindow, ASFW_ANY, HWND_NOTOPMOST, HWND_TOPMOST, SWP_NOMOVE, SWP_NOSIZE,
    SW_RESTORE,
};

#[derive(Debug, Deserialize)]
pub struct FocusWindowPayload {
    pub hwnd: Option<isize>,
}

#[derive(Debug, Serialize)]
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

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        println!("[sidecar] focus.window not supported on this platform");
        Ok(())
    }
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

    bring_window_to_front(hwnd)?;
    Ok(())
}

#[cfg(target_os = "windows")]
pub fn list_browser_windows(browser_pid: u32) -> Result<Vec<WindowInfo>> {
    let mut state = ListWindowsState {
        browser_pid,
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
fn bring_window_to_front(hwnd: HWND) -> Result<()> {
    eprintln!("[sidecar] bring_window_to_front hwnd={hwnd:?}");

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
        let _ = SetForegroundWindow(hwnd);
        SwitchToThisWindow(hwnd, true);

        if attached {
            let _ = AttachThreadInput(current_thread_id, browser_thread_id, false);
        }
    }

    eprintln!("[sidecar] bring_window_to_front completed for hwnd={hwnd:?}");
    Ok(())
}

#[cfg(target_os = "windows")]
struct ListWindowsState {
    browser_pid: u32,
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

    if pid != state.browser_pid {
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

