I have a tauri 2.0 app and a plasmo based browser extension

they need to communicate with each other
they both have access to the same server(s)

but I need more direct communication

example: 

browser ext sends the tabs in the currently open window to the desktop app
after checking that the user has it open

app lists them as items with title, favicon (and title image)
grouped by date

then conversely:

app listens to a click of each of those items
on click (or before) it checks if the browser ext is open (not sure if it has to exclusively deal with the default browser or if it doesnt matter, as long as at least one browser with the ext is running)

browser ext then opens the link or focuses an existing tab in one of its windows assuming its already open
----
ChatGPT said:
Nachgedacht für 54s

Awesome problem. You’ve got three solid ways to do “direct” desktop↔️extension comms; here’s the quick decision and then the exact wiring you can drop in.

TL;DR recommendation

Use WebExtension Native Messaging as the backbone (secure, cross-browser standard), with a tiny Rust sidecar packaged by your Tauri 2 app as the native host. The sidecar talks to your already-running Tauri app over a loopback WebSocket (or named pipe), acting as a bridge.

Why this wins:

Works on Chrome/Edge/Brave/Firefox (Plasmo friendly).

No random localhost ports in the extension; no CORS drama.

Security model is built-in (host allow-lists your extension ID).

Presence is trivial: connectNative succeeds ⇒ host found; sidecar can ping your app.

If you want fewer moving parts and can live with a fixed local port, you can skip native messaging and let the extension connect directly to a localhost WebSocket opened by the Tauri app. But for cross-browser + security, native messaging is the cleanest.

Architecture (recommended)
[Plasmo MV3 extension]
    ↕  chrome.runtime.connectNative("com.your.app")
[Native host sidecar (Rust, stdin/stdout JSON)]
    ↕  ws://127.0.0.1:17342  (or named pipe/UDS)
[Tauri 2 app]


Extension → App (send tabs): ext gathers tab data and posts JSON to native host; host forwards over WS/pipe to Tauri; app renders “tabs by date”.

App → Extension (open/focus): app sends command over WS to sidecar; sidecar writes JSON to stdout; extension receives and uses chrome.tabs.* to focus or create.

Presence:

Is desktop app open? Sidecar tries to connect to Tauri’s WS at startup and maintains it; if down, it buffers or replies “app_offline”.

Is extension present? App can ask sidecar “who is connected?”; if the sidecar has an active native port to the extension, you’re good. From the extension, connectNative failure means host not installed / not allowed.

Message schema (both directions)

Use a tiny, versioned, JSON-RPC-ish envelope:

{
  "v": 1,
  "type": "tabs.list",           // or "tabs.openOrFocus", "ping", etc.
  "id": "uuid-optional",
  "payload": { /* … */ }
}

Payloads

tabs.list (ext → app)

{
  "windowId": 123,   // optional; if missing, use current window
  "tabs": [
    {
      "id": 911,
      "url": "https://example.com/page",
      "title": "Example – Page",
      "favIconUrl": "https://example.com/favicon.ico",
      "lastAccessed": 1729440000000,  // ms epoch if available
      "groupId": -1,                  // Chrome only
      "pinned": false
    }
  ]
}


tabs.openOrFocus (app → ext)

{
  "url": "https://example.com/page",
  "preferWindowId": 123,      // optional
  "matchStrategy": "exact|origin|path" // optional
}


presence.query / presence.status for pings.

Plasmo (MV3) background: native host bridge + tab ops

background.ts (service worker)

// plasmo manifest needs "nativeMessaging", "tabs", "sessions" (for lastAccessed on Chrome), "favicon" is implicit via tabs

const HOST = "com.your.app"

let nativePort: chrome.runtime.Port | null = null

function connectNative() {
  nativePort = chrome.runtime.connectNative(HOST)
  nativePort.onMessage.addListener(handleFromNative)
  nativePort.onDisconnect.addListener(() => {
    nativePort = null
    // optional: retry with backoff
    setTimeout(connectNative, 2000)
  })
}

connectNative()

function postToNative(msg: any) {
  if (!nativePort) return
  nativePort.postMessage(msg)
}

// === Handle messages FROM native host (=> FROM Tauri app) ===
async function handleFromNative(msg: any) {
  try {
    switch (msg?.type) {
      case "tabs.openOrFocus":
        await openOrFocus(msg.payload)
        replyOk(msg)
        break
      case "presence.query":
        reply(msg, { type: "presence.status", payload: { extension: "online" } })
        break
      default:
        // ignore or nack
        replyErr(msg, "unknown_type")
    }
  } catch (e) {
    replyErr(msg, String(e))
  }
}

function replyOk(req: any) {
  reply(req, { type: "ok" })
}

function reply(req: any, res: any) {
  postToNative({ v: 1, id: req?.id, ...res })
}

function replyErr(req: any, error: string) {
  postToNative({ v: 1, id: req?.id, type: "error", payload: { error } })
}

// === OUTBOUND: send current window tabs to app ===
async function sendCurrentWindowTabs() {
  const [currentWindow] = await chrome.windows.getAll({ populate: true, windowTypes: ["normal"] })
  const win = await chrome.windows.getLastFocused({ populate: true })
  const windowId = win?.id ?? currentWindow?.id

  const tabs = await chrome.tabs.query({ windowId })
  // lastAccessed is only reliable on Chrome if "sessions" permission; fallback to Date.now()
  const withMeta = tabs.map(t => ({
    id: t.id,
    url: t.url,
    title: t.title,
    favIconUrl: t.favIconUrl,
    lastAccessed: (t as any).lastAccessed ?? Date.now(),
    groupId: (t as any).groupId ?? -1,
    pinned: t.pinned ?? false
  }))

  postToNative({ v: 1, type: "tabs.list", payload: { windowId, tabs: withMeta } })
}

// Example trigger: on startup + when tabs change in focused window
chrome.runtime.onStartup.addListener(sendCurrentWindowTabs)
chrome.tabs.onUpdated.addListener((_id, _change, _tab) => sendCurrentWindowTabs())
chrome.tabs.onAttached.addListener((_tabId, _info) => sendCurrentWindowTabs())
chrome.tabs.onRemoved.addListener((_tabId, _info) => sendCurrentWindowTabs())

// === Open or focus helper ===
async function openOrFocus(opts: { url: string; preferWindowId?: number; matchStrategy?: "exact" | "origin" | "path" }) {
  const url = new URL(opts.url)
  const all = await chrome.tabs.query({}) // all windows
  const match = (t: chrome.tabs.Tab) => {
    if (!t.url) return false
    try {
      const tu = new URL(t.url)
      switch (opts.matchStrategy ?? "exact") {
        case "exact":
          return t.url === opts.url
        case "origin":
          return tu.origin === url.origin
        case "path":
          return tu.origin === url.origin && tu.pathname === url.pathname
      }
    } catch {
      return false
    }
  }
  const hit = all.find(match)
  if (hit && hit.id != null) {
    if (hit.windowId != null) {
      await chrome.windows.update(hit.windowId, { focused: true })
    }
    await chrome.tabs.update(hit.id, { active: true })
    return
  }
  // no hit → create
  const createProps: chrome.tabs.CreateProperties = { url: opts.url }
  if (opts.preferWindowId) createProps.windowId = opts.preferWindowId
  await chrome.tabs.create(createProps)
}


Plasmo manifest bits (MV3)

{
  "permissions": ["tabs", "sessions", "nativeMessaging"],
  "background": { "service_worker": "background.js" }
}

Native host sidecar (Rust)

Responsibilities:

Read JSON messages from stdin, write to stdout (Native Messaging protocol = 4-byte length prefix + UTF-8 JSON).

Maintain a single connection to the Tauri app over WS (localhost) or named pipe/UDS.

Bridge messages both ways.

If the Tauri app isn’t up yet, queue a few messages or respond with app_offline.

Sketch (WS version):

// Cargo.toml: tokio, tokio-tungstenite, serde, serde_json, anyhow

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let (mut stdin_tx, mut stdout_rx) = spawn_stdin_reader_and_stdout_writer();
    let mut ws = connect_app_ws("ws://127.0.0.1:17342").await.ok();

    // pump stdin -> app
    let stdin_to_app = async {
        while let Some(msg) = stdin_tx.recv().await {
            if let Some(ws_conn) = ws.as_mut() {
                ws_conn.send(tungstenite::Message::Text(msg.clone())).await.ok();
            } else {
                // optionally buffer or reply error via stdout
                write_native(&format!(r#"{{"v":1,"type":"error","payload":{{"error":"app_offline"}}}}"#)).await.ok();
            }
        }
    };

    // pump app -> stdout
    let app_to_stdout = async {
        if let Some(mut ws_conn) = ws.take() {
            while let Some(msg) = ws_conn.next().await {
                if let Ok(tungstenite::Message::Text(txt)) = msg {
                    write_native(&txt).await.ok();
                }
            }
        }
    };

    tokio::select! { _ = stdin_to_app => (), _ = app_to_stdout => () }
    Ok(())
}


(You’d fill in helpers to parse/write the Native Messaging framing. Keep it tiny and testable.)

Registering the native host

Chrome/Edge/Brave (Windows/Linux/macOS): create a JSON manifest named e.g. com.your.app.json, pointing to your sidecar path, and listing your extension ID(s).

Example manifest:

{
  "name": "com.your.app",
  "description": "Bridge between extension and Tauri app",
  "path": "/Applications/YourApp.app/Contents/MacOS/your-sidecar",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://<YOUR_EXTENSION_ID>/"]
}


Install location differs by OS; during Tauri bundling, drop this file in the appropriate place (or write an installer step). Firefox uses allowed_extensions with mozilla-addons:// IDs or the extension ID string.

Tauri 2: bundle the sidecar via tauri.conf.json > bundle > externalBin, and install the native host manifest in a post-install hook.

Tauri 2 app: local WS server + protocol

Spin up a small WS server on localhost (choose a fixed port, or discover via OS single-instance lock / randomly chosen port advertised in a tiny file the sidecar reads). On start:

Accept a single (or few) connections from sidecar.

When you need to command the browser, send tabs.openOrFocus messages.

When you receive tabs.list, normalize and display (group by date = group on new Date(lastAccessed).toDateString()).

Rust (Tauri side):

// In your Tauri command init
tokio::spawn(async move {
    let listener = TcpListener::bind(("127.0.0.1", 17342)).await.unwrap();
    while let Ok((stream, _)) = listener.accept().await {
        let ws_stream = tokio_tungstenite::accept_async(stream).await.unwrap();
        tokio::spawn(handle_bridge(ws_stream));
    }
});

async fn handle_bridge(mut ws: WebSocketStream<TcpStream>) {
    use futures_util::{StreamExt, SinkExt};
    while let Some(msg) = ws.next().await {
        if let Ok(Message::Text(txt)) = msg {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&txt) {
                match val.get("type").and_then(|t| t.as_str()) {
                    Some("tabs.list") => {
                        // TODO: update your UI state with list of tabs
                    }
                    Some("ok") | Some("error") => {
                        // ACKs for your sent commands
                    }
                    _ => {}
                }
            }
        }
    }
}


When a user clicks an item in your Tauri UI:

// send command to extension via sidecar
let cmd = serde_json::json!({
  "v": 1,
  "type": "tabs.openOrFocus",
  "id": uuid::Uuid::new_v4(),
  "payload": { "url": clicked_url, "matchStrategy": "path" }
});
ws_sink.send(Message::Text(cmd.to_string())).await?;

Presence & UX flow

Extension startup: immediately connectNative and subscribe. If sidecar can’t be launched (not installed), your UI (popup/options) can show “Desktop app bridge not found” with a link to install your app.

Desktop app startup: launch WS; the sidecar will auto-reconnect and you’ll receive a presence.status shortly after.

Tab listing: extension emits on startup and on tab events (updated/attached/removed). App groups by lastAccessed date, falling back to Date.now() if unavailable.

Open vs focus: your extension implementation already tries to focus a matching tab; otherwise creates a new tab. Add origin|path|exact strategies for UX.

Security notes

Native Messaging already scopes the host to your extension ID(s).

If you go WS-only (no native messaging), add:

A shared secret (first run pairing) included as Sec-WebSocket-Protocol or a query param; store it in extension storage.local.

Bind to 127.0.0.1 only; random high port; rotate secret on logout.

Optionally sign messages (HMAC) if you expect multiple clients.

Alternative (simpler) option: direct localhost WebSocket

Skip native messaging, and have the extension connect to ws://127.0.0.1:<port>. This is fewer pieces, totally workable, but:

You must solve port discovery (hardcode or advertise via your cloud).

You must implement your own auth.

Firefox/Chrome both allow WS to localhost from extensions, but you’ll handle reconnects, etc.

If you want this route, I can give you a minimal Plasmo WS client and a Tauri plugin starter.

“Title image” ideas

Fast: use favicon (free), plus Open Graph og:image when available (background fetch from the service worker; consider timeouts & size limits).

Nicer: lazy-request a small screenshot of each page only when clicked/focused (chrome.tabs.captureVisibleTab works only for the active tab). For others, stick with OG image.

If you want, tell me your target browsers (Chrome/Brave/Edge/Firefox?) and OS targets, and I’ll tailor:

The exact native host manifests for each OS,

A ready-to-build Rust sidecar skeleton,

The Plasmo manifest and background wiring as a drop-in.

You said:
I have a minimal tauri project and a minimal extension project to test this

I want to use claude code or codex to do this
my challenge is that it has to deal with separate projects
should I put them in a shared parent dir
or how do you suggest I proceed?
---
ChatGPT said:
Nachgedacht für 14s

Great question. You’ve got two solid ways to make Claude Code/Cursor (and your own brain) handle two separate projects that must evolve together:

Option A (my pick): One parent workspace (monorepo-style), separate packages

This is the smoothest for agentic tools and CI. You keep the desktop app and the extension in one repo as separate packages, plus a shared protocol package so both sides compile against the same types.

Suggested layout (Yarn workspaces, since you prefer Yarn)
mapmap-bridge/
├─ package.json            # workspaces root
├─ yarn.lock
├─ tsconfig.base.json
├─ README.md               # one true top-level doc for Claude/Cursor to read
├─ tools/
│  ├─ scripts/             # cross-package scripts used by agents
│  └─ .prompts/            # reusable agent prompts (see below)
├─ packages/
│  ├─ shared-proto/        # TS-only: message types & helpers
│  ├─ ext-plasmo/          # your Plasmo extension
│  └─ app-tauri/           # your Tauri 2 app (React/TS frontend + Rust)
└─ rust/
   └─ sidecar/             # native host bridge (Rust) if you go Native Messaging

Root package.json
{
  "name": "mapmap-bridge",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev:app": "yarn --cwd packages/app-tauri tauri dev",
    "dev:ext": "yarn --cwd packages/ext-plasmo plasmo dev",
    "typecheck": "tsc -b",
    "build": "yarn workspaces run build",
    "lint": "eslint . --ext .ts,.tsx"
  }
}

Shared protocol package

packages/shared-proto/

Exports the JSON message envelope, types (TabsList, OpenOrFocus, Presence, etc.), zod validators, tiny helpers.

Both ext and app import from here, so they never drift.

packages/shared-proto/src/schema.ts

import { z } from "zod"

export const Envelope = z.object({
  v: z.literal(1),
  id: z.string().optional(),
  type: z.string(),
  payload: z.unknown().optional()
})
export type Envelope = z.infer<typeof Envelope>

export const TabsList = z.object({
  windowId: z.number().nullable().optional(),
  tabs: z.array(z.object({
    id: z.number().nullable().optional(),
    url: z.string().url().optional(),
    title: z.string().optional(),
    favIconUrl: z.string().url().optional(),
    lastAccessed: z.number().optional(),
    groupId: z.number().optional(),
    pinned: z.boolean().optional()
  }))
})
export type TabsList = z.infer<typeof TabsList>

// etc…

Wiring for agents (Claude Code / Cursor)

Put a single, authoritative README at the repo root with:

The folder map (as above)

“How to run” (two commands: yarn dev:app, yarn dev:ext)

Brief protocol spec and a link to packages/shared-proto

A Do/Don’t section for agents (e.g., “Never edit protocol types anywhere but shared-proto”)

Add a Taskfile/Makefile so agents can run consistent commands:

Taskfile.yml

version: "3"
tasks:
  setup:
    cmds:
      - yarn
  dev:app:
    cmds:
      - yarn dev:app
  dev:ext:
    cmds:
      - yarn dev:ext
  build:
    cmds:
      - yarn build
  typecheck:
    cmds:
      - yarn typecheck


Create tools/.prompts/bridge.md with a concise multi-repo instruction block telling the agent where to change what (see “Agent prompt” below).

Benefits

One repo → agents “see” everything, can refactor across both projects, and won’t break the contract.

Easy local linking: ext-plasmo imports from shared-proto via workspace resolution.

Single CI pipeline that builds both.

Option B: Keep repos separate, but create a “meta” parent with worktrees

If you must keep them separate (e.g., different licenses/history), create a meta directory that just mounts both repos as siblings so agents can open the parent folder and get context.

mapmap-bridge/
├─ app-tauri/      # git worktree of git@.../app-tauri.git
├─ ext-plasmo/     # git worktree of git@.../ext-plasmo.git
├─ shared-proto/   # either its own repo or vendored as a git submodule
└─ README.md       # master instructions for agents

Fast setup with worktrees
mkdir mapmap-bridge && cd mapmap-bridge
git clone --bare git@github.com:you/app-tauri.git .repo-app-tauri
git --git-dir=.repo-app-tauri worktree add app-tauri main

git clone --bare git@github.com:you/ext-plasmo.git .repo-ext-plasmo
git --git-dir=.repo-ext-plasmo worktree add ext-plasmo main

# optional shared-proto as its own repo
git clone git@github.com:you/shared-proto.git shared-proto


Then in each repo, add a package alias to link shared-proto via yarn link or relative path. Document this in the parent README.md. Agents will work in the parent folder, but commits happen in each child repo normally.

Pros/cons

✅ Keeps history clean per repo

✅ Still gives agents a single folder to open

❌ Slightly more setup (links/submodules)

❌ Harder cross-repo refactors

Minimal “agent prompt” you can drop in (put in tools/.prompts/bridge.md)

Context: You are editing a multi-package workspace for a desktop app (Tauri 2) and a Plasmo-based browser extension that communicate via a shared JSON protocol.
Rules:

All message types live in packages/shared-proto. Update/add types there first.

Extension code is in packages/ext-plasmo. Use only imports from shared-proto for message types.

Desktop UI/Tauri code is in packages/app-tauri. It depends on shared-proto; Rust sidecar (if used) lives in rust/sidecar.

Do not hardcode ports or IDs; use env.ts in each package.

Use yarn dev:app and yarn dev:ext to run; yarn typecheck must stay green.
Tasks: When modifying protocol, update all call sites in both packages and add a smoke test note to README’s “Manual test” section.

Then, when you invoke Claude Code/Cursor, you can paste:

“Please implement tabs.openOrFocus end-to-end per packages/shared-proto/src/schema.ts, updating both packages/ext-plasmo/src/background.ts and the Tauri bridge. Ensure yarn typecheck passes.”

Practical tips for your exact projects

Plasmo dev with Tauri: run both dev servers concurrently (two terminals) or use concurrently at root to spin both:
yarn add -D concurrently && add script "dev": "concurrently -k \"yarn dev:app\" \"yarn dev:ext\""

Shared .editorconfig / tsconfig: put them at root so both sides align. Have tsconfig.base.json and reference it from each package’s tsconfig.json.

Env discovery: create packages/ext-plasmo/src/env.ts and packages/app-tauri/src/env.ts (or Rust config) so agents have a single place to tweak things like NATIVE_HOST_NAME, WS_PORT, etc.

Native Messaging host files: keep templates under packages/ext-plasmo/native-host/. Your Tauri bundler postinstall can copy to OS paths. Document this in README so agents don’t guess.

JetBrains + Cursor: since you like WebStorm for diffs, open the workspace root in WebStorm. Run Cursor/Claude Code also at root so they can index all packages. If you want isolated edits, you can scope the agent (“only touch packages/ext-plasmo except for types in shared-proto”).

If you want to keep completely separate repos but still give agents superpowers (no monorepo):

Use a “driver” repo with a lightweight script that checks out pinned SHAs of both repos and symlinks shared-proto into each. Agents edit in the driver repo and run scripts that push to the right remote. It’s more ceremony, but it works.

What I recommend you do now

Create the parent workspace (Option A) with Yarn workspaces.

Extract message types to packages/shared-proto.

Move your minimal Tauri app → packages/app-tauri and extension → packages/ext-plasmo.

Add the root README and the agent prompt file.

Add root scripts: dev:app, dev:ext, typecheck.

Point Claude Code/Cursor at the workspace root and give it the prompt:

“Implement the desktop↔️extension bridge using the types in shared-proto. Start with presence ping and tabs.list → Tauri UI. Then add tabs.openOrFocus.”

If you want, I can generate the exact starter files (root package.json, workspace tsconfigs, shared-proto skeleton, Plasmo background, Tauri WS server, and a Rust sidecar scaffold) tailored to your current minimal projects’ names.

You said:
why is the sidecar outside the app? what even is a sidecar to be precise=
user/tester will only have an app and an ext to install
---
ChatGPT said:

Great q—“sidecar” sounds like extra baggage, but it’s really just a tiny helper process, not a third thing your users install.

What a “sidecar” is (precisely)

A small, headless executable that your desktop app ships inside its bundle.

It runs separately from your GUI process, usually with stdio (no windows), doing one job: bridge the browser extension to your app.

In this case it’s the Native Messaging host the extension connects to. It forwards messages to your app over a localhost socket/pipe, and vice-versa.

Think of it as a doorman between the browser and your app.

Why not just use the app itself?

Browsers’ Native Messaging expects a dedicated host binary launched on demand by the browser service worker:

Communicates strictly via stdin/stdout and must exit when the port closes.

Should be non-UI, quick to start, and safe to kill anytime.

Needs a fixed file path to register in the browser’s host manifest.

You can make your Tauri app be that host, but it’s awkward:

Launching a full GUI every time the extension pings is janky.

GUI event loops + stdio pipes are easy to deadlock/mismanage.

On macOS the “app” is a bundle; the browser wants a real executable path—you’d still point to an inner binary anyway.

When the browser disconnects, the host should terminate; that conflicts with your GUI lifecycle.

Hence the sidecar: clean separation of concerns.

Why it’s “outside” the app (but still shipped with it)

“Outside” just means a separate process, not a separate install. With Tauri 2 you declare it as an external binary (e.g., externalBin) so it’s bundled inside your app and installed automatically. Your installer also drops the small host manifest file that points to that sidecar’s path. Users still only install:

Your desktop app

Your extension
…nothing else.

What the sidecar does

Speaks Native Messaging (stdin/stdout, 4-byte length + JSON).

Maintains a stable connection to your app (localhost WebSocket/pipe).

Handles presence (is app up? is extension connected?).

Buffers or NACKs messages if one side is temporarily down.

Keeps security boundaries: browser only launches the whitelisted host; host only talks to 127.0.0.1.

Alternatives (and why/when to pick them)

Direct localhost WebSocket (no sidecar):
Extension → ws://127.0.0.1:<port> in your app.

✅ Simplest architecture, no native messaging registration.

⚠️ You must handle auth/secret, port discovery, and some enterprise environments block localhost WS.

Good for fast prototyping.

App as Native Host (no sidecar binary):

✅ One executable.

⚠️ GUI/stdio lifecycle pain, odd UX (app pops open), harder to keep robust across OSes.

Feasible but brittle.

Sidecar as Native Host (recommended):

✅ Best UX + security, aligns with browser expectations, robust lifecycle.

✅ Your app remains a normal GUI; the host is tiny and disposable.

🚀 Easiest to support Chrome/Brave/Edge/Firefox the same way.

What the tester sees

Install the app → installer silently registers the sidecar host with the browser(s).

Install the extension → it can connectNative("com.your.app") immediately.

No extra icons, no separate installer, no extra steps.

If you want, I can give you the exact Tauri 2 externalBin config + minimal Rust sidecar template and the manifest snippets for Chrome/Firefox, so your tester experience is literally “install app, install extension, it just works.”

You said:
I want to spin a subagent that will be able to test the messaging with my interference
how can I do that? what tools does it need?
---
ChatGPT said:
Nachgedacht für 34s

Great idea—spin up a tiny “subagent” that can hammer the bridge end-to-end without you clicking around.

Here’s a clean, repeatable setup that works whether you go Native Messaging (+ sidecar) or direct localhost WS.

What the subagent is

A headless Node runner that:

boots a real browser with your Plasmo extension loaded,

sends/receives protocol messages (tabs.list, tabs.openOrFocus, presence),

asserts round-trips to your desktop app (or a mock),

prints a concise test report.

Tools you’ll need

Node + Yarn (you already use Yarn)

Playwright (drives Chromium with the extension loaded)

ws (WebSocket client) – talks to your desktop app/sidecar debug socket

zod (validates message envelopes from your shared-proto)

(Optional) vitest if you want proper test reporting

Minimal wiring
1) Add a tiny “test control” endpoint in your extension (dev only)

In your background script, add a dev-only message handler so the subagent can trigger actions:

// background.ts (MV3 service worker)
const DEV = process.env.NODE_ENV !== "production"

if (DEV) {
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    (async () => {
      if (msg?.type === "test.triggerTabsList") {
        await sendCurrentWindowTabs() // your existing function
        sendResponse({ ok: true })
      } else if (msg?.type === "test.openOrFocus" && msg.payload?.url) {
        await openOrFocus(msg.payload)
        sendResponse({ ok: true })
      }
    })()
    // Return true to keep the channel open for async response
    return true
  })
}


This doesn’t ship to prod; it’s only compiled in dev.

2) Expose a debug WebSocket in your bridge for the tester (sidecar or app)

Make either the sidecar or the Tauri app open a second, dev-only WS on localhost (e.g., ws://127.0.0.1:17888) that mirrors the bridge traffic:

Anything coming from extension → also broadcast to any connected test clients.

Anything from app → also broadcast.

Anything from test client → forward as if it came from the app (so you can inject tabs.openOrFocus, etc.).

This gives the subagent full observe/act control without touching your UI.

If you’re on the simpler “direct WS” architecture already, you can skip this and point the subagent straight at the app WS. If you’re on Native Messaging, add this tiny debug socket to the sidecar.

3) Subagent: a single Node script (Playwright + WS)

Install dev deps (at repo root / monorepo):

yarn add -D @playwright/test ws zod ts-node typescript
npx playwright install chromium


tester.ts (subagent)

import { chromium, BrowserContext } from "@playwright/test"
import WebSocket from "ws"
import { z } from "zod"

// ---- CONFIG ----
const EXT_PATH = process.env.EXT_PATH ?? "packages/ext-plasmo/build" // unpacked ext dir
const DEBUG_WS = process.env.DEBUG_WS ?? "ws://127.0.0.1:17888"       // your debug socket
const TEST_URL = "https://example.com/"

// Your shared envelope schema (or import from shared-proto)
const Envelope = z.object({
  v: z.literal(1),
  id: z.string().optional(),
  type: z.string(),
  payload: z.any().optional()
})
type Envelope = z.infer<typeof Envelope>

function once<T>(ws: WebSocket, pred: (m: Envelope) => boolean): Promise<Envelope> {
  return new Promise((resolve) => {
    const onMsg = (raw: WebSocket.RawData) => {
      try {
        const msg = Envelope.parse(JSON.parse(String(raw)))
        if (pred(msg)) {
          ws.off("message", onMsg)
          resolve(msg)
        }
      } catch {}
    }
    ws.on("message", onMsg)
  })
}

async function main() {
  // 1) Launch Chromium with the extension
  const context: BrowserContext = await chromium.launchPersistentContext("", {
    headless: true,
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`
    ]
  })
  const [page] = context.pages().length ? context.pages() : [await context.newPage()]
  await page.goto("about:blank")

  // 2) Connect to your debug WS (sidecar/app)
  const ws = new WebSocket(DEBUG_WS)
  await new Promise((res, rej) => {
    ws.once("open", res)
    ws.once("error", rej)
  })

  // 3) Tell extension to emit tabs.list (via dev message)
  // We need an extension page context to call chrome.runtime.sendMessage.
  // Use the options page if you have one; else create a tiny dev-only html page.
  // Fallback: send from about:blank via chrome.* is not allowed, so open a chrome-extension:// page.
  const background = await context.newPage()
  // Replace with your real extension URL, e.g. chrome-extension://<ID>/options.html
  // In dev, Playwright doesn't know your ID. Let’s call the special internal page that can reach the service worker:
  await background.goto("chrome://extensions/") // just to have a page, we will use chrome.runtime via evaluateOnNewDocument below

  // A helper to deliver a message to the SW using the extension ID discovered at runtime.
  // We’ll enumerate extensions and pick ours by name.
  const extId = await findExtensionId(context, "Your Extension Name")
  if (!extId) throw new Error("Extension ID not found. Name mismatch?")

  // use the chrome API within the extension context:
  await sendRuntimeMessage(context, extId, { type: "test.triggerTabsList" })

  // 4) Wait for tabs.list to appear on the debug WS
  const tabsList = await once(ws, m => m.type === "tabs.list")
  console.log("Received tabs.list with", tabsList.payload?.tabs?.length ?? 0, "tabs")

  // 5) Inject an openOrFocus command from tester → bridge → extension
  const openCmd: Envelope = {
    v: 1,
    type: "tabs.openOrFocus",
    id: cryptoRandomId(),
    payload: { url: TEST_URL, matchStrategy: "origin" }
  }
  ws.send(JSON.stringify(openCmd))

  // 6) Ask extension to emit again, assert that TEST_URL now exists among tabs
  await sendRuntimeMessage(context, extId, { type: "test.triggerTabsList" })
  const tabsList2 = await once(ws, m => m.type === "tabs.list")
  const urls: string[] = (tabsList2.payload?.tabs ?? []).map((t: any) => t.url).filter(Boolean)
  if (!urls.some(u => u.startsWith(TEST_URL))) {
    throw new Error("openOrFocus failed: URL not present")
  }
  console.log("openOrFocus OK")

  await context.close()
  ws.close()
  console.log("✅ Subagent test completed")
}

function cryptoRandomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// Discover the extension ID by its name from chrome://extensions-internal (Playwright trick)
async function findExtensionId(context: BrowserContext, name: string) {
  // Chromium exposes an internal page with extension metadata blocked to scripts, so as a simpler approach:
  // require you to pass EXT_ID via env in CI. If you really want auto-discovery, you can parse DevTools protocol targets instead.
  return process.env.EXT_ID || null
}

// Send a message to the extension’s SW via a visible extension page
async function sendRuntimeMessage(context: BrowserContext, extId: string, msg: any) {
  // Open the extension's options page (you should add one in dev), e.g.: chrome-extension://<id>/options.html
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extId}/options.html`)
  await page.evaluate((payload) => {
    // @ts-ignore
    chrome.runtime.sendMessage(payload)
  }, msg)
  await page.close()
}

main().catch((e) => {
  console.error("❌ Subagent test failed:", e)
  process.exit(1)
})


Notes

For MV3, interacting with the Service Worker is awkward; the trick above uses an extension page (options.html) to call chrome.runtime.sendMessage. Add a dev-only options page if you don’t have one.

If you don’t want to add any UI, you can also create a dev-only test.html under your extension and use that instead of options.html.

4) NPM scripts (root)
{
  "scripts": {
    "test:bridge": "TS_NODE_TRANSPILE_ONLY=1 ts-node tester.ts"
  }
}


Run:

EXT_PATH=/absolute/path/to/unpacked-ext DEBUG_WS=ws://127.0.0.1:17888 EXT_ID=<your_dev_ext_id> yarn test:bridge

Test scenarios you can script

presence: kill the app → subagent expects app_offline NACK; start app → expect presence.status.

tabs flow: tabs.list → app ACK → openOrFocus → tabs.list includes the URL.

multiple windows: simulate preferWindowId.

error paths: send malformed payload; expect error envelope.

latency: subagent can measure RTT across the bridge.

If you’re skipping Native Messaging (direct WS)

Even simpler: point DEBUG_WS to your app’s WS. The same subagent will…

send tabs.openOrFocus directly,

listen for tabs.list,

and skip any sidecar involvement.

Why this setup works for “no interference”

The subagent spins everything it needs (headless browser + extension + WS).

You don’t click anything; results are asserted automatically.

Playwright isolates a temp profile so the extension runs cleanly each time.

The debug WS lets the bot both observe and inject messages.

Want me to tailor the options.html (or test.html) for your Plasmo project and add the DEBUG_WS mirroring stub (Tauri or sidecar, ~40 lines)?

You said:
yes
---
ChatGPT said:
Nachgedacht für 20s

Perfect—here’s a drop-in kit so you can spin a subagent and test the whole bridge without touching your UI. I’ll give you:

a tiny dev options page in your Plasmo ext to trigger test actions,

a dev message hook in the background SW,

a debug WebSocket mirror on the bridge (choose Tauri-only or Sidecar),

and the subagent script + run commands.

1) Plasmo extension (MV3)
1a) Manifest (Plasmo)

plasmo.manifest.ts

import type { PlasmoManifest } from "plasmo"

const manifest: PlasmoManifest = {
  manifest_version: 3,
  name: "Your Extension Name",
  version: "0.0.1",
  permissions: ["tabs", "sessions", "nativeMessaging"],
  background: { service_worker: "background.ts" },
  options_ui: { page: "options.html", open_in_tab: true } // <-- dev helper
}

export default manifest

1b) Dev options page (lets the subagent call chrome.runtime.sendMessage)

src/options.html

<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Dev Options</title></head>
  <body>
    <h1>Dev Options</h1>
    <button id="emit">Emit tabs.list</button>
    <script>
      document.getElementById("emit")?.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "test.triggerTabsList" }, (res) => console.log(res))
      })
    </script>
  </body>
</html>

1c) Background service worker (dev test hooks)

src/background.ts

const DEV = process.env.NODE_ENV !== "production"

// --- your real bridge code lives here (connectNative or WS, sendCurrentWindowTabs, openOrFocus, etc.) ---

// DEV-only control surface for subagent
if (DEV) {
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    (async () => {
      try {
        if (msg?.type === "test.triggerTabsList") {
          await sendCurrentWindowTabs()
          sendResponse({ ok: true })
        } else if (msg?.type === "test.openOrFocus" && msg.payload?.url) {
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

// Example impls used above (yours may already exist)
async function sendCurrentWindowTabs() {
  const win = await chrome.windows.getLastFocused({ populate: true })
  const tabs = await chrome.tabs.query({ windowId: win.id })
  const withMeta = tabs.map(t => ({
    id: t.id, url: t.url, title: t.title, favIconUrl: t.favIconUrl,
    lastAccessed: (t as any).lastAccessed ?? Date.now(), groupId: (t as any).groupId ?? -1,
    pinned: t.pinned ?? false
  }))
  postToBridge({ v: 1, type: "tabs.list", payload: { windowId: win.id, tabs: withMeta } })
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
    } catch {}
    return false
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

// Replace with your native/WS posting
function postToBridge(msg: any) {
  // nativePort.postMessage(msg) or ws.send(JSON.stringify(msg))
}

2) Bridge: add a Debug WS mirror (dev only)

Pick one of these:

Option A — Mirror inside your Tauri app (quickest if you’re using direct WS)

Your existing bridge WS (e.g., ws://127.0.0.1:17342) keeps working.

Add a dev-only second WS at ws://127.0.0.1:17888 that:

receives anything from your extension or app and broadcasts it,

forwards any messages from a debug client to the app→extension direction.

Rust (Tauri) — add this on startup (Tokio):

// Cargo.toml: tokio, tokio-tungstenite, futures-util, serde_json
use futures_util::{StreamExt, SinkExt};
use tokio::net::TcpListener;
use tokio_tungstenite::{accept_async, tungstenite::Message};
use std::sync::{Arc, Mutex};

#[derive(Clone)]
struct DebugHub {
    clients: Arc<Mutex<Vec<tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>>>>,
}

impl DebugHub {
    fn new() -> Self { Self { clients: Arc::new(Mutex::new(Vec::new())) } }
    async fn broadcast(&self, txt: &str) {
        let mut dead = vec![];
        let mut guard = self.clients.lock().unwrap();
        for (i, ws) in guard.iter_mut().enumerate() {
            if ws.send(Message::Text(txt.to_string())).await.is_err() {
                dead.push(i);
            }
        }
        for i in dead.into_iter().rev() { guard.remove(i); }
    }
}

pub async fn spawn_debug_ws(hub: DebugHub, app_tx: tokio::sync::mpsc::Sender<String>) {
    let listener = TcpListener::bind(("127.0.0.1", 17888)).await.unwrap();
    tokio::spawn(async move {
        while let Ok((stream, _)) = listener.accept().await {
            let mut ws = accept_async(stream).await.unwrap();
            {
                let mut g = hub.clients.lock().unwrap();
                g.push(ws.clone());
            }
            let hub2 = hub.clone();
            let app_tx2 = app_tx.clone();
            tokio::spawn(async move {
                while let Some(msg) = ws.next().await {
                    if let Ok(Message::Text(txt)) = msg {
                        // Treat tester messages as "from app" → forward to extension side
                        let _ = app_tx2.send(txt.clone()).await;
                        let _ = hub2.broadcast(&txt).await;
                    }
                }
            });
        }
    });
}

// Call this somewhere in setup:
// let (app_tx, mut app_rx) = tokio::sync::mpsc::channel::<String>(64);
// let debug_hub = DebugHub::new();
// spawn_debug_ws(debug_hub.clone(), app_tx.clone()).await;

// Wherever you handle messages FROM extension → app:
async fn on_from_extension(debug_hub: &DebugHub, txt: &str) {
    debug_hub.broadcast(txt).await; // mirror to tester
    // ... process normally
}

// Wherever you send messages FROM app → extension:
async fn send_to_extension(debug_hub: &DebugHub, txt: &str) {
    debug_hub.broadcast(txt).await; // mirror to tester
    // ... actually send to extension
}

Option B — Mirror inside the sidecar (if you’re using Native Messaging)

Same pattern: keep your stdin/stdout ↔ WS bridge, and add a second WS at 127.0.0.1:17888 that mirrors and allows injection. (The logic is identical to Option A—just place it in the sidecar process.)

3) Subagent (headless tester)

Install deps at your workspace root:

yarn add -D @playwright/test ws zod ts-node typescript
npx playwright install chromium


Create tester.ts:

import { chromium, BrowserContext } from "@playwright/test"
import WebSocket from "ws"
import { z } from "zod"

const EXT_PATH = process.env.EXT_PATH ?? "packages/ext-plasmo/build" // unpacked ext dir
const EXT_ID = process.env.EXT_ID // your dev extension ID
const DEBUG_WS = process.env.DEBUG_WS ?? "ws://127.0.0.1:17888"
const TEST_URL = "https://example.com/"

const Envelope = z.object({ v: z.literal(1), id: z.string().optional(), type: z.string(), payload: z.any().optional() })
type Envelope = z.infer<typeof Envelope>

function waitOnce(ws: WebSocket, pred: (m: Envelope) => boolean) {
  return new Promise<Envelope>((resolve) => {
    const onMsg = (data: WebSocket.RawData) => {
      try {
        const msg = Envelope.parse(JSON.parse(String(data)))
        if (pred(msg)) { ws.off("message", onMsg); resolve(msg) }
      } catch {}
    }
    ws.on("message", onMsg)
  })
}

function rid() { return Math.random().toString(36).slice(2) + Date.now().toString(36) }

async function sendRuntimeMessage(context: BrowserContext, extId: string, payload: any) {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extId}/options.html`)
  await page.evaluate((msg) => chrome.runtime.sendMessage(msg), payload)
  await page.close()
}

async function main() {
  if (!EXT_ID) throw new Error("Set EXT_ID=<your dev extension id>")

  // 1) Launch Chromium with the extension
  const context = await chromium.launchPersistentContext("", {
    headless: true,
    args: [`--disable-extensions-except=${EXT_PATH}`, `--load-extension=${EXT_PATH}`]
  })
  await (context.pages()[0] ?? context.newPage()).goto("about:blank")

  // 2) Connect to debug mirror
  const ws = new WebSocket(DEBUG_WS)
  await new Promise((res, rej) => { ws.once("open", res); ws.once("error", rej) })

  // 3) Trigger tabs.list from extension
  await sendRuntimeMessage(context, EXT_ID, { type: "test.triggerTabsList" })
  const list1 = await waitOnce(ws, m => m.type === "tabs.list")
  console.log("tabs.list #1:", list1.payload?.tabs?.length ?? 0)

  // 4) Inject openOrFocus via debug WS
  ws.send(JSON.stringify({ v: 1, type: "tabs.openOrFocus", id: rid(), payload: { url: TEST_URL, matchStrategy: "origin" } }))

  // 5) Trigger again and assert presence
  await sendRuntimeMessage(context, EXT_ID, { type: "test.triggerTabsList" })
  const list2 = await waitOnce(ws, m => m.type === "tabs.list")
  const urls: string[] = (list2.payload?.tabs ?? []).map((t: any) => t.url).filter(Boolean)
  if (!urls.some(u => u.startsWith(TEST_URL))) throw new Error("openOrFocus failed")
  console.log("✅ openOrFocus OK")

  await context.close()
  ws.close()
}

main().catch(e => { console.error("❌ Subagent failed:", e); process.exit(1) })


Add script:

{
  "scripts": {
    "test:bridge": "TS_NODE_TRANSPILE_ONLY=1 ts-node tester.ts"
  }
}


Run (two terminals):

# 1) Start your app (or sidecar) with the debug WS enabled
yarn dev:app

# 2) Build extension to an unpacked dir (Plasmo)
yarn --cwd packages/ext-plasmo build

# 3) Subagent
EXT_PATH=/abs/path/to/packages/ext-plasmo/build \
EXT_ID=<your_dev_ext_id> \
DEBUG_WS=ws://127.0.0.1:17888 \
yarn test:bridge


How to get EXT_ID in dev: load the unpacked extension once in a regular Chromium profile (chrome://extensions), copy the ID.

That’s it

You can now observe every bridge message in the subagent and inject commands without touching your UI.

This works whether you’re running direct WS (mirror in Tauri) or Native Messaging (mirror in sidecar).

When you ship prod builds, guard the debug WS and dev hooks behind NODE_ENV !== "production" or a feature flag.