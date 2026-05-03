import { min } from "lodash";
import { EnvelopeSchema, PresenceStatusPayloadSchema, TabsOpenOrFocusPayloadSchema, TabsRestorePayloadSchema, WindowsListPayloadSchema } from "shared-proto";



import { postToNative } from "./background/connection";
import { deltaManager } from "./background/delta-manager";
import { state } from "./background/state";
import { openOrFocus, restoreTabs, saveAndCloseActiveWindow, sendCurrentWindowTabs } from "./background/tabs";


const HOST_NAME = "com.bridge.app";
const DEV = process.env.NODE_ENV !== "production";
const KEEP_ALIVE_INTERVAL = 20000; // 20 seconds
const windowCreationTimes = new Map<number, number>();

let updateDebounceTimer: ReturnType<typeof setTimeout> | undefined;


/**
 * Computes the Levenshtein distance between two strings.
 * It counts the minimum number of single-character edits
 * (insertions, deletions, substitutions) required to change one string into the other.
 */
function levenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;

  // Create a matrix of size (an+1) x (bn+1)
  const matrix: number[][] = Array.from({ length: an + 1 }, () =>
      Array(bn + 1).fill(0)
  );

  // Initialize first row and column
  for (let i = 0; i <= an; i++) matrix[i][0] = i;
  for (let j = 0; j <= bn; j++) matrix[0][j] = j;

  // Fill the matrix
  for (let i = 1; i <= an; i++) {
    for (let j = 1; j <= bn; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,       // deletion
          matrix[i][j - 1] + 1,       // insertion
          matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[an][bn];
}

/**
 * Returns the best matching strings from the `candidates` array for the given `input`.
 *
 * Matching strategy:
 * 1. If any candidate is an exact substring of `input`, pick the longest one.
 * 2. If no exact substring match exists, fall back to the candidate with the
 *    smallest Levenshtein distance to `input`.
 *
 * Ties are broken by the order in the original array.
 *
 * @param input     - The target string to match against.
 * @param candidates - An unsorted array of candidate Tabs with a title string value.
 * @returns The best matching candidates, or `null` if the candidates array is empty.
 */
function bestMatchingTabs(input: string, candidates: chrome.tabs.Tab[]): chrome.tabs.Tab[] | null {
  if (candidates.length === 0) return null;

  const substringMatches = candidates.filter((candidate) =>
      input.includes(candidate.title)
  );
  let bestCandidate = candidates[0];

  if (substringMatches.length > 0) {
    bestCandidate = substringMatches.reduce((longest, current) =>
        current.title.length > longest.title.length ? current : longest
    );
  }

  let bestDistance = levenshteinDistance(input, bestCandidate.title);
  let options: chrome.tabs.Tab[] = [bestCandidate]
  for (let i = 1; i < candidates.length; i++) {
    const distance = levenshteinDistance(input, candidates[i].title);
    if (distance <= bestDistance) {
      bestDistance = distance;
      bestCandidate = candidates[i];
      options.push(bestCandidate);
    }
  }
  options.reverse();
  return options;
}
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
          const activeTabs = await chrome.tabs.query({active: true, status: "complete"})
          for (const nativeWin of listPayload.data.windows) {
            // Find the corresponding browser window by title match
            const options = bestMatchingTabs(nativeWin.title, activeTabs);
            let browserTab = options[0];
            // redundency for same titled windows
            // we pick the closest one by time
            if (options.length > 1) {
              let hwndTimestamp = listPayload.data.hwnds[nativeWin.hwnd];

              let minTab = options[0]
              for (let i = 1; i < min([3, options.length]); i++) {
                let minTabTime = windowCreationTimes.get(minTab.windowId);
                let optionTime = windowCreationTimes.get(options[i].windowId);
                if (Math.abs(hwndTimestamp - minTabTime) > Math.abs(hwndTimestamp - optionTime) ) {
                  minTab = options[i]
                }
              }
              browserTab = minTab
            }

            if (browserTab?.windowId != null) {
              state.windowInfoCache.set(browserTab.windowId, nativeWin)
            }

          }
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


chrome.windows.onCreated.addListener(async (win) => {
  refreshWindows().catch(console.error)
  windowCreationTimes.set(win.id, Date.now())
})


chrome.tabs.onCreated.addListener( (tab) => {
    postToNative({ v: 1, type: "windows.list.request", payload: {} });
})

chrome.tabs.onUpdated.addListener((tabId) => {
    postToNative({ v: 1, type: "windows.list.request", payload: {} })
})

chrome.windows.onRemoved.addListener((winId) => {
  windowCreationTimes.delete(winId)
  refreshWindows().catch(console.error)

  postToNative({ v: 1, type: "windows.list.request", payload: {} })
})

chrome.windows.onFocusChanged.addListener((win) => {
  refreshWindows().catch(console.error)
})

const refreshWindows = async ()=> {
  let allWindows = await chrome.windows.getAll();
  for (let window of allWindows) {
    if (windowCreationTimes.has(window.id)) {
      continue
    }
    windowCreationTimes.set(window.id, Date.now())
    let allWindowIds = allWindows.map((win) => win.id)
    let savedKeys = windowCreationTimes.keys()
    for (let key of savedKeys) {
      if (!allWindowIds.includes(key)) {
        windowCreationTimes.delete(key)
      }
    }
  }
}

subscribeTabEvents();
connectNative();
