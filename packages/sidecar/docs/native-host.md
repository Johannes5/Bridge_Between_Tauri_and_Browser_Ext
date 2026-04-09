# Native Host (Rust Sidecar)

The sidecar in `packages/sidecar` connects the MV3 extension to the Tauri desktop app and owns the Windows-specific foreground logic. This page walks through the layout, runtime architecture, and open questions.

## Directory Overview

| Path | Responsibility |
| --- | --- |
| `src/main.rs` | Entry point, native messaging IO, WebSocket server, debug socket |
| `src/focus.rs` | Windows foreground handling for `focus.window` messages |
| `manifests/com.bridge.app.json` | Chrome/Comet native messaging manifest |
| `target/` | Build artifacts (use a temp target dir to avoid file locks) |

## Runtime Architecture

1. **Native messaging loop**  
   - Reads length-prefixed UTF-8 JSON from `stdin` (`read_native_message`).  
   - Writes replies such as `presence.status` via `write_native_message`.  
   - Any stdout noise breaks the bridge; diagnostic output must go to stderr.

2. **WebSocket bridge (`BridgeHandle`)**  
   - Listens on `ws://127.0.0.1:17342` for the desktop app.  
   - Registers each channel with metadata (`connectionId`, `browser`) from `presence.status`.  
   - Routes outbound messages by `connectionId`, falling back to broadcast if no target is provided.  
   - Exposes a secondary debug WebSocket on port `17888` that mirrors all traffic.

3. **Connection lifecycle**  
   - `generate_connection_id()` creates a unique ID per native host process.  
   - When Chrome restarts the host, IDs churn; the app therefore logs available connections and falls back when a specific ID is missing.  
   - Disconnects trigger a `presence.status` update with `sidecar: offline` so the app can prune stale snapshots.

## Focus Handling (`src/focus.rs`)

The sidecar calls `focus::focus_window(&FocusWindowPayload)` when it receives `type: "focus.window"` on **native messaging** (not forwarded to the WebSocket). The payload currently carries the **`hwnd`** chosen by the extension from the latest `windows.list` response.

- **HWND cache** lives in the **extension** (`windowId` → native window info), built when `windows.list` arrives. Title ↔ window matching uses scored heuristics so each browser window maps to at most one HWND.
- **`windows.list` enumeration**: PIDs include the browser process **and its descendants** (Toolhelp32). For Chromium-based executables, only top-level windows whose class name starts with `Chrome_WidgetWin_` are included.
- **Focus routine**: `GetAncestor(..., GA_ROOT)` → `AttachThreadInput` → restore → topmost toggle → `BringWindowToTop` → `SetForegroundWindow` (failure logs `GetLastError`) → `SwitchToThisWindow`. Up to **three** attempts with **200 ms** delay if `GetForegroundWindow` does not match the target.
- The **desktop app** calls `AllowSetForegroundWindow(ASFW_ANY)` when sending `tabs.openOrFocus` / `tabs.restore` so the user’s click grants a foreground token before the sidecar runs (see [../../../docs/troubleshooting/window-focus.md](../../../docs/troubleshooting/window-focus.md)).

Diagnostics: set **`BRIDGE_FOCUS_DEBUG_CLASS=1`** on the sidecar process to log the resolved root HWND and window class on stderr.

## Open Questions

1. Do we need a built-in file logger to avoid wrapper BAT scripts while keeping stdout clean?
2. Should we narrow `AllowSetForegroundWindow` to the sidecar PID instead of `ASFW_ANY` (requires the app to learn the sidecar PID)?
3. Would `ShowWindowAsync` or simulated input (`SendInput`) help on machines that still block focus after the current sequence?

## Related Docs

- Architecture overview: [../../../docs/architecture.md](../../../docs/architecture.md)
- Extension behaviour: [`../../ext-plasmo/docs/extension.md`](../../ext-plasmo/docs/extension.md)
- Focus debugging timeline: [../../../docs/troubleshooting/window-focus.md](../../../docs/troubleshooting/window-focus.md)
