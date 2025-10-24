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

The sidecar calls `focus::focus_window(&FocusWindowPayload)` whenever it receives a `type: "focus.window"` envelope. The implementation:

- Parses optional hints (`window_id`, `title`, `url`, `browser`, `connection_id`).
- Uses a `Lazy<Mutex<HashMap<i32, isize>>>` cache to map Chrome `windowId` values to HWNDs. Invalid handles are discarded.
- Enumerates visible top-level windows (`EnumWindows`) and scores candidates by matching process names (chrome.exe, msedge.exe, brave.exe, comet.exe, etc.) and partial title/url matches.
- Runs the Win32 sequence:

  ```rust
  AllowSetForegroundWindow(ASFW_ANY);
  AllowSetForegroundWindow(pid);
  ShowWindow(hwnd, SW_RESTORE);
  SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE);
  SetWindowPos(hwnd, HWND_NOTOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE);
  BringWindowToTop(hwnd);
  SetForegroundWindow(hwnd);
  ```

The function logs start and end markers to stderr. Windows 10/11 still block the final foreground step (see [../../../docs/troubleshooting/window-focus.md](../../../docs/troubleshooting/window-focus.md) for the investigation).

## Open Questions

1. Should we attach to the browser thread with `AttachThreadInput` before calling `SetForegroundWindow`?
2. Are we always targeting the top-level `Chrome_WidgetWin_1` window, or do we sometimes hit a child HWND?
3. Would `SwitchToThisWindow`, `ShowWindowAsync`, or simulated input (`SendInput`) help bypass focus protection?
4. Can the extension cooperate by calling `AllowSetForegroundWindow` on its side before the sidecar runs the Win32 routine?
5. Do we need a built-in file logger to avoid wrapper BAT scripts while keeping stdout clean?

## Related Docs

- Architecture overview: [../../../docs/architecture.md](../../../docs/architecture.md)
- Extension behaviour: [`../../ext-plasmo/docs/extension.md`](../../ext-plasmo/docs/extension.md)
- Focus debugging timeline: [../../../docs/troubleshooting/window-focus.md](../../../docs/troubleshooting/window-focus.md)
