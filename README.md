# Bridge Workspace

This workspace hosts the desktop bridge app (Tauri), the companion browser extension (Plasmo), a shared protocol package, and the Rust sidecar that implements the WebExtension Native Messaging host.

## Layout
- `packages/app-tauri` - Tauri 2 desktop shell (Rust backend + React UI) that visualises bridge traffic and issues commands.
- `packages/ext-plasmo` - MV3 extension built with Plasmo that streams active tab data and executes actions requested by the desktop app.
- `packages/shared-proto` - TypeScript + Zod schemas for every envelope and payload that crosses the bridge.
- `packages/sidecar` - Rust binary that speaks the Native Messaging protocol and forwards traffic to the app over a loopback WebSocket.
- `tools/` - Playwright bridge tester and MCP server adapters (`bridge-runner`, `rust-cargo`, `system-proc`).

## Quick Commands
Run these from the workspace root with `pnpm`:
- `pnpm setup` - Install dependencies for every Node workspace.
- `pnpm build:proto` - Emit `@bridge/shared-proto/dist` before building other packages.
- `pnpm dev:app` / `pnpm dev:ext` - Start the Tauri shell or the Plasmo extension in watch mode.
- `pnpm test:bridge` - Launch the automated Playwright subagent to exercise the bridge end-to-end.

## Bridge Flow (Sidecar Enabled)
```
Extension (tabs + commands)
      <-> Native Messaging (stdin/stdout)
Rust sidecar (packages/sidecar)
      <-> ws://127.0.0.1:17342
Tauri app (packages/app-tauri)
```
Optional debug mirror: `ws://127.0.0.1:17888` (enabled in debug builds or via `BRIDGE_DEBUG_WS=1` / `SIDE_CAR_DEBUG_WS=1`).

## Development Checklist
1. `pnpm setup && pnpm build:proto`
2. `cargo build --release` inside `packages/sidecar` (or `pnpm --filter @bridge/sidecar build`)
3. `pnpm dev:app` and `pnpm dev:ext` in separate terminals.
4. Install the extension unpacked and register the sidecar manifest for your browser (templates live in `packages/sidecar/manifests/`).
5. Verify with `pnpm test:bridge` or by using the UI under Bridge Dev Console.

## Native Host Manifests
Render the templates in `packages/sidecar/manifests/` when packaging:
- Chromium family: copy `chromium.json.tpl` to the per-browser NativeMessagingHosts folder and replace `{{SIDE_CAR_PATH}}` plus the extension IDs.
- Firefox: do the same with `firefox.json.tpl` and populate `allowed_extensions`.

## MCP Servers
`tools/mcp-runner.ts`, `tools/mcp-cargo.ts`, and `tools/mcp-proc.ts` expose:
- `bridge-runner` - file access, pnpm scripts, arbitrary shell commands, and build orchestration.
- `rust-cargo` - `cargo` invocations scoped to `packages/sidecar`.
- `system-proc` - health checks (`checkPort`) and lightweight process inspection (`psgrep`).
Configure them in `.cursor/mcp.json` as shown in the sample environment.

## Agent Guidance
- Update schemas only through `packages/shared-proto`, then rebuild dependants.
- Store all bridge-initiated messages behind the new `BridgeState` and `bridge_send` command (`packages/app-tauri/src-tauri/src/lib.rs`).
- Keep debug transport (`ws://127.0.0.1:17888`) enabled only for development builds or explicit env flags.
- Any change to the protocol or the bridge should include a matching update to the Playwright tester.
