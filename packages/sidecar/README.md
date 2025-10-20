# Bridge Sidecar

This crate implements the native-messaging host that brokers traffic between the Plasmo extension and the Tauri desktop app.

## Environment Variables
- APP_WS: WebSocket endpoint exposed by the desktop app (default ws://127.0.0.1:17342).
- SIDE_CAR_DEBUG_WS: Set to 1 to force-enable the debug mirror in release builds.
- DEBUG_WS_PORT: Override the debug mirror port (default 17888).

## Building
`
cargo build --release
`
The compiled binary must be registered with the browser via the manifests in manifests/.
