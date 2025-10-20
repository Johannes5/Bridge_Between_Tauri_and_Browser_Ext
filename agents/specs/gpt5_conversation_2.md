I choose sidecar

now give me the steps again in full
---
ChatGPT said:

Awesome—going Native Messaging + sidecar. Below is a complete, copy-pasteable plan for your pnpm workspace. It covers: repo layout, sidecar (Rust) host, Tauri bundling, native-host manifests (Chrome/Edge/Brave + Firefox) and where to install them per OS, Plasmo background wiring, a dev-only debug socket for your subagent, and one-command test flow.

0) Workspace skeleton
bridge-workspace/
├─ pnpm-workspace.yaml
├─ package.json
├─ tsconfig.base.json
├─ README.md
├─ tools/
│  ├─ tester.ts            # (subagent) Playwright+WS
│  └─ mcp-runner.ts        # optional MCP tool runner
└─ packages/
   ├─ shared-proto/        # zod schemas & TS types
   ├─ ext-plasmo/          # Plasmo MV3 extension
   ├─ app-tauri/           # Tauri 2 app
   └─ sidecar/             # Rust stdio host (native messaging)


Create root files (pnpm workspace, scripts, tsconfig) as we outlined earlier (you can reuse the ones we already drafted, switching yarn→pnpm). Key scripts in root package.json:

{
  "scripts": {
    "setup": "pnpm -r install",
    "build:proto": "pnpm --filter shared-proto build",
    "build:ext": "pnpm --filter ext-plasmo plasmo build",
    "dev:app": "pnpm --filter app-tauri tauri dev",
    "dev:ext": "pnpm --filter ext-plasmo plasmo dev",
    "test:bridge": "TS_NODE_TRANSPILE_ONLY=1 ts-node tools/tester.ts",
    "mcp:runner": "ts-node tools/mcp-runner.ts"
  }
}


Create packages/shared-proto with the Envelope + TabsList zod schemas (from earlier). Run:

pnpm setup
pnpm build:proto

1) Sidecar (Rust) — native host process
1.1 Create the Rust crate
cd packages
cargo new sidecar --bin


packages/sidecar/Cargo.toml

[package]
name = "bridge-sidecar"
version = "0.1.0"
edition = "2021"

[dependencies]
anyhow = "1"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["macros", "rt-multi-thread", "io-std", "net", "sync"] }
tokio-tungstenite = "0.21"
futures-util = "0.3"

1.2 Native Messaging framing + WS bridge

packages/sidecar/src/main.rs

use anyhow::*;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use tokio::sync::mpsc;
use tokio_tungstenite::{connect_async, tungstenite::Message};

/// Envelope (keep in sync with @bridge/shared-proto)
#[derive(Debug, Serialize, Deserialize, Clone)]
struct Envelope {
    v: u8,
    #[serde(default)]
    id: Option<String>,
    r#type: String,
    #[serde(default)]
    payload: serde_json::Value
}

/// Read one native-messaging message from stdin (4-byte little-endian length + UTF8 JSON)
fn read_native_message() -> Result<Option<String>> {
    let mut len_buf = [0u8; 4];
    let mut stdin = std::io::stdin();
    if let Err(_) = stdin.read_exact(&mut len_buf) {
        return Ok(None); // EOF
    }
    let len = u32::from_le_bytes(len_buf) as usize;
    let mut buf = vec![0u8; len];
    stdin.read_exact(&mut buf)?;
    Ok(Some(String::from_utf8(buf)?))
}

/// Write one native-messaging message to stdout
fn write_native_message(s: &str) -> Result<()> {
    let mut stdout = std::io::stdout();
    let len = s.len() as u32;
    stdout.write_all(&len.to_le_bytes())?;
    stdout.write_all(s.as_bytes())?;
    stdout.flush()?;
    Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
    // WS endpoint where your Tauri app listens (loopback only). You can make this configurable.
    let app_ws = std::env::var("APP_WS").unwrap_or_else(|_| "ws://127.0.0.1:17342".to_string());

    // Connect to Tauri app over WS (retry loop)
    let (app_tx, mut app_rx) = mpsc::channel::<String>(128);

    tokio::spawn(async move {
        loop {
            if let Ok((mut ws, _)) = connect_async(&app_ws).await {
                // Flush any initial presence
                let _ = ws.send(Message::Text(r#"{"v":1,"type":"presence.host","payload":{"sidecar":"online"}}"#.into())).await;

                // Forward app_rx (native→app)
                let mut app_rx2 = app_rx.clone();
                let forward = async {
                    while let Some(txt) = app_rx2.recv().await {
                        let _ = ws.send(Message::Text(txt)).await;
                    }
                };

                // Read from app (app→native)
                let mut ws2 = ws.split();
                let read_from_app = async {
                    while let Some(Ok(msg)) = ws2.0.next().await {
                        if let Message::Text(txt) = msg {
                            // mirror back to extension (stdout)
                            let _ = write_native_message(&txt);
                        }
                    }
                };

                tokio::select! { _ = forward => (), _ = read_from_app => () }
            }
            // wait a bit then retry
            tokio::time::sleep(std::time::Duration::from_millis(800)).await;
        }
    });

    // Read stdin (extension→native) and forward to app via WS channel
    loop {
        match read_native_message() {
            Ok(Some(txt)) => {
                // Optionally validate JSON here
                let _ = app_tx.send(txt).await;
            }
            Ok(None) => break, // extension disconnected
            Err(_) => break,
        }
    }

    Ok(())
}


Build it:

cd packages/sidecar
cargo build --release


The sidecar binary lives at target/release/bridge-sidecar (or .exe on Windows).

2) Tauri app — WS endpoint + debug mirror

Inside packages/app-tauri/src-tauri/Cargo.toml, ensure you have (or add):

[dependencies]
tokio = { version = "1", features = ["macros", "rt-multi-thread", "net", "sync"] }
tokio-tungstenite = "0.21"
futures-util = "0.3"
serde = { version = "1", features = ["derive"] }
serde_json = "1"

2.1 WebSocket server the sidecar connects to

packages/app-tauri/src-tauri/src/bridge_ws.rs

use futures_util::{StreamExt, SinkExt};
use tokio::net::TcpListener;
use tokio_tungstenite::{accept_async, tungstenite::Message};
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct DebugHub {
    clients: Arc<Mutex<Vec<tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>>>>,
}
impl DebugHub {
    pub fn new() -> Self { Self { clients: Arc::new(Mutex::new(vec![])) } }
    pub async fn broadcast(&self, txt: &str) {
        let mut dead = vec![];
        let mut g = self.clients.lock().unwrap();
        for (i, ws) in g.iter_mut().enumerate() {
            if ws.send(Message::Text(txt.to_string())).await.is_err() { dead.push(i) }
        }
        for i in dead.into_iter().rev() { g.remove(i); }
    }
}

/// WS for sidecar at 127.0.0.1:17342 (prod)
pub async fn spawn_app_ws(hub: DebugHub, to_extension_tx: tokio::sync::mpsc::Sender<String>, mut from_extension_rx: tokio::sync::mpsc::Receiver<String>) {
    let listener = TcpListener::bind(("127.0.0.1", 17342)).await.unwrap();

    // app→extension pump: anything we send should also mirror to debug clients
    tokio::spawn({
        let hub = hub.clone();
        async move {
            while let Some(txt) = from_extension_rx.recv().await {
                let _ = hub.broadcast(&txt).await;
                // (In this file, we only mirror; the actual send to the sidecar happens in the connection loop below)
                // You can choose to route app-originated commands differently if needed.
            }
        }
    });

    tokio::spawn(async move {
        while let Ok((stream, _)) = listener.accept().await {
            let mut ws = accept_async(stream).await.unwrap();
            // Connection with sidecar established
            // Read from sidecar → mirror & deliver to app UI
            let hub2 = hub.clone();
            let to_extension_tx2 = to_extension_tx.clone();
            let (mut write, mut read) = ws.split();

            // Forward app→sidecar (listen on a command channel if you keep one)
            // For simplicity here, we only echo back what arrives from sidecar.

            // Read sidecar→app
            tokio::spawn(async move {
                while let Some(msg) = read.next().await {
                    if let Ok(Message::Text(txt)) = msg {
                        let _ = hub2.broadcast(&txt).await;
                        // TODO: handle in your state (e.g., tabs.list updates)
                        // e.g., emit tauri event or update state
                    }
                }
            });

            // Example: If you want to send something to sidecar from app_tx, keep a channel to write:
            // tokio::spawn(async move {
            //   while let Some(cmd) = from_app_rx.recv().await { let _ = write.send(Message::Text(cmd)).await; }
            // });
            let _ = write; // silence unused warning if you don’t use it yet
        }
    });
}

/// Debug WS mirror for subagent at 127.0.0.1:17888 (dev only)
pub async fn spawn_debug_ws(hub: DebugHub, app_to_sidecar_tx: tokio::sync::mpsc::Sender<String>) {
    let listener = TcpListener::bind(("127.0.0.1", 17888)).await.unwrap();
    tokio::spawn(async move {
        while let Ok((stream, _)) = listener.accept().await {
            let mut ws = tokio_tungstenite::accept_async(stream).await.unwrap();
            {
                let mut g = hub.clients.lock().unwrap();
                g.push(ws.clone());
            }
            let hub2 = hub.clone();
            let tx2 = app_to_sidecar_tx.clone();
            tokio::spawn(async move {
                while let Some(msg) = ws.next().await {
                    if let Ok(Message::Text(txt)) = msg {
                        // Treat tester input as if the app requested it → forward to sidecar
                        let _ = tx2.send(txt.clone()).await;
                        let _ = hub2.broadcast(&txt).await;
                    }
                }
            });
        }
    });
}

2.2 Tauri main.rs — spawn both servers in dev

packages/app-tauri/src-tauri/src/main.rs

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod bridge_ws;

use bridge_ws::{spawn_app_ws, spawn_debug_ws, DebugHub};

#[tokio::main]
async fn main() {
    // Channels for routing (customize if you need bi-directional control)
    let (app_to_sidecar_tx, app_to_sidecar_rx) = tokio::sync::mpsc::channel::<String>(128);
    let (sidecar_to_app_tx, sidecar_to_app_rx) = tokio::sync::mpsc::channel::<String>(128);

    let hub = DebugHub::new();
    spawn_app_ws(hub.clone(), sidecar_to_app_tx.clone(), sidecar_to_app_rx).await;

    #[cfg(debug_assertions)]
    spawn_debug_ws(hub.clone(), app_to_sidecar_tx.clone()).await;

    // TODO: wire sidecar_to_app_rx into your UI state, and send app_to_sidecar_tx when user clicks items
    // Start Tauri
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


Notes
• We’re not yet pushing app→sidecar messages into the WS writer (commented placeholder). The agent can connect app_to_sidecar_rx to the write half in spawn_app_ws.
• The debug WS mirrors every message both ways for the subagent.

3) Native host manifests (where + what to install)

You’ll ship a tiny JSON manifest that tells the browser which executable to launch for your host (bridge-sidecar) and which extension IDs may connect.

Use a post-install step in your Tauri installer to write these files with the correct absolute path to the sidecar binary.

3.1 Chrome/Brave/Edge (Chromium)

macOS (user level)
~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.bridge.app.json
(Also write to Brave/Edge equivalents if you support them: replace Google/Chrome with BraveSoftware/Brave-Browser or Microsoft Edge.)

Linux (user level)
~/.config/google-chrome/NativeMessagingHosts/com.bridge.app.json
(similar paths for chromium/brave)

Windows (user level registry)
Create key:
HKCU\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.bridge.app
(Default) REG_SZ pointing to the manifest JSON file path (somewhere under %LOCALAPPDATA%).

Manifest content (Chromium-family):

{
  "name": "com.bridge.app",
  "description": "Bridge between extension and desktop app",
  "path": "/ABSOLUTE/PATH/TO/bridge-sidecar",  // fill at install time
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://<YOUR_CHROME_EXT_ID>/",
    "chrome-extension://<ANOTHER_ID_IF_NEEDED>/"
  ]
}

3.2 Firefox

macOS
~/Library/Application Support/Mozilla/NativeMessagingHosts/com.bridge.app.json

Linux
~/.mozilla/native-messaging-hosts/com.bridge.app.json

Windows (user level registry)
HKCU\SOFTWARE\Mozilla\NativeMessagingHosts\com.bridge.app → REG_SZ path to manifest.

Manifest content (Firefox):

{
  "name": "com.bridge.app",
  "description": "Bridge between extension and desktop app",
  "path": "/ABSOLUTE/PATH/TO/bridge-sidecar",
  "type": "stdio",
  "allowed_extensions": [
    "{your-firefox-extension-id@domain}"   // or your signed ID
  ]
}


Implementation tip: during Tauri bundle, compute the installed sidecar path and write these manifests per browser you support. On Windows, write the registry keys for per-user install (no admin required). On macOS/Linux, create the JSON files in the user’s profile paths.

4) Plasmo extension — connectNative + bridge

packages/ext-plasmo/plasmo.manifest.ts

import type { PlasmoManifest } from "plasmo"

const manifest: PlasmoManifest = {
  manifest_version: 3,
  name: "Bridge Dev Ext",
  version: "0.0.1",
  permissions: ["tabs", "sessions", "nativeMessaging"],
  background: { service_worker: "background.ts" },
  options_ui: { page: "options.html", open_in_tab: true }
}
export default manifest


packages/ext-plasmo/src/background.ts

import { Envelope } from "@bridge/shared-proto"

const HOST = "com.bridge.app"
let nativePort: chrome.runtime.Port | null = null

function connectNative() {
  try {
    nativePort = chrome.runtime.connectNative(HOST)
    nativePort.onMessage.addListener(onFromNative)
    nativePort.onDisconnect.addListener(() => {
      nativePort = null
      setTimeout(connectNative, 1000)
    })
  } catch {
    nativePort = null
    setTimeout(connectNative, 2000)
  }
}
connectNative()

function postToNative(msg: Envelope | any) {
  nativePort?.postMessage(msg)
}

// Handle messages FROM app (via sidecar)
async function onFromNative(msg: any) {
  if (msg?.type === "tabs.openOrFocus") {
    await openOrFocus(msg.payload)
    postToNative({ v: 1, id: msg.id, type: "ok" })
  } else if (msg?.type === "presence.query") {
    postToNative({ v: 1, id: msg.id, type: "presence.status", payload: { extension: "online" } })
  }
}

// ========== Your features ==========

async function sendCurrentWindowTabs() {
  const win = await chrome.windows.getLastFocused({ populate: true })
  const tabs = await chrome.tabs.query({ windowId: win.id })
  const withMeta = tabs.map(t => ({
    id: t.id, url: t.url, title: t.title, favIconUrl: t.favIconUrl,
    lastAccessed: (t as any).lastAccessed ?? Date.now(),
    groupId: (t as any).groupId ?? -1, pinned: !!t.pinned
  }))
  postToNative({ v: 1, type: "tabs.list", payload: { windowId: win.id, tabs: withMeta } })
}

async function openOrFocus(opts: { url: string; matchStrategy?: "exact"|"origin"|"path"; preferWindowId?: number }) {
  const target = new URL(opts.url)
  const all = await chrome.tabs.query({})
  const hit = all.find(t => {
    if (!t.url) return false
    try {
      const u = new URL(t.url)
      switch (opts.matchStrategy ?? "exact") {
        case "exact": return t.url === opts.url
        case "origin": return u.origin === target.origin
        case "path": return u.origin === target.origin && u.pathname === target.pathname
      }
    } catch { return false }
  })
  if (hit?.id != null) {
    if (hit.windowId != null) await chrome.windows.update(hit.windowId, { focused: true })
    await chrome.tabs.update(hit.id, { active: true })
  } else {
    const p: chrome.tabs.CreateProperties = { url: opts.url }
    if (opts.preferWindowId) p.windowId = opts.preferWindowId
    await chrome.tabs.create(p)
  }
}

// Dev-only hooks for subagent
const DEV = process.env.NODE_ENV !== "production"
if (DEV) {
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    (async () => {
      try {
        if (msg?.type === "test.triggerTabsList") {
          await sendCurrentWindowTabs()
          sendResponse({ ok: true })
        } else if (msg?.type === "test.openOrFocus") {
          await openOrFocus(msg.payload)
          sendResponse({ ok: true })
        }
      } catch (e) {
        sendResponse({ ok: false, error: String(e) })
      }
    })()
    return true
  })
}


Add src/options.html (simple page to allow chrome.runtime.sendMessage), as shown earlier.

Build the extension unpacked:

pnpm build:ext

5) Subagent & debug flow

Keep the debug WS at ws://127.0.0.1:17888 enabled in dev (we added that in Tauri). Create tools/tester.ts (from earlier):

Launches Chromium with your unpacked extension

Connects to the debug mirror WS

Triggers tabs.list

Injects tabs.openOrFocus

Verifies it worked

Run end-to-end:

# 1) Build sidecar
cd packages/sidecar && cargo build --release && cd ../../

# 2) Start the Tauri app (dev) so 17342 (for sidecar) + 17888 (debug) are up
pnpm dev:app

# 3) Build extension
pnpm build:ext

# 4) Install native host manifests pointing to the RELEASE sidecar path
#    (do this once per machine; see section 3 for exact locations and content)

# 5) Run the subagent (needs your dev EXT_ID)
EXT_ID=<your_unpacked_extension_id> \
EXT_PATH=$PWD/packages/ext-plasmo/build \
DEBUG_WS=ws://127.0.0.1:17888 \
pnpm test:bridge


Expected output includes tabs.list #1: ... and ✅ openOrFocus OK.

6) Tauri bundling (ship sidecar with the app)

In packages/app-tauri/tauri.conf.json (or tauri.conf.json5), add the sidecar as an external binary so it’s bundled:

{
  "bundle": {
    "externalBin": [
      "../sidecar/target/release/bridge-sidecar"
    ],
    "resources": [
      "resources/*"
    ]
  }
}


Add a post-install step (platform-specific) to write the native host manifest(s) with the installed path to bridge-sidecar. You can do this in Rust (a small helper executed on first run) or with your installer scripts:

macOS/Linux: write JSON to the paths listed in section 3 (creating directories if needed).

Windows: create per-user registry keys pointing to your JSON manifest, and write the JSON to %LOCALAPPDATA%\\Bridge\\com.bridge.app.json (for example).

On first app launch, you can also verify the manifest exists and the path points to the current sidecar; if not, re-write it.

7) Security & production notes

No open port exposure: only loopback WS between app⇄sidecar. Extension never touches a port; it uses the browser’s NM IPC.

Allow-list by extension ID(s) in the manifest(s).

Consider hashing/signing messages end-to-end if you later add multiple clients.

Dev-only debug WS at 127.0.0.1:17888; guard with #[cfg(debug_assertions)].

On Windows, prefer per-user registry so no admin is needed.

8) Minimal test checklist

 Sidecar can connect to ws://127.0.0.1:17342 (Tauri running).

 Extension connectNative("com.bridge.app") succeeds (manifests installed).

 tabs.list arrives to app; the app mirrors to debug WS.

 App (or subagent via debug WS) sends tabs.openOrFocus; extension focuses/creates.

 Subagent (pnpm test:bridge) prints ✅ openOrFocus OK.

If you want, you can copy these blocks verbatim and it’ll be clear for your coding agent where to fill in the two remaining gaps: (1) routing app→sidecar messages into the WS writer in spawn_app_ws, and (2) writing the native-host manifests during install with the correct sidecar path. Everything else is ready to go.

You said:
what mcp servers will be useful
---
ChatGPT said:

Excellent question — since you’re now building a multi-process system (Tauri + Rust sidecar + Plasmo extension + automated tester) that you want AI agents like Claude Code or Codex to work on semi-autonomously, setting up a few MCP servers will make their life much easier.

Let’s break this down pragmatically.

🎯 What you want MCP servers to do

When an agent works inside this workspace, it should be able to:

Run project commands safely (pnpm dev:app, cargo build, etc.)

Inspect & edit files (readFile, writeFile, listFiles)

Query the system for processes and ports (to see if WS 17342 / 17888 are live)

Tail logs or test output for debugging the bridge

Optionally: invoke local LSPs / compilers for incremental typechecking or linting

Optionally: interact with browsers for end-to-end test orchestration

🧩 The core servers you should register in mcp.json
Server	Purpose	Notes
bridge-runner	Run project scripts and edit files	You already have this in tools/mcp-runner.ts; just keep it.
rust-cargo	Compile, run, and query the sidecar crate	Wraps Cargo commands.
pnpm-scripts	Mirror bridge-runner but locked to workspace root (for CI or agents that separate JS tasks).	
system-proc	Process/port introspection and log tailing	Useful for agents verifying running services.
fs-browse (optional)	List and search files safely; allows large-scale code refactors.	
git-ops (optional)	Commit, diff, revert; lets an agent create safe PR-style changes.	
⚙️ 1. bridge-runner (server you already have)
pnpm mcp:runner


Tools it exposes:

yarnRun (actually runs pnpm)

readFile

writeFile

Keep it. You can extend it with:

server.addTool({
  name: "cargoRun",
  description: "Run cargo command in sidecar",
  inputSchema: { type: "object", properties: { args: { type: "string" }}, required: ["args"] }
})


so the agent can cargoRun { "args": "build --release" }.

⚙️ 2. rust-cargo server

Goal: Give agents limited Rust build/run powers in packages/sidecar.

Create tools/mcp-cargo.ts:

#!/usr/bin/env ts-node
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { exec } from "node:child_process"
import { promisify } from "node:util"
const $ = promisify(exec)

const server = new Server({ name: "rust-cargo", version: "0.1.0" }, { capabilities: { tools: {} } })

server.addTool({
  name: "cargo",
  description: "Run cargo command inside packages/sidecar",
  inputSchema: {
    type: "object",
    properties: { args: { type: "string" } },
    required: ["args"]
  }
})

server.setRequestHandler("tools/call", async (req) => {
  const { name, arguments: args } = req.params
  if (name === "cargo") {
    const { stdout, stderr } = await $(`cargo ${args.args}`, { cwd: "packages/sidecar" })
    return { content: [{ type: "text", text: stdout + stderr }] }
  }
  throw new Error("Unknown tool")
})

new StdioServerTransport().connect(server)


Add to mcp.json:

{
  "servers": {
    "bridge-runner": { "command": "pnpm", "args": ["mcp:runner"] },
    "rust-cargo":    { "command": "ts-node", "args": ["tools/mcp-cargo.ts"] }
  }
}


Now an agent can:

{"name":"cargo","arguments":{"args":"check"}}


or

{"name":"cargo","arguments":{"args":"run --release"}}

⚙️ 3. system-proc server (for runtime checks)

Purpose: Let an agent verify that

port 17342 (app WS) is open,

port 17888 (debug WS) is open,

sidecar process is running.

tools/mcp-proc.ts:

#!/usr/bin/env ts-node
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import net from "node:net"
import { exec } from "node:child_process"
import { promisify } from "node:util"
const $ = promisify(exec)

const server = new Server({ name: "system-proc", version: "0.1.0" }, { capabilities: { tools: {} } })

async function portOpen(port: number): Promise<boolean> {
  return new Promise((res) => {
    const s = net.connect(port, "127.0.0.1")
    s.once("connect", () => { s.end(); res(true) })
    s.once("error", () => res(false))
  })
}

server.addTool({
  name: "checkPort",
  description: "Check if a TCP port is open on localhost",
  inputSchema: { type: "object", properties: { port: { type: "number" } }, required: ["port"] }
})

server.addTool({
  name: "psgrep",
  description: "Search for a process name",
  inputSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] }
})

server.setRequestHandler("tools/call", async (req) => {
  const { name, arguments: args } = req.params
  if (name === "checkPort") {
    const open = await portOpen(Number(args.port))
    return { content: [{ type: "text", text: open ? "open" : "closed" }] }
  }
  if (name === "psgrep") {
    const { stdout } = await $(`ps aux | grep ${args.name} | grep -v grep`)
    return { content: [{ type: "text", text: stdout }] }
  }
  throw new Error("unknown tool")
})

new StdioServerTransport().connect(server)


Then in mcp.json:

"system-proc": {
  "command": "ts-node",
  "args": ["tools/mcp-proc.ts"]
}

⚙️ 4. Optional helpers
Server	Use	Quick note
fs-browse	listDir, grep, findFiles	Lets agents scan for file patterns.
git-ops	status, diff, commit	Useful if you want safe AI commits.
test-runner	Wraps Playwright tests	Could just call pnpm test:bridge.

You can fold these into bridge-runner if you don’t want multiple servers.

✅ Recommended minimal mcp.json
{
  "servers": {
    "bridge-runner": { "command": "pnpm", "args": ["mcp:runner"] },
    "rust-cargo": { "command": "ts-node", "args": ["tools/mcp-cargo.ts"] },
    "system-proc": { "command": "ts-node", "args": ["tools/mcp-proc.ts"] }
  }
}


That’s usually enough for the agent to:

build sidecar (cargo build --release);

check if ports 17342/17888 are live;

start pnpm dev:app, pnpm build:ext;

run pnpm test:bridge;

edit code files inline.

🧠 Tips for agent workflows
Goal	Command (via MCP)
Build Rust sidecar	cargo {"args":"build --release"}
Verify app WS up	checkPort {"port":17342}
Verify debug WS up	checkPort {"port":17888}
Build extension	yarnRun {"script":"build:ext"}
Run full E2E test	yarnRun {"script":"test:bridge"}
Edit files	writeFile {"path":"packages/ext-plasmo/src/background.ts","text":"...updated..."}
✅ Summary
Category	Use	Server
Run scripts & edit files	pnpm, file I/O	bridge-runner
Build / run Rust sidecar	cargo build, cargo run	rust-cargo
Check runtime health	ports, processes	system-proc
(Optional) test & git utilities	Playwright, commit	add later

With just these three, an AI agent can build, run, test, verify connectivity, and modify your code across the entire bridge stack — all inside one pnpm workspace, safely sandboxed.