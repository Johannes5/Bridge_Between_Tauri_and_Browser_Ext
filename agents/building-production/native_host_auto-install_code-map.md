# Native Host Code Map

## Purpose
This document extracts the most relevant current code and script anchors for implementing native-host self-installation from the app. It is meant to save a teammate or LLM from re-scanning the repo before coding.

Use this together with:
- [Main plan](native_host_auto-install_7f6f7fae.plan.md)
- [Platform recipes](native_host_auto-install_platform-recipes.md)
- [Implementation blueprint](native_host_auto-install_execution-blueprint.md)

## 1. Current Tauri startup entry point
File: `packages/app-tauri/src-tauri/src/lib.rs`

This is the main insertion point for the new native-host manager. The current `setup()` call is already async and launched during `.setup(...)`.

```rust
mod bridge_ws;
mod win_foreground;

use bridge_ws::BridgeHandle;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{Manager, State};
use tracing::{error, info};

#[derive(Clone)]
struct BridgeState(BridgeHandle);

async fn setup(app: tauri::AppHandle) -> Result<(), String> {
    info!("[bridge-app] async setup starting");

    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.show();
        info!("[bridge-app] main window restored");
    } else {
        info!("[bridge-app] main window missing during setup");
    }

    info!("[bridge-app] async setup complete");
    Ok(())
}

pub fn run() {
    let builder = tauri::Builder::default()
        // plugins omitted
        .setup(|app| {
            info!("[bridge-app] builder setup starting");

            let bridge_handle = bridge_ws::spawn(&app.handle());
            app.manage(BridgeState(bridge_handle.clone()));

            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(err) = setup(app_handle).await {
                    error!("[bridge-app] async setup failed: {err}");
                }
            });

            info!("[bridge-app] builder setup complete");
            Ok(())
        });
}
```

### Why it matters
- This is the cleanest place to run `ensure_native_host_installed()`.
- The app already has structured logging with `tracing`.
- The new work should happen before the bridge is assumed healthy, but should not hard-fail on partial per-browser issues.

## 2. Current extension native-host entry point
File: `packages/ext-plasmo/src/background.ts`

The extension is hard-coded to `connectNative("com.bridge.app")`, so production setup must preserve that host name.

```ts
const HOST_NAME = "com.bridge.app";

const connectNative = () => {
  if (state.nativePort) {
    return;
  }
  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = undefined;
  }
  try {
    state.nativePort = chrome.runtime.connectNative(HOST_NAME);
  } catch (error) {
    console.warn("[bridge-ext] connectNative failed:", error);
    scheduleReconnect();
    return;
  }

  state.nativePort.onMessage.addListener(onFromNative);
  state.nativePort.onDisconnect.addListener(() => {
    state.nativePort = null;
    state.isConnectionReady = false;
    state.windowInfoCache.clear();
    scheduleReconnect();
  });
};

chrome.runtime.onStartup.addListener(() => {
  connectNative();
});

chrome.runtime.onInstalled.addListener(() => {
  connectNative();
});

connectNative();
```

### Why it matters
- The app-side installer cannot change the host name without updating the extension.
- Startup repair can be forgiving because the extension already reconnects.
- If app launch repairs manifests or registry state, a browser restart or extension reconnect should make the bridge recover.

## 3. Current Windows installation reference
File: `packages/sidecar/manifests/install-windows.ps1`

This script is the exact behavior that must be recreated in Rust for production.

```powershell
$SidecarExePath = Join-Path $WorkspaceRoot "packages\sidecar\target\release\bridge-sidecar.exe"
$ManifestPath = Join-Path $ManifestDir "com.bridge.app.json"

$manifest = @{
    name = "com.bridge.app"
    description = "Bridge between extension and Tauri app"
    path = $SidecarExePath
    type = "stdio"
    allowed_origins = @(
        "chrome-extension://$ExtensionId/"
    )
} | ConvertTo-Json -Depth 10

$manifest | Out-File -FilePath $ManifestPath -Encoding utf8 -NoNewline

$registryPaths = @{
    chrome = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.bridge.app"
    edge = "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.bridge.app"
    brave = "HKCU:\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.bridge.app"
}
```

### What to preserve
- Host name `com.bridge.app`
- Manifest JSON shape
- `HKCU` registration, not machine-wide
- No admin requirement

### What to change in production
- Resolve the sidecar path from the installed app, not the repo build path.
- Support multiple known production extension IDs, not one manually provided value.
- Persist the manifest in a stable app-controlled location.

## 4. Current macOS installation reference
File: `packages/sidecar/manifests/install-mac.sh`

```bash
SIDECAR_PATH="$WORKSPACE_ROOT/packages/sidecar/target/release/bridge-sidecar"
MANIFEST_PATH="$SCRIPT_DIR/com.bridge.app.json"

cat > "$MANIFEST_PATH" <<EOF
{
  "name": "com.bridge.app",
  "description": "Bridge between extension and Tauri app",
  "path": "$SIDECAR_PATH",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$EXTENSION_ID/"
  ]
}
EOF

CHROME_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
EDGE_DIR="$HOME/Library/Application Support/Microsoft Edge/NativeMessagingHosts"
BRAVE_DIR="$HOME/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts"
CHROMIUM_DIR="$HOME/Library/Application Support/Chromium/NativeMessagingHosts"
```

### What to preserve
- File-based registration into user browser profile dirs
- Browser-specific target directories
- Exact manifest format

### What to change in production
- Use installed app sidecar path
- Generate from app code, not shell
- Add verification and idempotence

## 5. Current Linux installation reference
File: `packages/sidecar/install.sh`

```bash
if [ "$OS" == "Linux" ]; then
    TARGET_BINARY="target/release/bridge-sidecar-x86_64-unknown-linux-gnu"

    CHROME_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
    CHROMIUM_DIR="$HOME/.config/chromium/NativeMessagingHosts"
    EDGE_DIR="$HOME/.config/microsoft-edge/NativeMessagingHosts"
    BRAVE_DIR="$HOME/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts"
fi

MANIFEST_CONTENT=$(cat <<EOF
{
  "name": "com.bridge.app",
  "description": "Bridge between extension and Tauri app",
  "path": "$ABS_PATH_TO_BINARY",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$EXTENSION_ID/"
  ]
}
EOF
)
```

### Why it matters
- Linux is also file-based, like macOS.
- The current script assumes a build artifact path, which is not acceptable for production.
- AppImage-like transient paths are a design hazard and must be avoided in the real implementation.

## 6. Current production constraints that implementation must respect

### The host manifest must still contain:
```json
{
  "name": "com.bridge.app",
  "description": "Bridge between extension and Tauri app",
  "path": "/absolute/path/to/sidecar",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://stable-extension-id/"
  ]
}
```

### The app must become the source of truth for:
- stable sidecar path
- production extension ID map
- browser target list
- install/repair status

### The dev scripts should remain only as:
- development aids
- emergency repair tools
- reference implementations for platform-specific behavior

## 7. Concrete insertion points

### Tauri backend
Likely new files under `packages/app-tauri/src-tauri/src/`:
- `native_host/mod.rs`
- `native_host/config.rs`
- `native_host/paths.rs`
- `native_host/install.rs`
- `native_host/verify.rs`
- `native_host/platform_windows.rs`
- `native_host/platform_macos.rs`
- `native_host/platform_linux.rs`

### Existing file to modify first
- `packages/app-tauri/src-tauri/src/lib.rs`

### Likely docs to update at the end
- `README.md`
- `packages/app-tauri/README.md`
- `packages/sidecar/README.md`
- `packages/sidecar/manifests/README.md`
- `docs/windows-dev-setup.md`

## 8. Handoff guidance for the implementing teammate
- Start in the Tauri backend, not in the extension.
- Treat the current shell scripts as canonical behavior references.
- Do not let production logic depend on manual input such as `ExtensionId` flags.
- Do not optimize for unpacked/dev extension IDs in the release path.
- Keep the runtime idempotent: verify first, repair if needed, and log every decision.
