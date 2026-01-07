import { TabDescriptorSchema } from "@bridge/shared-proto";

export const coerceLastAccessed = (tab: chrome.tabs.Tab): number => {
  // Chrome tabs have lastAccessed but @types/chrome doesn't include it
  const raw = (tab as chrome.tabs.Tab & { lastAccessed?: number }).lastAccessed;
  const value = typeof raw === "number" && Number.isFinite(raw) ? raw : Date.now();
  return Math.round(value);
};

export const serializeTab = (tab: chrome.tabs.Tab) => ({
  id: tab.id ?? undefined,
  url: tab.url ?? undefined,
  title: tab.title ?? undefined,
  favIconUrl: tab.favIconUrl ?? undefined,
  lastAccessed: coerceLastAccessed(tab),
  windowId: tab.windowId ?? undefined,
  index: tab.index ?? undefined,
  groupId: (tab as chrome.tabs.Tab & { groupId?: number }).groupId ?? undefined,
  pinned: tab.pinned ?? false
});

export const isValidUrl = (url: string): boolean => {
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
