import {
  FocusWindowPayloadSchema,
  TabsListPayloadSchema,
  type WindowInfo
} from "@bridge/shared-proto";
import { state } from "./state";
import { postToNative } from "./connection";
import { serializeTab } from "./utils";
import { fetchTabsForWindow } from "./tabs";

/** Higher score = better match between Win32 window title and `chrome.windows` title. */
function scoreTitleMatch(nativeTitle: string, browserTitle: string): number {
  const n = nativeTitle.trim();
  const b = browserTitle.trim();
  if (!n || !b) return 0;
  const nl = n.toLowerCase();
  const bl = b.toLowerCase();
  if (nl === bl) return 100;
  if (nl.includes(bl)) return 80;
  if (bl.includes(nl)) return 60;
  return 0;
}

/**
 * Map each browser window to at most one native HWND, preferring exact title matches
 * and avoiding reuse of the same HWND across multiple windows.
 */
export function assignNativeWindowsToBrowserWindows(
  nativeWindows: WindowInfo[],
  browserWindows: chrome.windows.Window[]
): Map<number, WindowInfo> {
  const cache = new Map<number, WindowInfo>();
  const usedHwnds = new Set<number>();

  const withIds = browserWindows.filter(
    (w): w is chrome.windows.Window & { id: number } => w.id != null
  );

  for (const bw of withIds) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const browserTitle = String((bw as any).title ?? "");
    let best: { score: number; native: WindowInfo } | null = null;

    for (const native of nativeWindows) {
      if (usedHwnds.has(native.hwnd)) continue;
      const score = scoreTitleMatch(native.title, browserTitle);
      if (score > (best?.score ?? -1)) {
        best = { score, native };
      }
    }

    if (best && best.score > 0) {
      cache.set(bw.id, best.native);
      usedHwnds.add(best.native.hwnd);
    }
  }

  return cache;
}

export const resolveWindowSnapshot = async (window?: chrome.windows.Window) => {
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

export const notifyFocusWindow = (windowId?: number | null) => {
  if (windowId == null) {
    console.warn("[bridge-ext] notifyFocusWindow called with no windowId");
    return;
  }

  const windowInfo = state.windowInfoCache.get(windowId);
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
