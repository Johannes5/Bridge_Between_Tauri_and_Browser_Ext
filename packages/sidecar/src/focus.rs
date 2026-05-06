use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};
use log::{info};
#[cfg(target_os = "windows")]
use std::ffi::OsString;
#[cfg(target_os = "windows")]
use std::os::windows::ffi::OsStringExt;

#[cfg(target_os = "windows")]
use windows::Win32::Foundation::{BOOL, HWND, LPARAM};
#[cfg(target_os = "windows")]
use windows::{
    Win32::System::Threading::AttachThreadInput,
    Win32::UI::WindowsAndMessaging::{
        AllowSetForegroundWindow, BringWindowToTop, EnumWindows, GetWindowTextLengthW, GetWindowTextW,
        GetWindowThreadProcessId, IsWindow, IsWindowVisible, SetForegroundWindow, SetWindowPos,
        ShowWindow, SwitchToThisWindow, ASFW_ANY, HWND_NOTOPMOST, HWND_TOPMOST, SWP_NOMOVE, SWP_NOSIZE
    },
    Win32::UI::WindowsAndMessaging::{GetForegroundWindow, SW_SHOW},
};


//TODO: figure out a better way to filter out the correct window to bring to front
#[derive(Debug, Deserialize)]
pub struct FocusWindowPayload {
    #[allow(dead_code)]
    pub hwnd: Option<isize>,
    #[allow(dead_code)]
    pub browser: Option<String>,
    #[allow(dead_code)]
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
        info!("[sidecar] focus.window not supported on this platform");
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
                    error!("[sidecar] wmctrl failed: {}", String::from_utf8_lossy(&out.stderr));
                    // If wmctrl fails or is not installed, we might want to try other methods or just log it.
                }
            }
            Err(e) => {
                error!("[sidecar] wmctrl execution failed (is it installed?): {}", e);
            }
        }
    } else {
        error!("[sidecar] No title provided for linux window focus");
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
    info!("[sidecar] focus_window_windows payload: {:?}", payload);

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
    info!("[sidecar] bring_window_to_front hwnd={hwnd:?}");
    unsafe {
        let h_cur_wnd = GetForegroundWindow() ;

        let dw_my_id =  GetWindowThreadProcessId(hwnd, None) ;

        let dw_cur_id = GetWindowThreadProcessId(h_cur_wnd, None) ;

        // Attach our thread to the foreground window's thread
        if dw_cur_id != 0 {
             let _ = AttachThreadInput(dw_cur_id, dw_my_id, true);
        }
        let mut pid = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        info!("window pid: {}", pid);
        let _ = AllowSetForegroundWindow(ASFW_ANY);
        let _ = AllowSetForegroundWindow(pid);


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
        let _ = ShowWindow(hwnd, SW_SHOW);
        let _ = SetForegroundWindow(hwnd);
        SwitchToThisWindow(hwnd, true);
    }



    info!("[sidecar] bring_window_to_front completed for hwnd={hwnd:?}");
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
