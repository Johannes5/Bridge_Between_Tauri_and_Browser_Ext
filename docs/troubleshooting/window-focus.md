# Troubleshooting: Browser Window Focus (Windows)

This document describes how the bridge tries to raise the browser after `tabs.openOrFocus`, and how to debug it. See [../architecture.md](../architecture.md) for the system diagram.

## Current implementation (post-fix)

### 1. Foreground delegation from the Tauri app

When the user clicks **Open** (or triggers **`tabs.restore`**) in the desktop app, [`bridge_send`](../../packages/app-tauri/src-tauri/src/lib.rs) runs **before** the envelope is sent over the WebSocket. On Windows, the Tauri process calls **`AllowSetForegroundWindow(ASFW_ANY)`** ([`win_foreground.rs`](../../packages/app-tauri/src-tauri/src/win_foreground.rs)). That uses the **foreground / input token** from the desktop UI so the **next** `SetForegroundWindow` from another process (the sidecar) is more likely to succeed.

Enable `RUST_LOG=debug` (or `trace`) to see `AllowSetForegroundWindow` success or `windows_core::Error` in logs (target `bridge`).

### 2. Sidecar Win32 sequence

[`packages/sidecar/src/focus.rs`](../../packages/sidecar/src/focus.rs):

- Resolves **`GetAncestor(hwnd, GA_ROOT)`** so focus targets the **top-level** frame, not a child HWND.
- **`AttachThreadInput`**, restore, topmost toggle, **`BringWindowToTop`**, **`SetForegroundWindow`**, **`SwitchToThisWindow`** (same overall idea as before).
- Logs **`SetForegroundWindow`** failure with **`GetLastError`** immediately when the API returns false.
- **Retries** up to **3** times with **200 ms** between attempts if **`GetForegroundWindow`** does not match the target after each attempt.
- Optional: set **`BRIDGE_FOCUS_DEBUG_CLASS=1`** to log the resolved root HWND and **window class** on stderr (useful to confirm `Chrome_WidgetWin_*`).

### 3. Window list and HWND cache

- **`windows.list`** enumerates top-level windows whose **thread PID** is in the **browser process tree** (browser PID plus descendants via **Toolhelp32**), not only the native host’s parent PID. That covers HWNDs owned by Chromium child processes.
- For Chromium-based browsers (executable name contains `chrome`, `msedge`, `brave`, or `comet`), only windows whose class name **starts with `Chrome_WidgetWin_`** are listed, reducing utility / internal HWNDs.
- The extension maps native entries to `chrome.windows` using **scored title matching** (exact, then native contains browser title, then browser contains native), **one HWND per browser window** ([`assignNativeWindowsToBrowserWindows`](../../packages/ext-plasmo/src/background/windows.ts)).

## Representative logs

Extension service worker (`chrome://extensions` → Service Worker → Inspect):

```text
[bridge-ext] Handshake complete. Self-assigned: Chrome (19a174a1afc-b312)
[bridge-ext] Updated window info cache: Map(1) { 3 => { hwnd: ..., title: '...' } }
```

Desktop app (tracing, Windows):

```text
[bridge] AllowSetForegroundWindow(ASFW_ANY) succeeded
```

Sidecar stderr (wrap the binary to redirect stderr to a log file):

```text
[sidecar] focus_window_windows payload: FocusWindowPayload { hwnd: Some(394012), browser: None, title: None }
[sidecar] bring_window_to_front_attempt hwnd=HWND(...) attempt=1
[sidecar] foreground matches target 0x... after attempt 1/3
```

If focus is still blocked:

```text
[sidecar] SetForegroundWindow returned false, GetLastError=0x... (attempt 1)
[sidecar] foreground mismatch: have 0x... want 0x... (attempt 1/3)
```

## Historical timeline (earlier experiments)

| Change | Description | Result |
| --- | --- | --- |
| Baseline tab activation | Extension focuses the window (`chrome.windows.update`), delay, activate tab, focus again | Tab activates; window often stays behind |
| `AllowSetForegroundWindow` from sidecar only | Before Win32 focus calls | Often no effect (sidecar did not hold input token) |
| Topmost toggle / `BringWindowToTop` / `SetForegroundWindow` | Z-order and foreground | Still ignored when OS blocks cross-process foreground |
| HWND cache | Map `windowId` → HWND | Correct handle required; OS rules still apply |

## Residual hypotheses (if it still fails)

1. **Foreground rules**: Strict Windows policies, **Focus Assist**, **game mode**, or **security software** blocking activation.
2. **Elevation**: Mixed **Run as administrator** between app, browser, or sidecar breaks focus (run all at the same integrity level).
3. **Wrong HWND**: If logs show mismatch after retries, compare **`BRIDGE_FOCUS_DEBUG_CLASS=1`** output with expected **`Chrome_WidgetWin_1`** for the main frame.
4. **Simulated input** (`SendInput`): last resort; can annoy endpoint protection.

## Logging strategy

- **Never log to stdout** from the sidecar: Chrome expects length-prefixed JSON on stdout. Use **`eprintln!`** / stderr only.
- **Wrapper script**: redirect stderr to `%LOCALAPPDATA%\Bridge\bridge-sidecar.log`.
- **Extension**: Service Worker console, **Preserve log**, `[bridge-ext]` lines.
- **App**: Tauri / tracing for `bridge` target and WebSocket routing logs.

Document new findings here and in [`../../packages/sidecar/docs/native-host.md`](../../packages/sidecar/docs/native-host.md) if the Win32 sequence changes again.
