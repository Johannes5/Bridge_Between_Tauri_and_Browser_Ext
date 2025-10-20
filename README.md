# Bridge Workspace

This repository hosts the shared development workspace for the desktop Action app, the browser Search extension, and the supporting tooling that links them via a native-messaging bridge.

## Layout
- `packages/app-tauri` – Tauri 2 desktop shell (Rust + React) that renders bridge data and issues commands.
- `packages/ext-plasmo` – Plasmo-based MV3 extension that surfaces browser state and executes bridge actions.
- `packages/shared-proto` – TypeScript schemas and helpers for the JSON envelopes shared across processes.
- `packages/sidecar` – Rust native-messaging host that brokers communication between the extension and app.
- `tools/` – Automation scripts, Playwright-based bridge tester, and MCP server adapters.

## Common Commands
Run everything with `pnpm` from the workspace root:
- `pnpm setup` – Install all package dependencies.
- `pnpm build:proto` – Type-check and emit the shared protocol package.
- `pnpm dev:app` / `pnpm dev:ext` – Launch the desktop app or extension in development mode.
- `pnpm test:bridge` – Execute the headless Playwright stress test of the bridge.

## Agent Notes
- Update protocol contracts only inside `packages/shared-proto`, then rebuild before touching dependants.
- Keep the debug WebSocket (`ws://127.0.0.1:17888`) behind `#[cfg(debug_assertions)]` to avoid shipping it.
- The native-messaging manifests should be templated in `packages/sidecar/manifests/` and installed during bundling.
