# Module Map

A catalogue of every module in the codebase, using the architecture skill vocabulary:
**module** = anything with an interface and an implementation; **depth** = how much behaviour sits behind how small an interface.

---

## shared-proto

One module: the **Protocol Schema Package**.

- **Interface**: Zod schemas + TypeScript types for every message type (`Envelope`, `TabDescriptor`, `TabsListPayload`, `TabsDeltaPayload`, `TabsSavedPayload`, `PresenceStatusPayload`, etc.)
- **Implementation**: None — pure type definitions and validation
- **Depth**: Thin by design. This is a shared seam, not a deep module.

---

## Tauri App (app-tauri)

| Module | Interface | Implementation | Depth |
|--------|-----------|----------------|-------|
| **`useBridgeStore`** `store/index.ts` | Large: state fields + ~12 actions | Zustand lifecycle, localStorage persistence, Tauri event listener | Broad but honest — it is the state root |
| **`applyDelta`** `store/tab-delta.ts` | `(tabs, delta) => tabs` — 1 function | Remove → upsert → sort | Deep: big behaviour behind tiny interface |
| **`dispatch`** `store/registry.ts` | `(envelope, deps) => void` — 1 function | Schema lookup + parse + handler call | Deep: hides all routing and parsing |
| **5 handlers** `store/handlers/` | Each: typed deps slice, 1 function | 10–15 lines each | Shallow individually — depth lives at `dispatch` level |
| **`BridgeHandle`** `src-tauri/bridge_ws.rs` | `spawn(app) → BridgeHandle` | WebSocket listener, connection metadata, message relay, debug WS | Deep: lots of async I/O coordination behind a simple spawn call |

---

## Browser Extension (ext-plasmo)

| Module | Interface | Implementation | Depth |
|--------|-----------|----------------|-------|
| **`GlobalState`** `background/state.ts` | Singleton with 5 public fields | Browser detection, random ID generation | Shallow state bag |
| **`DeltaManager`** `background/delta-manager.ts` | `queueAdded/Updated/Removed()` — 3 methods | Debounce (200ms), deduplication, batch send | Deep: batching and merge logic hidden behind a queue interface |
| **`tabs`** `background/tabs.ts` | 4 functions: `sendCurrentWindowTabs`, `restoreTabs`, `openOrFocus`, `saveAndCloseActiveWindow` | Chrome API orchestration, window management, media pause | Medium depth — each function handles real branching |
| **`utils`** `background/utils.ts` | `serializeTab`, `serializeTabWithPreview`, format/parse helpers | Content script injection, video metadata extraction, og:image scraping, YouTube URL parsing, cache | Deepest module in the extension: ~550 lines behind a simple serialize call |
| **Background** `background.ts` | N/A — event loop root | `connectNative`, `onFromNative` router, tab event subscriptions, Levenshtein matching | High complexity, poor locality (monolithic handler) |
| **`windows`** `background/windows.ts` | 2 functions | Thin wrappers | Shallow pass-through |

---

## Sidecar (Rust)

| Module | Interface | Implementation | Depth |
|--------|-----------|----------------|-------|
| **`detect_browser()`** `main.rs` | `() → String` | Env var → parent process inspection → platform-specific exe matching | Medium — platform branches hidden behind one call |
| **Native I/O** `main.rs` | `read_native_message`, `write_native_message` | 4-byte length-prefixed JSON framing | Deep: binary protocol hidden behind simple read/write |
| **`bridge_to_app()`** `main.rs` | Internal task | WebSocket connection, stdin/stdout relay, exponential backoff, heartbeat | High complexity, not exposed as an interface |
| **`focus_window()`** `focus.rs` | `(payload) → Result<()>` | Windows: thread input attachment + HWND; macOS: osascript; Linux: wmctrl | Deep: platform complexity hidden behind one cross-platform call |
| **`list_browser_windows()`** `focus.rs` | `(pid) → Vec<WindowInfo>` (Windows only) | Win32 window enumeration, visibility filtering | Medium depth |

---

## Summary by depth

**Deep** — lots of behaviour, small interface:
`applyDelta`, `dispatch`, `DeltaManager`, `focus_window`, `serializeTabWithPreview`, native I/O framing, `BridgeHandle::spawn`

**Medium** — honest complexity:
`restoreTabs`, `openOrFocus`, `bridge_to_app`, `detect_browser`

**Shallow / pass-through** — deletion test would show little loss:
`GlobalState`, `windows.ts`, individual handlers (acceptable — depth lives at `dispatch` level)

**Broad interface, honest size**:
`useBridgeStore` — the interface is large but so is its job as the state root
