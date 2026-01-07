import type { TabsOpenOrFocusPayload, WindowInfo } from "@bridge/shared-proto";
import {
  EnvelopeSchema,
  FocusWindowPayloadSchema,
  PresenceStatusPayloadSchema,
  TabsListPayloadSchema,
  TabsOpenOrFocusPayloadSchema,
  TabsRestorePayloadSchema,
  TabsSavedPayloadSchema,
  WindowsListPayloadSchema
} from "@bridge/shared-proto";

const HOST_NAME = "com.bridge.app";
const DEV = process.env.NODE_ENV !== "production";

let nativePort: chrome.runtime.Port | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let connectionId: string | null = null;
let browser: string | null = null;
let isConnectionReady = false;

const windowInfoCache = new Map<number, WindowInfo>();

const notifyFocusWindow = (windowId?: number | null) => {
  if (windowId == null) {
    console.warn("[bridge-ext] notifyFocusWindow called with no windowId");
    return;
  }

  const windowInfo = windowInfoCache.get(windowId);
  if (!windowInfo) {
    console.warn(`[bridge-ext] No window info cached for windowId: ${windowId}`);
    // Fallback or request update? For now, just warn.
    return;
  }

  try {
    const payload = FocusWindowPayloadSchema.parse({
      hwnd: windowInfo.hwnd
    });

    postToNative({
      v: 1,
      type: "focus.window",
      payload
    });
  } catch (error) {
    console.warn("[bridge-ext] failed to send focus.window message", error);
  }
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

const isValidUrl = (url: string): boolean => {
  if (!url || typeof url !== "string" || url.length === 0) {
    return false;
  }

  // Block dangerous protocols
  const dangerousProtocols = ["javascript:", "data:", "vbscript:", "file:"];
  const lowerUrl = url.toLowerCase();
  if (dangerousProtocols.some((protocol) => lowerUrl.startsWith(protocol))) {
    console.warn("[bridge-ext] Blocked dangerous URL protocol:", url);
    return false;
  }

  // Allow chrome:// and chrome-extension:// for internal pages
  if (lowerUrl.startsWith("chrome://") || lowerUrl.startsWith("chrome-extension://")) {
    return true;
  }

  // Validate http/https URLs
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    console.warn("[bridge-ext] Invalid URL format:", url);
    return false;
  }
};

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    title: (window as any)?.title ?? null
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
    isConnectionReady = false;
    windowInfoCache.clear();
    scheduleReconnect();
  });

  // Don't send anything yet - wait for presence.status
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
        const status = PresenceStatusPayloadSchema.safeParse(payload);
        if (status.success && status.data.connectionId && status.data.browser) {
          const wasNotReady = !isConnectionReady;
          connectionId = status.data.connectionId;
          browser = status.data.browser;
          isConnectionReady = true;
          console.log(`[bridge-ext] Connection established: ${browser} (${connectionId})`);

          if (wasNotReady) {
            postToNative({ v: 1, type: "windows.list.request", payload: {} });
            void sendCurrentWindowTabs("initial-after-connect");
          }
        }
        break;
      }
      case "windows.list": {
        const listPayload = WindowsListPayloadSchema.safeParse(payload);
        if (listPayload.success) {
          windowInfoCache.clear();
          const allWindows = await chrome.windows.getAll();
          for (const nativeWin of listPayload.data.windows) {
            // Find the corresponding browser window by title match
            const browserWin = allWindows.find((w) => 
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              nativeWin.title.includes((w as any).title ?? "")
            );
            if (browserWin?.id != null) {
              windowInfoCache.set(browserWin.id, nativeWin);
            }
          }
          console.log("[bridge-ext] Updated window info cache:", windowInfoCache);
        } else {
          console.warn("[bridge-ext] Failed to parse windows.list payload", listPayload.error);
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
    const allWindows = await chrome.windows.getAll({ populate: true });
    
    // Collect all tabs from all windows
    const allTabs = allWindows.flatMap((win) => win.tabs ?? []);
    
    // Determine the "primary" window ID (e.g. focused one) if needed, 
    // but for the list payload we can set windowId to null to indicate a multi-window snapshot.
    // However, if there is only one window, we could set it. 
    // Let's just set it to null to be consistent with our new frontend logic.
    
    const payload = TabsListPayloadSchema.parse({
      windowId: null,
      tabs: allTabs.map(serializeTab),
      reason,
      connectionId: connectionId ?? undefined,
      browser: browser ?? undefined
    });

    postToNative({
      v: 1,
      type: "tabs.list",
      payload
    });
  } catch (error) {
    console.error("[bridge-ext] failed to emit tabs.list", error);
  }
};

const saveAndCloseActiveWindow = async () => {
  try {
    const focusedWindow = await chrome.windows.getLastFocused({ populate: true }).catch(() => undefined);
    if (!focusedWindow || focusedWindow.id === chrome.windows.WINDOW_ID_NONE) {
      console.warn("[bridge-ext] No focused window available to save");
      return;
    }
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
  connectionId?: string;
}) => {
  if (options.connectionId && connectionId && options.connectionId !== connectionId) {
    console.log(
      `[bridge-ext] ignoring tabs.restore for ${options.connectionId}, current connection ${connectionId}`
    );
    return;
  }

  const urls = options.urls
    .filter((u) => typeof u === "string" && u.length > 0)
    .filter(isValidUrl);

  if (urls.length === 0) {
    console.warn("[bridge-ext] No valid URLs to restore");
    return;
  }

  const suspend = options.suspend === true;
  const newWindow = options.newWindow !== false;
  const focused = options.focused !== false;

  const scheduleDiscard = (tabId: number) => discardTab(tabId, true);

  if (newWindow) {
    const [firstUrl, ...remaining] = urls;
    let createdWindow: chrome.windows.Window | undefined;
    try {
      createdWindow = await chrome.windows.create({
        url: suspend ? undefined : firstUrl ?? "about:blank",
        focused
      });
    } catch (error) {
      console.error("Failed to create new window:", error);
      return; // Abort if window creation fails
    }
    const windowId = createdWindow.id ?? chrome.windows.WINDOW_ID_NONE;
    const placeholderTabId = createdWindow.tabs?.[0]?.id;
    let firstTabId = suspend ? undefined : placeholderTabId ?? undefined;

    if (!suspend && firstTabId != null && focused) {
      await pauseMediaInTab(firstTabId);
    }

    const pending = suspend ? urls : remaining;

    // Create all tabs first to maintain order and improve performance
    const createdTabs: Array<{ id: number; index: number }> = [];
    for (const [index, url] of pending.entries()) {
      try {
        const tab = await chrome.tabs.create({
          windowId,
          url,
          active: !suspend && index === 0 && focused
        });
        if (tab.id != null) {
          createdTabs.push({ id: tab.id, index });
          if (firstTabId == null) {
            firstTabId = tab.id;
          }
        }
      } catch (error) {
        console.error(`Failed to create tab for URL ${url}:`, error);
        // Continue with remaining tabs
      }
    }

    // Apply media pause and discard operations (don't block on these)
    for (const { id } of createdTabs) {
      void pauseMediaInTab(id);
      if (suspend) {
        void scheduleDiscard(id);
      }
    }

    if (suspend && placeholderTabId != null) {
      try {
        await chrome.tabs.remove(placeholderTabId);
      } catch {
        // ignore if the placeholder tab was already closed
      }
    }

    if (!suspend && focused) {
      const toActivate = firstTabId ?? placeholderTabId;
      if (toActivate != null) {
        await chrome.tabs.update(toActivate, { active: true });
      }
    }

    notifyFocusWindow(windowId);

    return;
  }

  const last = await chrome.windows.getLastFocused().catch(() => undefined);
  const targetWindowId = last?.id ?? chrome.windows.WINDOW_ID_NONE;

  // Create all tabs first to maintain order and improve performance
  let firstTabId: number | undefined;
  const createdTabIds: number[] = [];

  for (const [index, url] of urls.entries()) {
    try {
      const tab = await chrome.tabs.create(
        targetWindowId !== chrome.windows.WINDOW_ID_NONE
          ? { windowId: targetWindowId, url, active: !suspend && index === 0 && focused }
          : { url, active: !suspend && index === 0 && focused }
      );
      if (tab.id != null) {
        createdTabIds.push(tab.id);
        if (index === 0) {
          firstTabId = tab.id;
        }
      }
    } catch (error) {
      console.error(`Failed to create tab for URL ${url}:`, error);
      // Continue with remaining tabs
    }
  }

  // Apply media pause and discard operations after all tabs are created
  for (const tabId of createdTabIds) {
    void pauseMediaInTab(tabId);
    if (suspend) {
      void scheduleDiscard(tabId);
    }
  }

  if (!suspend && focused) {
    if (targetWindowId !== chrome.windows.WINDOW_ID_NONE) {
      try {
        await chrome.windows.update(targetWindowId, { focused: true });
      } catch (error) {
        console.error("Failed to focus window:", error);
      }
    }
    if (firstTabId != null) {
      try {
        await chrome.tabs.update(firstTabId, { active: true });
      } catch (error) {
        console.error("Failed to activate tab:", error);
      }
    }
  }

  notifyFocusWindow(targetWindowId === chrome.windows.WINDOW_ID_NONE ? undefined : targetWindowId);
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
      clearTimeout(timeoutId);
      void attempt();
    }
  };

  chrome.tabs.onUpdated.addListener(listener);

  // Cleanup listener after 30 seconds if tab never completes loading
  const timeoutId = setTimeout(() => {
    chrome.tabs.onUpdated.removeListener(listener);
  }, 30000);
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
      clearTimeout(timeoutId);
    }
  };

  chrome.tabs.onUpdated.addListener(listener);
  
  // Cleanup listener after 30 seconds if tab never completes loading
  const timeoutId = setTimeout(() => {
    chrome.tabs.onUpdated.removeListener(listener);
  }, 30000);
};

const openOrFocus = async (options: TabsOpenOrFocusPayload) => {
  if (options.connectionId && connectionId && options.connectionId !== connectionId) {
    console.log(
      `[bridge-ext] ignoring tabs.openOrFocus for ${options.connectionId}, current connection ${connectionId}`
    );
    return;
  }

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

    notifyFocusWindow(
      match.windowId ?? undefined
    );
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
  const createdTab = await chrome.tabs.create(createProps);

  const targetWindowId =
    createdTab.windowId ?? createProps.windowId ?? chrome.windows.WINDOW_ID_NONE;

  if (targetWindowId !== chrome.windows.WINDOW_ID_NONE) {
    try {
      await chrome.windows.update(targetWindowId, { focused: true, drawAttention: true });
    } catch (error) {
      console.warn("[bridge-ext] failed to focus new window after tab create", error);
    }
  }

  notifyFocusWindow(
    targetWindowId === chrome.windows.WINDOW_ID_NONE ? undefined : targetWindowId,
  );
};

const coerceLastAccessed = (tab: chrome.tabs.Tab): number => {
  // Chrome tabs have lastAccessed but @types/chrome doesn't include it
  const raw = (tab as chrome.tabs.Tab & { lastAccessed?: number }).lastAccessed;
  const value = typeof raw === "number" && Number.isFinite(raw) ? raw : Date.now();
  return Math.round(value);
};

// Global debounce timer that can be cleaned up
let updateDebounceTimer: ReturnType<typeof setTimeout> | undefined;

const subscribeTabEvents = () => {
  
  // Debounce tabs.onUpdated to avoid excessive snapshot spam
  const debouncedUpdateHandler = () => {
    if (updateDebounceTimer) {
      clearTimeout(updateDebounceTimer);
    }
    updateDebounceTimer = setTimeout(() => {
      void sendCurrentWindowTabs("updated");
      updateDebounceTimer = undefined;
    }, 300); // Wait 300ms after last update before sending snapshot
  };
  
  chrome.tabs.onCreated.addListener(() => void sendCurrentWindowTabs("created"));
  chrome.tabs.onUpdated.addListener((_id, changeInfo, _tab) => {
    // Only send snapshots for meaningful changes (URL, title, or pinned state)
    if (changeInfo.url || changeInfo.title || changeInfo.pinned !== undefined) {
      debouncedUpdateHandler();
    }
  });
  chrome.tabs.onRemoved.addListener((_id, _info) => void sendCurrentWindowTabs("removed"));
  chrome.tabs.onAttached.addListener((_id, _info) => void sendCurrentWindowTabs("attached"));
  chrome.tabs.onDetached.addListener((_id, _info) => void sendCurrentWindowTabs("detached"));
  chrome.windows.onFocusChanged.addListener(() => void sendCurrentWindowTabs("focus-changed"));
};

// Cleanup function for service worker lifecycle
const cleanup = () => {
  if (updateDebounceTimer) {
    clearTimeout(updateDebounceTimer);
    updateDebounceTimer = undefined;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
  }
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
  // Initial snapshot will be sent after presence.status is received
});

chrome.runtime.onInstalled.addListener(() => {
  connectNative();
  // Initial snapshot will be sent after presence.status is received
});

chrome.action.onClicked.addListener(() => {
  void saveAndCloseActiveWindow();
});

subscribeTabEvents();
connectNative();
