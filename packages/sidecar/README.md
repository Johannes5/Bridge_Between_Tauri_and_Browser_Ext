# Bridge Sidecar

This crate implements the native-messaging host that brokers traffic between the Plasmo extension and the Tauri desktop app.

## Quick Setup

### 1. Build the Sidecar

```bash
cargo build --release
```

### 2. Install Native Messaging Host (Windows)

Get your extension ID from your browser's extensions page (enable Developer mode to see it), then run:

```powershell
cd manifests
.\install-windows.ps1 -ExtensionId "your-extension-id-here" -Browser all
```

### 3. Restart & Test

1. Restart your browser
2. Reload the extension
3. Check the extension's background service worker console for connection logs

**Important:** On Windows, the native messaging host **must be registered in the Windows Registry**. Simply copying files to the NativeMessagingHosts folder is not enough!

See [manifests/README.md](./manifests/README.md) for detailed documentation and troubleshooting.

## Environment Variables

- `APP_WS`: WebSocket endpoint exposed by the desktop app (default: `ws://127.0.0.1:17342`)
- `SIDE_CAR_DEBUG_WS`: Set to `1` to force-enable the debug mirror in release builds
- `DEBUG_WS_PORT`: Override the debug mirror port (default: `17888`)

## Architecture

The sidecar acts as a bridge:

```
Browser Extension <--[Native Messaging]--> Sidecar <--[WebSocket]--> Tauri App
```

- **Native Messaging**: Stdio-based communication between browser and sidecar
- **WebSocket**: Network communication between sidecar and Tauri app
