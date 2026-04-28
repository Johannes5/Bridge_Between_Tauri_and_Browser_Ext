import {
  TabsListPayloadSchema,
  TabsSavedPayloadSchema,
  type TabsOpenOrFocusPayload
} from "shared-proto";
import { state } from "./state";
import { postToNative } from "./connection";
import { isValidUrl, serializeTab, coerceLastAccessed } from "./utils";
import { resolveWindowSnapshot, notifyFocusWindow } from "./windows";

export const fetchTabsForWindow = async (
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

export const sendCurrentWindowTabs = async (reason: string) => {
  try {
    const allWindows = await chrome.windows.getAll({ populate: true });
    
    // Collect all tabs from all windows
    const allTabs = allWindows.flatMap((win) => win.tabs ?? []);
    
    const payload = TabsListPayloadSchema.parse({
      windowId: null,
      tabs: allTabs.map(serializeTab),
      reason,
      connectionId: state.connectionId ?? undefined,
      browser: state.browser ?? undefined
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

export const saveAndCloseActiveWindow = async () => {
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
      connectionId: state.connectionId ?? undefined,
      browser: state.browser ?? undefined
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

export const restoreTabs = async (options: {
  urls: string[];
  newWindow?: boolean;
  focused?: boolean;
  suspend?: boolean;
  connectionId?: string;
}) => {
  if (options.connectionId && state.connectionId && options.connectionId !== state.connectionId) {
    console.log(
      `[bridge-ext] ignoring tabs.restore for ${options.connectionId}, current connection ${state.connectionId}`
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

export const openOrFocus = async (options: TabsOpenOrFocusPayload) => {
  if (options.connectionId && state.connectionId && options.connectionId !== state.connectionId) {
    console.log(
      `[bridge-ext] ignoring tabs.openOrFocus for ${options.connectionId}, current connection ${state.connectionId}`
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
