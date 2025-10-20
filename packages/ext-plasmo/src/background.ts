import type { TabsOpenOrFocusPayload } from "@bridge/shared-proto";
import {
  EnvelopeSchema,
  TabsListPayloadSchema,
  TabsOpenOrFocusPayloadSchema
} from "@bridge/shared-proto";

const HOST_NAME = "com.bridge.app";
const DEV = process.env.NODE_ENV !== "production";

let nativePort: chrome.runtime.Port | null = null;
let reconnectTimer: number | undefined;

const scheduleReconnect = (delay = 1500) => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  reconnectTimer = setTimeout(connectNative, delay);
};

const connectNative = () => {
  try {
    nativePort = chrome.runtime.connectNative(HOST_NAME);
  } catch (error) {
    console.warn("[bridge-ext] connectNative failed:", error);
    scheduleReconnect();
    return;
  }

  nativePort.onMessage.addListener(onFromNative);
  nativePort.onDisconnect.addListener(() => {
    nativePort = null;
    scheduleReconnect();
  });

  postToNative({
    v: 1,
    type: "presence.status",
    payload: { extension: "online", timestamp: Date.now() }
  });

  void sendCurrentWindowTabs("connect");
};

const postToNative = (message: unknown) => {
  nativePort?.postMessage(message);
};

const onFromNative = async (raw: unknown) => {
  const parsed = EnvelopeSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn("[bridge-ext] received malformed envelope", raw);
    return;
  }

  const { type, payload, id } = parsed.data;

  try {
    switch (type) {
      case "tabs.openOrFocus": {
        const args = TabsOpenOrFocusPayloadSchema.parse(payload);
        await openOrFocus(args);
        postToNative({ v: 1, id, type: "ok" });
        break;
      }
      case "presence.query":
        postToNative({
          v: 1,
          id,
          type: "presence.status",
          payload: { extension: "online", timestamp: Date.now() }
        });
        break;
      default:
        console.warn("[bridge-ext] unknown message type", type);
        postToNative({
          v: 1,
          id,
          type: "error",
          payload: { error: "unknown_type", type }
        });
    }
  } catch (error) {
    postToNative({
      v: 1,
      id,
      type: "error",
      payload: { error: String(error) }
    });
  }
};

const sendCurrentWindowTabs = async (reason: string) => {
  try {
    const focusedWindow = await chrome.windows.getLastFocused({ populate: true });
    const windowId = focusedWindow?.id ?? chrome.windows.WINDOW_ID_NONE;
    const tabs = await chrome.tabs.query({ windowId });

    const payload = TabsListPayloadSchema.parse({
      windowId,
      tabs: tabs.map((tab) => ({
        id: tab.id ?? undefined,
        url: tab.url ?? undefined,
        title: tab.title ?? undefined,
        favIconUrl: tab.favIconUrl ?? undefined,
        lastAccessed: (tab as chrome.sessions.Session & { lastAccessed?: number }).lastAccessed ?? Date.now(),
        groupId: (tab as any).groupId ?? undefined,
        pinned: tab.pinned ?? false
      }))
    });

    postToNative({
      v: 1,
      type: "tabs.list",
      payload: { ...payload, reason }
    });
  } catch (error) {
    console.error("[bridge-ext] failed to emit tabs.list", error);
  }
};

const openOrFocus = async (options: TabsOpenOrFocusPayload) => {
  const target = new URL(options.url);
  const allTabs = await chrome.tabs.query({});

  const match = allTabs.find((tab) => {
    if (!tab.url) {
      return false;
    }
    try {
      const current = new URL(tab.url);
      switch (options.matchStrategy ?? "exact") {
        case "exact":
          return current.href === target.href;
        case "origin":
          return current.origin === target.origin;
        case "path":
          return current.origin === target.origin && current.pathname === target.pathname;
        default:
          return false;
      }
    } catch {
      return false;
    }
  });

  if (match?.id != null) {
    if (match.windowId != null) {
      await chrome.windows.update(match.windowId, { focused: true });
    }
    await chrome.tabs.update(match.id, { active: true });
    return;
  }

  const createProps: chrome.tabs.CreateProperties = { url: options.url };
  if (options.preferWindowId != null) {
    createProps.windowId = options.preferWindowId;
  }
  await chrome.tabs.create(createProps);
};

const subscribeTabEvents = () => {
  const handler = (reason: string) => () => void sendCurrentWindowTabs(reason);
  chrome.tabs.onCreated.addListener(handler("created"));
  chrome.tabs.onUpdated.addListener((_id, _info, _tab) => void sendCurrentWindowTabs("updated"));
  chrome.tabs.onRemoved.addListener((_id, _info) => void sendCurrentWindowTabs("removed"));
  chrome.tabs.onAttached.addListener((_id, _info) => void sendCurrentWindowTabs("attached"));
  chrome.tabs.onDetached.addListener((_id, _info) => void sendCurrentWindowTabs("detached"));
  chrome.windows.onFocusChanged.addListener(() => void sendCurrentWindowTabs("focus-changed"));
};

if (DEV) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    (async () => {
      if (message?.type === "test.triggerTabsList") {
        await sendCurrentWindowTabs("dev-trigger");
        sendResponse({ ok: true });
      } else if (message?.type === "test.openOrFocus") {
        try {
          const args = TabsOpenOrFocusPayloadSchema.parse(message.payload);
          await openOrFocus(args);
          sendResponse({ ok: true });
        } catch (error) {
          sendResponse({ ok: false, error: String(error) });
        }
      }
    })();
    return true;
  });
}

chrome.runtime.onStartup.addListener(() => {
  connectNative();
  void sendCurrentWindowTabs("startup");
});

chrome.runtime.onInstalled.addListener(() => {
  connectNative();
  void sendCurrentWindowTabs("installed");
});

subscribeTabEvents();
connectNative();
