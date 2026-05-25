import {
  FocusWindowPayloadSchema,
  TabsListPayloadSchema
} from "shared-proto";
import { state } from "./state";
import { postToNative } from "./connection";
import { serializeTabWithPreview } from "./utils";
import { fetchTabsForWindow } from "./tabs";

export const resolveWindowSnapshot = async (window?: chrome.windows.Window) => {
  const windowId = window?.id ?? chrome.windows.WINDOW_ID_NONE;
  const tabs = await fetchTabsForWindow(windowId, window?.tabs);
  const serializedTabs = await Promise.all(tabs.map((tab) => serializeTabWithPreview(tab)));
  const basePayload = TabsListPayloadSchema.parse({
    windowId,
    tabs: serializedTabs
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
    console.warn(`[bridge-ext] No window info cached for windowId: ${windowInfo}`);
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
