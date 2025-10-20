import { chromium, BrowserContext } from "@playwright/test";
import path from "node:path";
import process from "node:process";
import WebSocket from "ws";
import { EnvelopeSchema, type Envelope } from "@bridge/shared-proto";

const EXT_PATH = process.env.EXT_PATH ?? path.resolve("packages/ext-plasmo/build");
const EXT_ID = process.env.EXT_ID;
const DEBUG_WS = process.env.DEBUG_WS ?? "ws://127.0.0.1:17888";
const TEST_URL = process.env.TEST_URL ?? "https://example.com/";

if (!EXT_ID) {
  throw new Error("Set EXT_ID=<extension id> before running the bridge tester");
}

async function main() {
  console.log("[tester] launching chromium with extension:", EXT_PATH);
  const context = await chromium.launchPersistentContext("", {
    headless: true,
    args: [`--disable-extensions-except=${EXT_PATH}`, `--load-extension=${EXT_PATH}`]
  });

  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("about:blank");

  console.log("[tester] connecting to debug ws:", DEBUG_WS);
  const ws = await openWs(DEBUG_WS);

  console.log("[tester] requesting initial tabs.list from extension");
  await sendRuntimeMessage(context, EXT_ID, { type: "test.triggerTabsList" });
  const tabsList1 = await waitOnce(ws, (msg) => msg.type === "tabs.list");
  const initialCount = Array.isArray((tabsList1.payload as any)?.tabs)
    ? (tabsList1.payload as any).tabs.length
    : 0;
  console.log(`[tester] tabs.list received with ${initialCount} tab(s)`);

  console.log("[tester] injecting tabs.openOrFocus command via debug ws");
  const openCmd: Envelope = {
    v: 1,
    type: "tabs.openOrFocus",
    id: randomId(),
    payload: { url: TEST_URL, matchStrategy: "origin" }
  };
  ws.send(JSON.stringify(openCmd));

  console.log("[tester] requesting tabs.list after openOrFocus");
  await sendRuntimeMessage(context, EXT_ID, { type: "test.triggerTabsList" });
  const tabsList2 = await waitOnce(ws, (msg) => msg.type === "tabs.list");
  const urls: string[] = Array.isArray((tabsList2.payload as any)?.tabs)
    ? (tabsList2.payload as any).tabs.map((tab: any) => tab?.url).filter(Boolean)
    : [];

  if (!urls.some((u) => typeof u === "string" && u.startsWith(TEST_URL))) {
    throw new Error(`Expected a tab starting with ${TEST_URL}, but got ${urls.join(", ")}`);
  }

  console.log("[tester] openOrFocus verified");

  await ws.close();
  await context.close();
}

async function openWs(url: string): Promise<WebSocket> {
  return await new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.once("open", () => resolve(socket));
    socket.once("error", (err) => reject(err));
  });
}

function waitOnce(ws: WebSocket, predicate: (msg: Envelope) => boolean): Promise<Envelope> {
  return new Promise((resolve, reject) => {
    const handler = (raw: WebSocket.RawData) => {
      try {
        const parsed = EnvelopeSchema.parse(JSON.parse(raw.toString("utf-8")));
        if (predicate(parsed)) {
          ws.off("message", handler);
          resolve(parsed);
        }
      } catch (error) {
        console.warn("[tester] ignoring non-envelope message from debug ws:", error);
      }
    };
    ws.on("message", handler);
    ws.once("close", () => {
      ws.off("message", handler);
      reject(new Error("debug websocket closed before predicate matched"));
    });
  });
}

async function sendRuntimeMessage(context: BrowserContext, extensionId: string, message: unknown) {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.evaluate((payload) => {
    chrome.runtime.sendMessage(payload);
  }, message);
  await page.close();
}

function randomId(): string {
  return `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

main().catch((error) => {
  console.error("[tester] failed:", error);
  process.exit(1);
});
