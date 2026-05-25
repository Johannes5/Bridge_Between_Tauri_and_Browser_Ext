import type { TabDescriptor } from "shared-proto";

type PreviewImageKind = NonNullable<TabDescriptor["previewImageKind"]>;

type TabMediaInfo = Pick<
  TabDescriptor,
  "previewImageUrl" | "previewImageKind" | "channelName" | "videoDurationText" | "videoDurationSeconds"
>;

interface TabMediaCacheEntry extends TabMediaInfo {
  resolved: boolean;
  url?: string;
}

const tabMediaCache = new Map<number, TabMediaCacheEntry>();

const VIDEO_HOST_PATTERNS = [
  /(^|\.)youtube\.com$/i,
  /(^|\.)youtu\.be$/i,
  /(^|\.)vimeo\.com$/i,
  /(^|\.)dailymotion\.com$/i,
  /(^|\.)twitch\.tv$/i,
  /(^|\.)tiktok\.com$/i,
  /(^|\.)loom\.com$/i
];

const isHttpUrl = (value?: string | null): value is string => {
  if (!value) {
    return false;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const normalizeOptionalText = (value?: string | null): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : undefined;
};

const isLikelyVideoPlatform = (value?: string | null): boolean => {
  if (!value) {
    return false;
  }
  try {
    const host = new URL(value).hostname.replace(/^www\./i, "");
    return VIDEO_HOST_PATTERNS.some((pattern) => pattern.test(host));
  } catch {
    return false;
  }
};

const parseIso8601Duration = (value: string): number | undefined => {
  const match = value
    .trim()
    .match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i);
  if (!match) {
    return undefined;
  }

  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const seconds = Number(match[4] ?? 0);
  const total = days * 86400 + hours * 3600 + minutes * 60 + seconds;
  return total > 0 ? total : undefined;
};

const parseClockDuration = (value: string): number | undefined => {
  const parts = value
    .trim()
    .split(":")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length < 2 || parts.length > 4 || parts.some((part) => !/^\d+$/.test(part))) {
    return undefined;
  }

  const numbers = parts.map((part) => Number(part));
  let total = 0;
  for (const number of numbers) {
    total = total * 60 + number;
  }
  return total > 0 ? total : undefined;
};

const parseDurationToSeconds = (value?: string | number | null): number | undefined => {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : undefined;
  }

  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return undefined;
  }

  if (/^\d+(?:\.\d+)?$/.test(normalized)) {
    const seconds = Number(normalized);
    return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : undefined;
  }

  return parseIso8601Duration(normalized) ?? parseClockDuration(normalized);
};

const formatDuration = (seconds: number): string => {
  const totalSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const normalizePreviewInfo = (
  previewImageUrl?: string | null,
  previewImageKind?: PreviewImageKind
) => {
  if (!isHttpUrl(previewImageUrl)) {
    return undefined;
  }
  return {
    previewImageUrl,
    previewImageKind: previewImageKind ?? "title-image"
  };
};

const normalizeTabMediaInfo = (
  input?: Partial<TabMediaInfo> & { videoDuration?: string | number | null }
): TabMediaInfo | undefined => {
  if (!input) {
    return undefined;
  }

  const preview = normalizePreviewInfo(input.previewImageUrl, input.previewImageKind);
  const channelName = normalizeOptionalText(input.channelName);
  const videoDurationSeconds = parseDurationToSeconds(
    input.videoDurationSeconds ?? input.videoDuration
  );
  const rawDurationText =
    typeof input.videoDuration === "string" ? input.videoDuration : input.videoDurationText;
  const rawDurationLabel = normalizeOptionalText(rawDurationText);
  const videoDurationText =
    rawDurationLabel && !/^P/i.test(rawDurationLabel)
      ? rawDurationLabel
      : videoDurationSeconds != null
        ? formatDuration(videoDurationSeconds)
        : rawDurationLabel;

  const mediaInfo: TabMediaInfo = {
    ...(preview ?? {}),
    ...(channelName ? { channelName } : {}),
    ...(videoDurationText ? { videoDurationText } : {}),
    ...(videoDurationSeconds != null ? { videoDurationSeconds } : {})
  };

  return Object.keys(mediaInfo).length > 0 ? mediaInfo : undefined;
};

const readCachedMedia = (tab: chrome.tabs.Tab): TabMediaInfo | undefined => {
  if (tab.id == null) {
    return undefined;
  }
  const cached = tabMediaCache.get(tab.id);
  if (!cached || cached.url !== tab.url) {
    return undefined;
  }
  return normalizeTabMediaInfo(cached);
};

const hasResolvedMedia = (tab: chrome.tabs.Tab): boolean => {
  if (tab.id == null) {
    return false;
  }
  const cached = tabMediaCache.get(tab.id);
  return Boolean(cached && cached.url === tab.url && cached.resolved);
};

const cacheTabMedia = (tabId: number, url: string | undefined, media?: TabMediaInfo) => {
  tabMediaCache.set(tabId, {
    resolved: true,
    url,
    ...(media ?? {})
  });
};

const getYouTubeVideoId = (value: string): string | undefined => {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./i, "");
    let candidate: string | undefined;

    if (host === "youtu.be") {
      candidate = url.pathname.split("/").filter(Boolean)[0];
    } else if (host.endsWith("youtube.com")) {
      candidate =
        url.searchParams.get("v") ??
        url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/)?.[1];
    }

    if (!candidate) {
      return undefined;
    }
    return /^[\w-]{6,}$/.test(candidate) ? candidate : undefined;
  } catch {
    return undefined;
  }
};

const getUrlDerivedMedia = (tab: chrome.tabs.Tab): TabMediaInfo | undefined => {
  if (!tab.url) {
    return undefined;
  }

  const youtubeVideoId = getYouTubeVideoId(tab.url);
  if (youtubeVideoId) {
    return {
      previewImageUrl: `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`,
      previewImageKind: "video-thumbnail"
    };
  }

  return undefined;
};

const extractTabMediaFromPage = async (
  tabId: number
): Promise<TabMediaInfo | undefined> => {
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const normalizeText = (value) => {
          if (typeof value !== "string") {
            return undefined;
          }
          const normalized = value.replace(/\s+/g, " ").trim();
          return normalized.length > 0 ? normalized : undefined;
        };

        const readAttr = (selector: string, attr: string): string | undefined => {
          return normalizeText(document.querySelector(selector)?.getAttribute(attr) ?? undefined);
        };

        const readText = (selector: string): string | undefined => {
          return normalizeText((document.querySelector(selector)?.textContent ?? undefined));
        };

        const absoluteUrl = (value?: string): string | undefined => {
          if (!value) {
            return undefined;
          }
          try {
            const parsed = new URL(value, document.baseURI);
            return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : undefined;
          } catch {
            return undefined;
          }
        };

        const readJsonLdEntries = () => {
          const entries: Array<Record<string, unknown>> = [];
          const visit = (value: unknown) => {
            if (!value || typeof value !== "object") {
              return;
            }
            if (Array.isArray(value)) {
              value.forEach(visit);
              return;
            }

            const record = value as Record<string, unknown>;
            entries.push(record);
            const graph = record["@graph"];
            if (Array.isArray(graph)) {
              graph.forEach(visit);
            }
          };

          for (const node of Array.from(document.querySelectorAll("script[type='application/ld+json']"))) {
            const text = node.textContent?.trim();
            if (!text) {
              continue;
            }
            try {
              visit(JSON.parse(text));
            } catch {
              // ignore malformed JSON-LD blocks
            }
          }

          return entries;
        };

        const readName = (value: unknown): string | undefined => {
          if (typeof value === "string") {
            return normalizeText(value);
          }
          if (Array.isArray(value)) {
            for (const item of value) {
              const name = readName(item);
              if (name) {
                return name;
              }
            }
            return undefined;
          }
          if (!value || typeof value !== "object") {
            return undefined;
          }
          const record = value as Record<string, unknown>;
          return (
            readName(record.name) ??
            readName(record.alternateName) ??
            readName(record.creator) ??
            readName(record.author) ??
            readName(record.publisher)
          );
        };

        const jsonLdEntries = readJsonLdEntries();
        const videoJsonLd = jsonLdEntries.find((entry) => {
          const type = entry["@type"];
          return Array.isArray(type)
            ? type.some((candidate) => candidate === "VideoObject")
            : type === "VideoObject";
        });

        const ogType = readAttr("meta[property='og:type']", "content")?.toLowerCase();
        const twitterCard = readAttr("meta[name='twitter:card']", "content")?.toLowerCase();
        const videoPoster = absoluteUrl(readAttr("video[poster]", "poster"));
        const jsonLdThumbnail = (() => {
          if (!videoJsonLd) {
            return undefined;
          }
          const raw = videoJsonLd.thumbnailUrl;
          if (typeof raw === "string") {
            return absoluteUrl(raw);
          }
          if (Array.isArray(raw)) {
            for (const item of raw) {
              if (typeof item === "string") {
                const absolute = absoluteUrl(item);
                if (absolute) {
                  return absolute;
                }
              }
            }
          }
          return undefined;
        })();

        const previewImageUrl = [
          videoPoster,
          jsonLdThumbnail,
          absoluteUrl(readAttr("meta[property='og:image:secure_url']", "content")),
          absoluteUrl(readAttr("meta[property='og:image:url']", "content")),
          absoluteUrl(readAttr("meta[property='og:image']", "content")),
          absoluteUrl(readAttr("meta[name='twitter:image:src']", "content")),
          absoluteUrl(readAttr("meta[name='twitter:image']", "content")),
          absoluteUrl(readAttr("meta[itemprop='image']", "content")),
          absoluteUrl(readAttr("link[rel='image_src']", "href"))
        ].find((candidate) => Boolean(candidate));

        if (!previewImageUrl) {
          return undefined;
        }

        const isVideoLikePage =
          Boolean(videoPoster) ||
          Boolean(videoJsonLd) ||
          Boolean(ogType?.includes("video")) ||
          twitterCard === "player";

        const videoElementDuration =
          typeof document.querySelector("video")?.duration === "number" &&
          Number.isFinite(document.querySelector("video")?.duration)
            ? document.querySelector("video")?.duration
            : undefined;

        const videoDuration =
          videoElementDuration ??
          readAttr("meta[property='video:duration']", "content") ??
          readAttr("meta[property='og:video:duration']", "content") ??
          readAttr("meta[itemprop='duration']", "content") ??
          readText("ytd-thumbnail-overlay-time-status-renderer #text") ??
          readText("[data-e2e='video-duration']") ??
          (typeof videoJsonLd?.duration === "string" || typeof videoJsonLd?.duration === "number"
            ? videoJsonLd.duration
            : undefined);

        const channelName =
          readText("#owner #channel-name a") ??
          readText("ytd-channel-name a") ??
          readText("ytd-channel-name yt-formatted-string") ??
          readAttr("link[itemprop='name']", "content") ??
          readAttr("meta[itemprop='author']", "content") ??
          readAttr("meta[name='author']", "content") ??
          readAttr("meta[name='twitter:creator']", "content") ??
          readName(videoJsonLd?.author) ??
          readName(videoJsonLd?.creator) ??
          readName(videoJsonLd?.publisher);

        return {
          previewImageUrl,
          previewImageKind: isVideoLikePage ? "video-thumbnail" : "title-image",
          channelName,
          videoDuration
        };
      }
    });

    const result = injection?.result;
    if (!result || typeof result !== "object") {
      return undefined;
    }

    const previewImageUrl =
      "previewImageUrl" in result && typeof result.previewImageUrl === "string"
        ? result.previewImageUrl
        : undefined;
    const previewImageKind =
      "previewImageKind" in result &&
      (result.previewImageKind === "video-thumbnail" || result.previewImageKind === "title-image")
        ? result.previewImageKind
        : undefined;
    const channelName =
      "channelName" in result && typeof result.channelName === "string"
        ? result.channelName
        : undefined;
    const videoDuration =
      "videoDuration" in result &&
      (typeof result.videoDuration === "string" || typeof result.videoDuration === "number")
        ? result.videoDuration
        : undefined;

    return normalizeTabMediaInfo({
      previewImageUrl,
      previewImageKind,
      channelName,
      videoDuration
    });
  } catch {
    return undefined;
  }
};

export const coerceLastAccessed = (tab: chrome.tabs.Tab): number => {
  // Chrome tabs have lastAccessed but @types/chrome doesn't include it
  const raw = (tab as chrome.tabs.Tab & { lastAccessed?: number }).lastAccessed;
  const value = typeof raw === "number" && Number.isFinite(raw) ? raw : Date.now();
  return Math.round(value);
};

export const serializeTab = (tab: chrome.tabs.Tab): TabDescriptor => ({
  id: tab.id ?? undefined,
  url: tab.url ?? undefined,
  title: tab.title ?? undefined,
  favIconUrl: tab.favIconUrl ?? undefined,
  ...readCachedMedia(tab),
  lastAccessed: coerceLastAccessed(tab),
  windowId: tab.windowId ?? undefined,
  index: tab.index ?? undefined,
  groupId: (tab as chrome.tabs.Tab & { groupId?: number }).groupId ?? undefined,
  pinned: tab.pinned ?? false
});

export const serializeTabWithPreview = async (tab: chrome.tabs.Tab): Promise<TabDescriptor> => {
  const base = serializeTab(tab);

  if (tab.id == null || !isHttpUrl(tab.url)) {
    return base;
  }

  if (hasResolvedMedia(tab)) {
    return base;
  }

  const urlDerivedMedia = getUrlDerivedMedia(tab);
  if (tab.status !== "complete") {
    return urlDerivedMedia
      ? {
          ...base,
          ...urlDerivedMedia
        }
      : base;
  }

  const pageMedia = await extractTabMediaFromPage(tab.id);
  const resolvedMedia = normalizeTabMediaInfo({
    ...(urlDerivedMedia ?? {}),
    ...(pageMedia ?? {}),
    previewImageKind:
      (pageMedia?.previewImageKind ?? urlDerivedMedia?.previewImageKind) === "title-image" &&
      isLikelyVideoPlatform(tab.url)
        ? "video-thumbnail"
        : pageMedia?.previewImageKind ?? urlDerivedMedia?.previewImageKind
  });
  cacheTabMedia(tab.id, tab.url, resolvedMedia);

  if (!resolvedMedia) {
    return base;
  }

  return {
    ...base,
    ...resolvedMedia
  };
};

export const clearTabMediaCache = (tabId: number) => {
  tabMediaCache.delete(tabId);
};

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
