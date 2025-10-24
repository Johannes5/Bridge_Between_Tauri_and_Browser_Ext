# Windows Developer Setup

Follow this guide to prepare a Windows workstation, build every component, and keep the native messaging host in sync. For architecture context, start with [architecture.md](./architecture.md).

## Prerequisites

- **Rust (stable, MSVC)**  
  ```powershell
  winget install Rustlang.Rust.MSVC
  rustup default stable-x86_64-pc-windows-msvc
  rustup component add clippy rustfmt
  ```
- **Node.js 18+ and pnpm 9+**  
  ```powershell
  winget install OpenJS.NodeJS --silent
  npm install --global pnpm@9
  ```
- **Tauri CLI and build tools**  
  ```powershell
  pnpm add --global @tauri-apps/cli@^2.0.0-rc
  winget install Microsoft.VisualStudio.2022.BuildTools --override "--add Microsoft.VisualStudio.Workload.VCTools" --silent
  ```
- **Plasmo tooling** is installed per package via `pnpm install`.

## Install Dependencies

```powershell
cd "C:\Users\<USER>\Documents\Programming\bridge workspace"
pnpm install
pnpm --filter @bridge/shared-proto build
```

> Build the shared proto package first so TypeScript and Rust consumers see up-to-date schemas.

## Component Builds

| Component | Command | Notes |
| --- | --- | --- |
| Shared proto | `pnpm --filter @bridge/shared-proto build` | Generates distributable TS artifacts |
| Browser extension | `pnpm --filter ./packages/ext-plasmo build` | Emits MV3 bundle into `build/` |
| Desktop app UI | `pnpm --filter ./packages/app-tauri build` | Runs the Rspack production build |
| Native sidecar | `cargo build --manifest-path packages/sidecar/Cargo.toml --release` | Use a temp `CARGO_TARGET_DIR` to avoid file locks |
| Tauri shell bundle | `pnpm --filter ./packages/app-tauri tauri build` | Requires the Rust sidecar binary to be up to date |

### Windows-Friendly Sidecar Build

```powershell
$env:CARGO_TARGET_DIR = "packages/sidecar/target-temp"
cargo build --manifest-path packages/sidecar/Cargo.toml --release
Copy-Item packages/sidecar/target-temp/release/bridge-sidecar.exe `
          packages/sidecar/target/release/bridge-sidecar.exe -Force
Remove-Item packages/sidecar/target-temp -Recurse -Force
```

Chromium keeps the native host executable locked. Building into a temporary directory and copying the result avoids `Access is denied` rebuild failures.

## Run in Development

```powershell
pnpm --filter ./packages/ext-plasmo dev      # service worker + HMR
pnpm --filter ./packages/app-tauri tauri dev # desktop app shell
```

The extension service worker automatically retries `connectNative` if the sidecar restarts. In the Tauri console you should see `[app] Received WebSocket message: ... presence.status ...` once the bridge is healthy.

## Native Messaging Manifest Paths

| Environment | Path |
| --- | --- |
| Repository copy | `packages/sidecar/manifests/com.bridge.app.json` |
| Chrome profile | `C:\Users\<USER>\AppData\Local\Google\Chrome\User Data\NativeMessagingHosts\com.bridge.app.json` |
| Comet (Perplexity) profile | `C:\Users\<USER>\AppData\Local\Perplexity\Comet\User Data\NativeMessagingHosts\com.bridge.app.json` |

After rebuilding the sidecar, overwrite the profile copy so Chrome loads the latest binary path:

```powershell
Copy-Item packages/sidecar/manifests/com.bridge.app.json `
          "$env:LOCALAPPDATA\Google\Chrome\User Data\NativeMessagingHosts\com.bridge.app.json" `
          -Force
```

Repeat with the Comet location if you test there.

## Reload the Extension

1. Open `chrome://extensions` (or `perplexity://extensions` for Comet).
2. Enable **Developer mode**.
3. Click **Reload** for “Bridge Dev Extension”.
4. Use the **Service Worker** link to view `[bridge-ext]` console logs.

## When Binaries Are Locked

If Windows refuses to overwrite `bridge-sidecar.exe`:

```powershell
Stop-Process -Name chrome -ErrorAction SilentlyContinue
Stop-Process -Name bridge-sidecar -ErrorAction SilentlyContinue
# or rebuild into target-temp and copy as shown above
```

Avoid writing to stdout from the sidecar. Chrome expects length-prefixed JSON on stdout, so any `println!` breaks the channel. Use `eprintln!` or redirect stderr via a wrapper script (see [troubleshooting/window-focus.md](./troubleshooting/window-focus.md)).

## Next Steps

- Open related docs:
  - Extension: [`../packages/ext-plasmo/docs/extension.md`](../packages/ext-plasmo/docs/extension.md)
  - Sidecar: [`../packages/sidecar/docs/native-host.md`](../packages/sidecar/docs/native-host.md)
  - Desktop app: [`../packages/app-tauri/README.md`](../packages/app-tauri/README.md)
- Configure your editor to treat the repo root as the pnpm workspace for proper linting and type checking.
