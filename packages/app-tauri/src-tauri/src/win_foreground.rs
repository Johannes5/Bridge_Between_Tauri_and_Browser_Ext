//! Windows-only: delegate foreground permission after user-initiated bridge actions.

#[cfg(target_os = "windows")]
use tracing::{debug, warn};
#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{AllowSetForegroundWindow, ASFW_ANY};

/// Call when the user triggered an action that will ask the sidecar to foreground the browser.
#[cfg(target_os = "windows")]
pub fn allow_set_foreground_from_foreground_process() {
    unsafe {
        match AllowSetForegroundWindow(ASFW_ANY) {
            Ok(()) => debug!(target: "bridge", "AllowSetForegroundWindow(ASFW_ANY) succeeded"),
            Err(e) => warn!(
                target: "bridge",
                "AllowSetForegroundWindow(ASFW_ANY) failed: {:?}",
                e
            ),
        }
    }
}

#[cfg(not(target_os = "windows"))]
#[inline]
pub fn allow_set_foreground_from_foreground_process() {}
