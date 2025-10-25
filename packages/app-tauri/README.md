# Bridge Desktop App (Tauri)

The Tauri desktop app (`packages/app-tauri`) is the operator console for the bridge workspace. It renders live browser snapshots from the extension, lets you open or restore tabs, and surfaces bridge logs for debugging.

## UI Tour

- **Connected Browsers**: Each card represents a live `connectionId` (a native host plus extension pair). The header shows the inferred browser name and last update time.
- **Tab Grid**: Tab cards display title, URL, favicon, and window metadata. The **Open** button sends a `tabs.openOrFocus` message through the sidecar.
- **Saved Tab Collections**: Restore saved sets in `suspend` (lazy) or `eager` mode. Both paths reuse the same routing heuristics as single-tab opens.
- **Bridge Log**: A rolling list of envelopes with short summaries. Useful to verify bridge traffic while testing.

## Connection Routing and Fallbacks

When the app sends a tab action it includes a `connectionId`. The routing logic:

1. Sends to the requested `connectionId`.
2. If the ID is stale, looks for another connection with the same `browser` label.
3. Falls back to the first active connection when no better candidate exists.

Watch the Tauri devtools console for lines such as:

```text
[tabs.openOrFocus] Routing to connection: 19a174a1afc-b312
[tabs.openOrFocus] Available connections: ["19a174a1afc-b312","19a174a37f2-b47c"]
[tabs.openOrFocus] Target connection not found: 19a173ff93b-918d
```

If you continue to see "Target connection not found", confirm that the extension service worker has reconnected (see [`../ext-plasmo/docs/extension.md`](../ext-plasmo/docs/extension.md)).

## Development Workflow

```powershell
# Terminal 1 - extension service worker with hot reload
pnpm --filter ./packages/ext-plasmo dev

# Terminal 2 - desktop app with devtools
pnpm --filter ./packages/app-tauri tauri dev -- --devtools
```

Key notes:

- The sidecar hosts the WebSocket on `ws://127.0.0.1:17342`; ensure Chrome launches the native host before opening the app.
- The front-end stack is React + Rspack. Shared types are imported from `@bridge/shared-proto`.
- Before sending `tabs.openOrFocus`, the app minimizes itself via `getCurrentWindow().minimize()` to reduce flicker.

## Production Build

```powershell
pnpm --filter @bridge/shared-proto build
pnpm --filter ./packages/app-tauri build
pnpm --filter ./packages/app-tauri tauri build
```

Ensure `packages/sidecar/target/release/bridge-sidecar.exe` is fresh before packaging; the installer references the native host path from the manifest.

## Debugging and Diagnostics

- **Open DevTools**: While `tauri dev` runs, press `Ctrl+Shift+I` (Windows) or `Cmd+Option+I` (macOS), or launch with `--devtools` as shown above.
- **Bridge logs**: Look for `[bridge-app] ...` in the console. Routing, parse errors, and snapshot updates are logged there.
- **Presence widget**: The UI shows the latest `presence.status` states (`app`, `extension`, `sidecar`). If `sidecar` reads `offline`, reload the extension.
- **Manual refresh**: Use the **Refresh tabs** button or send `presence.query` / `tabs.list.request` envelopes from the console to retrigger snapshots.

## Related Documentation

- Architecture overview: [../../docs/architecture.md](../../docs/architecture.md)
- Developer setup: [../../docs/dev-setup.md](../../docs/windows-dev-setup.md)
- Native host internals: [`../sidecar/docs/native-host.md`](../sidecar/docs/native-host.md)
- Focus troubleshooting: [../../docs/troubleshooting/window-focus.md](../../docs/troubleshooting/window-focus.md)
