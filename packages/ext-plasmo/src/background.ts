import type { TabsOpenOrFocusPayload } from "@bridge/shared-proto";
import {
  EnvelopeSchema,
  TabsListPayloadSchema,
  TabsOpenOrFocusPayloadSchema,
  TabsSavedPayloadSchema,
  TabsRestorePayloadSchema,
  PresenceStatusPayloadSchema
} from "@bridge/shared-proto";

const HOST_NAME = "com.bridge.app";
const DEV = process.env.NODE_ENV !== "production";

let nativePort: chrome.runtime.Port | null = null;
let reconnectTimer: number | undefined;
let connectionId: string | null = null;
let browser: string | null = null;

const randomId = (): string => {
  const globalCrypto = globalThis.crypto;
  if (globalCrypto?.randomUUID) {
    return globalCrypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

const serializeTab = (tab: chrome.tabs.Tab) => ({
  id: tab.id ?? undefined,
  url: tab.url ?? undefined,
  title: tab.title ?? undefined,
  favIconUrl: tab.favIconUrl ?? undefined,
  lastAccessed: coerceLastAccessed(tab),
  windowId: tab.windowId ?? undefined,
  groupId: (tab as chrome.tabs.Tab & { groupId?: number }).groupId ?? undefined,
  pinned: tab.pinned ?? false
});

const fetchTabsForWindow = async (
  windowId: number,
  prepopulated?: chrome.tabs.Tab[] | null
): Promise<chrome.tabs.Tab[]> => {
  if (prepopulated && prepopulated.length > 0) {
    return prepopulated;
  }
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    return [];
  }
  return chrome.tabs.query({ windowId });
};

const resolveWindowSnapshot = async (window?: chrome.windows.Window) => {
  const windowId = window?.id ?? chrome.windows.WINDOW_ID_NONE;
  const tabs = await fetchTabsForWindow(windowId, window?.tabs);
  const basePayload = TabsListPayloadSchema.parse({
    windowId,
    tabs: tabs.map(serializeTab)
  });
  return {
    windowId,
    tabs,
    payload: basePayload,
    title: window?.title ?? null
  };
};

const scheduleReconnect = (delay = 1500) => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  reconnectTimer = setTimeout(connectNative, delay);
};

const connectNative = () => {
  if (nativePort) {
    return;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
  }
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

  // Don't send presence - let the sidecar handle that with proper metadata
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
      case "presence.status": {
        // Extract connection metadata from presence messages
        const status = PresenceStatusPayloadSchema.safeParse(payload);
        if (status.success && status.data.connectionId && status.data.browser) {
          connectionId = status.data.connectionId;
          browser = status.data.browser;
          console.log(`[bridge-ext] Connection established: ${browser} (${connectionId})`);
        }
        break;
      }
      case "tabs.restore": {
        const args = TabsRestorePayloadSchema.parse(payload);
        await restoreTabs(args);
        postToNative({ v: 1, id, type: "ok" });
        break;
      }
      case "tabs.openOrFocus": {
        const args = TabsOpenOrFocusPayloadSchema.parse(payload);
        await openOrFocus(args);
        postToNative({ v: 1, id, type: "ok" });
        break;
      }
      case "tabs.list.request":
        await sendCurrentWindowTabs("app-request");
        postToNative({ v: 1, id, type: "ok" });
        break;
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
    const { payload } = await resolveWindowSnapshot(focusedWindow);

    postToNative({
      v: 1,
      type: "tabs.list",
      payload: {
        ...payload,
        reason,
        connectionId: connectionId ?? undefined,
        browser: browser ?? undefined
      }
    });
  } catch (error) {
    console.error("[bridge-ext] failed to emit tabs.list", error);
  }
};

const saveAndCloseActiveWindow = async () => {
  try {
    const focusedWindow = await chrome.windows.getLastFocused({ populate: true });
    const { windowId, tabs, title, payload } = await resolveWindowSnapshot(focusedWindow);

    if (!tabs.length) {
      console.warn("[bridge-ext] active window has no tabs to save");
      return;
    }

    const savedPayload = TabsSavedPayloadSchema.parse({
      ...payload,
      savedAt: Date.now(),
      label: title ?? tabs[0]?.title ?? tabs[0]?.url ?? undefined,
      source: "extension",
      reason: "extension-action",
      connectionId: connectionId ?? undefined,
      browser: browser ?? undefined
    });

    postToNative({
      v: 1,
      id: randomId(),
      type: "tabs.save",
      payload: savedPayload
    });

    if (windowId !== chrome.windows.WINDOW_ID_NONE) {
      await chrome.windows.remove(windowId);
    } else {
      const closableIds = tabs
        .map((tab) => tab.id)
        .filter((id): id is number => typeof id === "number");
      if (closableIds.length > 0) {
        await chrome.tabs.remove(closableIds);
      }
    }

    void sendCurrentWindowTabs("extension-save");
  } catch (error) {
    console.error("[bridge-ext] failed to save and close window", error);
  }
};

const restoreTabs = async (options: {
  urls: string[];
  newWindow?: boolean;
  focused?: boolean;
  suspend?: boolean;
}) => {
  const urls = options.urls.filter((u) => typeof u === "string" && u.length > 0);
  if (urls.length === 0) {
    return;
  }

  const suspend = options.suspend === true;
  const newWindow = options.newWindow !== false;
  const focused = options.focused !== false;

  const scheduleDiscard = (tabId: number) => discardTab(tabId, true);

  if (newWindow) {
    const [firstUrl, ...remaining] = urls;
    const createdWindow = await chrome.windows.create({
      url: suspend ? undefined : firstUrl ?? "about:blank",
      focused
    });
    const windowId = createdWindow.id ?? chrome.windows.WINDOW_ID_NONE;
    const placeholderTabId = createdWindow.tabs?.[0]?.id;
    let firstTabId = suspend ? undefined : placeholderTabId ?? undefined;

    if (!suspend && firstTabId != null && focused) {
      await pauseMediaInTab(firstTabId);
    }

    const pending = suspend ? urls : remaining;

    for (const [index, url] of pending.entries()) {
      const tab = await chrome.tabs.create({
        windowId,
        url,
        active: !suspend && index === 0 && focused
      });
      if (tab.id != null) {
        if (suspend) {
          if (firstTabId == null) {
            firstTabId = tab.id;
          }
          await pauseMediaInTab(tab.id);
          await scheduleDiscard(tab.id);
        } else {
          await pauseMediaInTab(tab.id);
        }
      }
    }

    if (!suspend && focused) {
      const toActivate = firstTabId ?? placeholderTabId;
      if (toActivate != null) {
        await chrome.tabs.update(toActivate, { active: true });
      }
    }

    return;
  }

  const last = await chrome.windows.getLastFocused();
  const targetWindowId = last?.id ?? chrome.windows.WINDOW_ID_NONE;

  let firstTabId: number | undefined;
  for (const [index, url] of urls.entries()) {
    const tab = await chrome.tabs.create(
      targetWindowId !== chrome.windows.WINDOW_ID_NONE
        ? { windowId: targetWindowId, url, active: !suspend && index === 0 && focused }
        : { url, active: !suspend && index === 0 && focused }
    );
    if (tab.id == null) {
      continue;
    }
    if (index === 0) {
      firstTabId = tab.id;
      if (suspend) {
          await pauseMediaInTab(tab.id);
          await scheduleDiscard(tab.id);
      } else if (focused) {
        await pauseMediaInTab(tab.id);
      }
    } else if (suspend) {
      await pauseMediaInTab(tab.id);
      await scheduleDiscard(tab.id);
    } else {
      await pauseMediaInTab(tab.id);
    }
  }

  if (!suspend && focused) {
    if (targetWindowId !== chrome.windows.WINDOW_ID_NONE) {
      await chrome.windows.update(targetWindowId, { focused: true });
    }
    if (firstTabId != null) {
      await chrome.tabs.update(firstTabId, { active: true });
    }
  }
};

const discardTab = async (tabId?: number, waitForLoad = false) => {
  if (typeof tabId !== "number") {
    return;
  }

  const attempt = async () => {
    try {
      await chrome.tabs.discard(tabId);
    } catch {
      // ignore if discard is not allowed
    }
  };

  if (!waitForLoad) {
    await attempt();
    return;
  }

  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab) {
      return;
    }
    if (tab.status === "complete") {
      await attempt();
      return;
    }
  } catch {
    return;
  }

  const listener = (updatedTabId: number, info: chrome.tabs.TabChangeInfo) => {
    if (updatedTabId === tabId && info.status === "complete") {
      chrome.tabs.onUpdated.removeListener(listener);
      void attempt();
    }
  };

  chrome.tabs.onUpdated.addListener(listener);
};

const pauseMediaInTab = async (tabId?: number) => {
  if (typeof tabId !== "number") {
    return;
  }

  const inject = async () => {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const elements = Array.from(
            document.querySelectorAll<HTMLMediaElement>("video, audio")
          );
          for (const media of elements) {
            try {
              media.pause();
            } catch {
              // ignore if pause fails
            }
          }
        }
      });
    } catch {
      // ignore cross-origin or scripting failures
    }
  };

  await inject();

  const listener = (updatedTabId: number, info: chrome.tabs.TabChangeInfo) => {
    if (updatedTabId === tabId && info.status === "complete") {
      void inject();
      chrome.tabs.onUpdated.removeListener(listener);
    }
  };

  chrome.tabs.onUpdated.addListener(listener);
};

const openOrFocus = async (options: TabsOpenOrFocusPayload) => {
  console.log("[bridge-ext] openOrFocus called with:", { 
    url: options.url, 
    matchStrategy: options.matchStrategy,
    connectionId: options.connectionId 
  });
  
  const target = new URL(options.url);
  const allTabs = await chrome.tabs.query({});

  // Find ALL matching tabs
  const matchingTabs = allTabs.filter((tab) => {
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

  console.log(`[bridge-ext] Found ${matchingTabs.length} matching tabs`);

  // If multiple matches, pick the best one
  let match: chrome.tabs.Tab | undefined;
  if (matchingTabs.length > 0) {
    // Priority: 1) Prefer specified window, 2) Most recently accessed
    if (options.preferWindowId != null) {
      match = matchingTabs.find((tab) => tab.windowId === options.preferWindowId);
      console.log(`[bridge-ext] Looking for tab in window ${options.preferWindowId}: ${match ? 'found' : 'not found'}`);
    }
    
    // If no match by window, or no preferWindowId, pick most recently accessed
    if (!match && matchingTabs.length > 0) {
      match = matchingTabs.sort((a, b) => {
        const aTime = coerceLastAccessed(a);
        const bTime = coerceLastAccessed(b);
        return bTime - aTime; // Most recent first
      })[0];
      console.log(`[bridge-ext] Selected most recently accessed tab`);
    }
  }

  if (match?.id != null) {
    console.log("[bridge-ext] Found matching tab:", { 
      tabId: match.id, 
      windowId: match.windowId,
      url: match.url,
      title: match.title 
    });
    
    // Focus window FIRST, then activate tab - this is more reliable
    if (match.windowId != null) {
      try {
        // First, focus the window to bring it to front
        await chrome.windows.update(match.windowId, { focused: true });
        
        // Small delay to let the window focus take effect
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Then activate the tab
        await chrome.tabs.update(match.id, { active: true });
        
        // Try again to ensure window is front-most
        await chrome.windows.update(match.windowId, { focused: true, drawAttention: true });
        
        console.log("[bridge-ext] Tab focused successfully");
      } catch (err) {
        console.warn("[bridge-ext] Failed to focus window/tab:", err);
      }
    } else {
      // No window ID, just try to activate the tab
      await chrome.tabs.update(match.id, { active: true });
    }
    return;
  }

  console.log("[bridge-ext] No matching tab found, creating new tab");
  const createProps: chrome.tabs.CreateProperties = { url: options.url };
  if (options.preferWindowId != null) {
    try {
      await chrome.windows.get(options.preferWindowId);
      createProps.windowId = options.preferWindowId;
    } catch {
      // window no longer exists; allow Chrome to pick the default target
    }
  }
  await chrome.tabs.create(createProps);
};

const coerceLastAccessed = (tab: chrome.tabs.Tab): number => {
  // Chrome tabs have lastAccessed but @types/chrome doesn't include it
  const raw = (tab as chrome.tabs.Tab & { lastAccessed?: number }).lastAccessed;
  const value = typeof raw === "number" && Number.isFinite(raw) ? raw : Date.now();
  return Math.round(value);
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

chrome.action.onClicked.addListener(() => {
  void saveAndCloseActiveWindow();
});

subscribeTabEvents();
connectNative();
