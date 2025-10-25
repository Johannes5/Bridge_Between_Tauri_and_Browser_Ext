# Bridge Workspace

Bridge Workspace is a three-part system—Tauri desktop app, Chromium extension, and Rust sidecar—that keeps browser state in sync with the desktop UI. Start here if you need to build, run, or troubleshoot the bridge on Windows.

## Packages at a Glance
| Package | Description | Filter name |
| --- | --- | --- |
| `packages/app-tauri` | Desktop shell (React + Tauri) that visualises browser tabs and issues commands | `mapmap-test-app` |
| `packages/ext-plasmo` | MV3 service worker that streams tab state and executes actions | `ext-plasmo` |
| `packages/shared-proto` | Shared TypeScript schemas (`zod`) for every envelope | `@bridge/shared-proto` |
| `packages/sidecar` | Rust native host that bridges Chrome native messaging to the desktop app | `@bridge/sidecar` |

Additional playbooks and debugging notes now live under [`docs/playbooks/`](docs/playbooks) (moved from the repo root).

## Core Commands (run from repo root)
```powershell
# Dependency install
pnpm setup

# Build shared schemas first
pnpm --filter @bridge/shared-proto build

# Build each runtime (directory filters also work, e.g. `--filter ./packages/app-tauri`)
pnpm --filter ext-plasmo build
pnpm --filter mapmap-test-app build        # same as `pnpm --filter ./packages/app-tauri build`
pnpm --filter mapmap-test-app tauri build  # Native shell (optional)
pnpm --filter @bridge/sidecar build        # Cargo release build

# Development servers
pnpm --filter ext-plasmo dev
pnpm --filter mapmap-test-app tauri dev -- --devtools
# or use the root shortcut script:
pnpm dev:app
```

## Routine Flows
| Scenario | Steps |
| --- | --- |
| Fresh dev environment | 1) `pnpm setup` 2) `pnpm --filter @bridge/shared-proto build` 3) Run the extension and Tauri dev servers in separate terminals |
| Update the sidecar binary | 1) **Close every browser using the extension** 2) `taskkill /IM bridge-sidecar.exe /F` until “process not found” 3) `pnpm --filter @bridge/sidecar build` 4) Copy `packages/sidecar/manifests/com.bridge.app.json` into each browser’s `NativeMessagingHosts` folder 5) Restart browsers and reload the extension |
| Quick rebuild loop without closing browsers | 1) Set `$env:CARGO_TARGET_DIR="packages/sidecar/target-temp"` 2) `cargo build --manifest-path packages/sidecar/Cargo.toml --release` 3) Copy the new `bridge-sidecar.exe` into `packages/sidecar/target/release` after Chrome disconnects 4) Reload the extension |
| Reset everything | 1) `pnpm --filter @bridge/shared-proto build` 2) `pnpm --filter ext-plasmo build` 3) `pnpm --filter mapmap-test-app build` 4) Rebuild the sidecar as above 5) Reload the extension and restart the Tauri app |

### Closing Browsers vs. Killing the Sidecar
- **Close browsers** whenever you plan to replace `bridge-sidecar.exe` directly; Chromium locks the executable while the native host is connected.
- To terminate a stuck host without closing Chrome completely, run:  
  ```powershell
  taskkill /IM bridge-sidecar.exe /F
  ```
  Repeat until the process is gone, then rebuild and restart the extension to let Chrome spawn a fresh host.

## Debugging Checklist
1. Rebuild artefacts in this order: shared proto → extension → sidecar → app (`pnpm --filter mapmap-test-app build`).
2. After rebuilding the sidecar, confirm both the Chrome and Comet manifests point at `packages/sidecar/target/release/bridge-sidecar.exe` (see `packages/sidecar/manifests/com.bridge.app.json`).
3. Reload the extension (`chrome://extensions` → enable Developer Mode → **Reload**) in every browser you test.
4. Open DevTools in the Tauri app and watch for `[tabs.openOrFocus]` logs to ensure the UI is routing to an active `connectionId`.
5. Inspect the extension service worker console for `[bridge-ext] Found matching tab` and `focus.window` logs before debugging the Win32 layer.
6. Capture sidecar stderr via a wrapper (redirect `bridge-sidecar.exe` stderr to a log file) whenever you need to analyse the focus routine (`focus_window_windows payload`, `bring_window_to_front hwnd=...`).

If the browser window still refuses to foreground, follow the experiments listed in [docs/troubleshooting/window-focus.md](docs/troubleshooting/window-focus.md) and share the captured logs before adjusting Win32 calls.

## Reference Docs
- Architecture overview: [docs/architecture.md](docs/architecture.md)
- Windows setup: [docs/dev-setup.md](docs/windows-dev-setup.md)
- Focus troubleshooting timeline: [docs/troubleshooting/window-focus.md](docs/troubleshooting/window-focus.md)
- Extension guide: [packages/ext-plasmo/docs/extension.md](packages/ext-plasmo/docs/extension.md)
- Sidecar internals: [packages/sidecar/docs/native-host.md](packages/sidecar/docs/native-host.md)
- Desktop app guide: [packages/app-tauri/README.md](packages/app-tauri/README.md)
- Playbooks & historical notes: [docs/playbooks/](docs/playbooks)
