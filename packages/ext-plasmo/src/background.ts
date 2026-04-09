import {
  EnvelopeSchema,
  PresenceStatusPayloadSchema,
  WindowsListPayloadSchema,
  TabsOpenOrFocusPayloadSchema,
  TabsRestorePayloadSchema
} from "@bridge/shared-proto";

import { state } from "./background/state";
import { postToNative } from "./background/connection";
import { assignNativeWindowsToBrowserWindows } from "./background/windows";
import { 
  sendCurrentWindowTabs, 
  saveAndCloseActiveWindow, 
  restoreTabs, 
  openOrFocus 
} from "./background/tabs";

const HOST_NAME = "com.bridge.app";
const DEV = process.env.NODE_ENV !== "production";
const KEEP_ALIVE_INTERVAL = 20000; // 20 seconds

let updateDebounceTimer: ReturnType<typeof setTimeout> | undefined;

const connectNative = () => {
  if (state.nativePort) {
    return;
  }
  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = undefined;
  }
  try {
    state.nativePort = chrome.runtime.connectNative(HOST_NAME);
  } catch (error) {
    console.warn("[bridge-ext] connectNative failed:", error);
    scheduleReconnect();
    return;
  }

  state.nativePort.onMessage.addListener(onFromNative);
  state.nativePort.onDisconnect.addListener(() => {
    state.nativePort = null;
    state.isConnectionReady = false;
    state.windowInfoCache.clear();
    scheduleReconnect();
  });

  // Start heartbeat
  const heartbeat = setInterval(() => {
      if (state.nativePort) {
          postToNative({ v: 1, type: "ping", payload: {} });
      } else {
          clearInterval(heartbeat);
      }
  }, KEEP_ALIVE_INTERVAL);
};

const scheduleReconnect = (delay = 1500) => {
  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
  }
  state.reconnectTimer = setTimeout(connectNative, delay);
};

const onFromNative = async (raw: unknown) => {
  const parsed = EnvelopeSchema.safeParse(raw);
  if (!parsed.success) {
    if (DEV) console.warn("[bridge-ext] received malformed envelope", raw);
    return;
  }

  const { type, payload, id } = parsed.data;

  try {
    switch (type) {
      case "presence.status": {
        // We no longer rely on the app to assign us an ID. We authorize ourselves.
        const status = PresenceStatusPayloadSchema.safeParse(payload);
        if (status.success) {
           if (!state.isConnectionReady) {
               state.isConnectionReady = true;
               console.log(`[bridge-ext] Handshake complete. Self-assigned: ${state.browser} (${state.connectionId})`);
               
               // Send initial data
               postToNative({ v: 1, type: "windows.list.request", payload: {} });
               void sendCurrentWindowTabs("initial-after-connect");
           }
        }
        break;
      }
      case "windows.list": {
        const listPayload = WindowsListPayloadSchema.safeParse(payload);
        if (listPayload.success) {
          state.windowInfoCache.clear();
          const allWindows = await chrome.windows.getAll();
          const assigned = assignNativeWindowsToBrowserWindows(
            listPayload.data.windows,
            allWindows
          );
          assigned.forEach((native, windowId) => {
            state.windowInfoCache.set(windowId, native);
          });
          console.log("[bridge-ext] Updated window info cache:", state.windowInfoCache);
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
          payload: { 
              extension: "online", 
              timestamp: Date.now(),
              connectionId: state.connectionId ?? undefined,
              browser: state.browser ?? undefined
          }
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

import { deltaManager } from "./background/delta-manager";

const subscribeTabEvents = () => {
  // Use DeltaManager for granular updates
  chrome.tabs.onCreated.addListener((tab) => deltaManager.queueAdded(tab));
  
  chrome.tabs.onUpdated.addListener((_id, changeInfo, tab) => {
    // Only send updates for meaningful changes
    if (changeInfo.url || changeInfo.title || changeInfo.pinned !== undefined || changeInfo.status === "complete") {
      deltaManager.queueUpdated(tab);
    }
  });
  
  chrome.tabs.onRemoved.addListener((tabId) => deltaManager.queueRemoved(tabId));
  
  // For structural changes (window movement), we still fall back to full sync for safety for now,
  // or we could implement move support in DeltaManager later.
  chrome.tabs.onAttached.addListener(() => void sendCurrentWindowTabs("attached"));
  chrome.tabs.onDetached.addListener(() => void sendCurrentWindowTabs("detached"));
  chrome.windows.onFocusChanged.addListener(() => void sendCurrentWindowTabs("focus-changed"));
};

// Listeners
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
});

chrome.runtime.onInstalled.addListener(() => {
  connectNative();
});

chrome.action.onClicked.addListener(() => {
  void saveAndCloseActiveWindow();
});

subscribeTabEvents();
connectNative();
