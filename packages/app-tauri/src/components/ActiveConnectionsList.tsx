import * as React from "react";
import {
  Globe,
  Pencil,
  Save,
  Cherry,
  Banana,
  Cookie,
  IceCream,
  Pizza,
  Coffee,
  Croissant,
  Apple,
  Carrot,
  Grape,
  Cake,
  Donut,
  Soup,
  Beer,
  Wine,
  Cat,
  Dog,
  Bird,
  Fish,
  Rabbit,
  Turtle,
  Sparkles,
  Star,
  Heart,
  Flame,
  Rocket,
  Music,
  Palette,
  Gamepad2,
  Diamond,
  Flower,
  Leaf,
  type LucideIcon
} from "lucide-react";
import { toast } from "sonner";
import type { BrowserTabSnapshot } from "../types";
import type { TabDescriptor } from "shared-proto";
import { BrowserIcon } from "./BrowserIcon";
import { ControlToggle } from "./ControlToggle";
import { DateGroupingToggle } from "./DateGroupingToggle";
import { DateStampBadge } from "./DateStampBadge";
import { ImageDisplayModeToggle, type ImageDisplayMode } from "./ImageDisplayModeToggle";
import { MasonryWidthControl } from "./MasonryWidthControl";
import { TabPreviewImage } from "./TabPreviewImage";
import { TabVideoMeta } from "./TabVideoMeta";
import { TabHoverTooltip } from "./TabHoverTooltip";
import { ViewModeToggle, type ViewMode } from "./ViewModeToggle";
import { groupItemsByDay } from "../utils/dateGroups";
import { HighlightText, normalizeSearchQuery, tabMatchesSearch, textMatchesSearch } from "./SearchHighlight";

// Pool of fun icons used as the per-window emblem. In the real app the user
// will be able to pick one from a library; for now we hash the windowId so
// the same window always gets the same icon across refreshes.
const WINDOW_ICONS: LucideIcon[] = [
  Cherry,
  Banana,
  Cookie,
  IceCream,
  Pizza,
  Coffee,
  Croissant,
  Apple,
  Carrot,
  Grape,
  Cake,
  Donut,
  Soup,
  Beer,
  Wine,
  Cat,
  Dog,
  Bird,
  Fish,
  Rabbit,
  Turtle,
  Sparkles,
  Star,
  Heart,
  Flame,
  Rocket,
  Music,
  Palette,
  Gamepad2,
  Diamond,
  Flower,
  Leaf
];

const getWindowIcon = (windowId: number): LucideIcon => {
  const idx = Math.abs(windowId) % WINDOW_ICONS.length;
  return WINDOW_ICONS[idx] ?? Sparkles;
};

const getDomain = (url?: string | null): string => {
  if (!url) return "";
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const formatTime = (ms?: number | null): string => {
  if (!ms) return "unknown";
  return new Date(ms).toLocaleTimeString();
};

const DEFAULT_VIEW_MODE: ViewMode = "grid";
const DEFAULT_GROUP_BY_DATE = true;
const DEFAULT_GROUP_BY_WINDOW = true;
const DEFAULT_IMAGE_DISPLAY_MODE: ImageDisplayMode = "large";
const DEFAULT_THUMBNAILS_ONLY = true;
const DEFAULT_COLUMN_WIDTH = 300;

interface ViewSettings {
  groupByDate: boolean;
  groupByWindow: boolean;
  imageDisplayMode: ImageDisplayMode;
  thumbnailsOnly: boolean;
  columnWidth: number;
}

const DEFAULT_VIEW_SETTINGS: Record<ViewMode, ViewSettings> = {
  list: {
    groupByDate: DEFAULT_GROUP_BY_DATE,
    groupByWindow: DEFAULT_GROUP_BY_WINDOW,
    imageDisplayMode: DEFAULT_IMAGE_DISPLAY_MODE,
    thumbnailsOnly: DEFAULT_THUMBNAILS_ONLY,
    columnWidth: DEFAULT_COLUMN_WIDTH
  },
  grid: {
    groupByDate: DEFAULT_GROUP_BY_DATE,
    groupByWindow: DEFAULT_GROUP_BY_WINDOW,
    imageDisplayMode: DEFAULT_IMAGE_DISPLAY_MODE,
    thumbnailsOnly: DEFAULT_THUMBNAILS_ONLY,
    columnWidth: DEFAULT_COLUMN_WIDTH
  }
};

const shouldShowPreviewImage = (tab: TabDescriptor, thumbnailsOnly: boolean): boolean =>
  !thumbnailsOnly || tab.previewImageKind === "video-thumbnail";

interface CurrentSessionWindow {
  key: string;
  windowId?: number;
  windowIndex?: number;
  label?: string;
  tabs: TabDescriptor[];
  browser: string;
  connectionId: string;
  lastUpdate: number;
  firstSeenAt?: number;
}

interface CurrentSessionTabItem {
  key: string;
  tab: TabDescriptor;
  browser: string;
  connectionId: string;
  preferWindowId?: number;
  timestamp: number;
}

const getSnapshotWindows = (snapshot: BrowserTabSnapshot): CurrentSessionWindow[] => {
  const map = new Map<number, TabDescriptor[]>();
  const orphans: TabDescriptor[] = [];

  for (const tab of snapshot.payload.tabs) {
    if (tab.windowId != null) {
      const list = map.get(tab.windowId) ?? [];
      list.push(tab);
      map.set(tab.windowId, list);
    } else {
      orphans.push(tab);
    }
  }

  const windows: CurrentSessionWindow[] = Array.from(map.keys())
    .sort((a, b) => a - b)
    .map((windowId, idx) => ({
      key: `${snapshot.connectionId}-${windowId}`,
      windowId,
      windowIndex: idx + 1,
      tabs: map.get(windowId) ?? [],
      browser: snapshot.browser,
      connectionId: snapshot.connectionId,
      lastUpdate: snapshot.lastUpdate
    }));

  if (orphans.length > 0) {
    windows.push({
      key: `${snapshot.connectionId}-orphans`,
      label: "Other Tabs",
      tabs: orphans,
      browser: snapshot.browser,
      connectionId: snapshot.connectionId,
      lastUpdate: snapshot.lastUpdate
    });
  }

  return windows;
};

interface ActiveConnectionsListProps {
  snapshots: BrowserTabSnapshot[];
  isSending: boolean;
  extensionStatus?: string;
  onSaveTabs: (
    tabs: TabDescriptor[],
    meta: { browser: string; connectionId: string; windowId?: number | null }
  ) => void;
  onFocusTab: (
    tab: TabDescriptor,
    options?: { connectionId?: string; preferWindowId?: number }
  ) => void;
  filterQuery?: string;
  findQuery?: string;
}

export const ActiveConnectionsList: React.FC<ActiveConnectionsListProps> = ({
  snapshots,
  isSending,
  extensionStatus,
  onSaveTabs,
  onFocusTab,
  filterQuery = "",
  findQuery = ""
}) => {
  const [isInitializing, setIsInitializing] = React.useState(true);
  const [viewMode, setViewMode] = React.useState<ViewMode>(DEFAULT_VIEW_MODE);
  const [viewSettingsByMode, setViewSettingsByMode] = React.useState<Record<ViewMode, ViewSettings>>(
    DEFAULT_VIEW_SETTINGS
  );
  const firstSeenRef = React.useRef(new Map<string, number>());
  const currentViewSettings = viewSettingsByMode[viewMode];
  const { groupByDate, groupByWindow, imageDisplayMode, thumbnailsOnly, columnWidth } =
    currentViewSettings;
  const normalizedFilterQuery = React.useMemo(() => normalizeSearchQuery(filterQuery), [filterQuery]);
  const hasFilter = normalizedFilterQuery.length > 0;
  const highlightQuery = hasFilter ? filterQuery : findQuery;
  const effectiveGroupByWindow = groupByWindow || hasFilter;
  const masonryStyle = React.useMemo(
    () => ({ ["--masonry-column-width" as string]: `${columnWidth}px` }) as React.CSSProperties,
    [columnWidth]
  );

  const sessionWindows = React.useMemo(() => {
    const windows = snapshots.flatMap((snapshot) => getSnapshotWindows(snapshot)).map((window) => {
      const existingFirstSeen = firstSeenRef.current.get(window.key);
      const firstSeenAt = existingFirstSeen ?? Date.now();
      if (existingFirstSeen == null) {
        firstSeenRef.current.set(window.key, firstSeenAt);
      }
      return { ...window, firstSeenAt };
    });

    const visibleKeys = new Set(windows.map((window) => window.key));
    for (const key of Array.from(firstSeenRef.current.keys())) {
      if (!visibleKeys.has(key)) {
        firstSeenRef.current.delete(key);
      }
    }

    return windows;
  }, [snapshots]);

  const windowMatchesFilter = React.useCallback((window: CurrentSessionWindow, query: string) => {
    if (!query) return true;
    const label = window.label ?? `Window ${window.windowIndex ?? "?"}`;
    return (
      textMatchesSearch(
        [label, window.browser, window.connectionId, window.windowId, formatTime(window.lastUpdate)],
        query
      ) || window.tabs.some((tab) => tabMatchesSearch(tab, query))
    );
  }, []);

  const visibleSessionWindows = React.useMemo(
    () => sessionWindows.filter((window) => windowMatchesFilter(window, normalizedFilterQuery)),
    [normalizedFilterQuery, sessionWindows, windowMatchesFilter]
  );

  const sessionTabs = React.useMemo(
    () =>
      visibleSessionWindows.flatMap((window) =>
        window.tabs.map((tab, index) => ({
          key: `${window.key}-${tab.id ?? tab.url ?? index}`,
          tab,
          browser: window.browser,
          connectionId: window.connectionId,
          preferWindowId: window.windowId,
          timestamp: window.firstSeenAt ?? window.lastUpdate
        }))
      ),
    [visibleSessionWindows]
  );

  React.useEffect(() => {
    if (extensionStatus === "online") {
      setIsInitializing(false);
      return;
    }
    const timer = setTimeout(() => setIsInitializing(false), 1500);
    return () => clearTimeout(timer);
  }, [extensionStatus]);

  const updateCurrentViewSettings = React.useCallback(
    (updater: Partial<ViewSettings> | ((prev: ViewSettings) => ViewSettings)) => {
      setViewSettingsByMode((prev) => {
        const current = prev[viewMode];
        const next =
          typeof updater === "function" ? updater(current) : { ...current, ...updater };
        return { ...prev, [viewMode]: next };
      });
    },
    [viewMode]
  );

  const handleGroupByDateChange = React.useCallback((enabled: boolean) => {
    updateCurrentViewSettings((prev) => ({
      ...prev,
      groupByDate: enabled,
      groupByWindow: enabled ? prev.groupByWindow : true
    }));
  }, [updateCurrentViewSettings]);

  const handleGroupByWindowChange = React.useCallback((enabled: boolean) => {
    updateCurrentViewSettings((prev) => ({
      ...prev,
      groupByWindow: enabled,
      groupByDate: enabled ? prev.groupByDate : true
    }));
  }, [updateCurrentViewSettings]);

  const showLoader = isInitializing || extensionStatus !== "online";

  if (snapshots.length === 0) {
    if (showLoader) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-gray-700 border-t-gray-300 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400 font-medium animate-pulse">
            {extensionStatus === "online" ? "Syncing tabs..." : "Waiting for extension connection..."}
          </p>
          <p className="text-xs text-gray-600 mt-2">
            {extensionStatus === "online" ? "Just a moment." : "Make sure your browser is open."}
          </p>
        </div>
      );
    }

    return (
      <p className="text-gray-500 text-sm">
        No browser connections yet. Make sure your browser extension is connected.
      </p>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <DateGroupingToggle enabled={groupByDate} onChange={handleGroupByDateChange} />
          <ControlToggle
            label="By Window"
            enabled={groupByWindow}
            onChange={handleGroupByWindowChange}
            disabled={!groupByDate}
            title={!groupByDate ? "Requires By Date" : undefined}
          />
          <ImageDisplayModeToggle
            value={imageDisplayMode}
            onChange={(mode) => updateCurrentViewSettings({ imageDisplayMode: mode })}
          />
          <ControlToggle
            label="Thumbnails Only"
            enabled={thumbnailsOnly}
            onChange={(enabled) => updateCurrentViewSettings({ thumbnailsOnly: enabled })}
            disabled={imageDisplayMode === "none"}
            title={imageDisplayMode === "none" ? "Requires images" : undefined}
          />
          {viewMode === "grid" && (
            <MasonryWidthControl
              value={columnWidth}
              onChange={(value) => updateCurrentViewSettings({ columnWidth: value })}
            />
          )}
        </div>
        <ViewModeToggle value={viewMode} onChange={setViewMode} className="ml-auto" />
      </div>

      {!groupByDate && viewMode === "list" && (
        <div className="space-y-8">
          {hasFilter ? (
            visibleSessionWindows.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No current windows match the filter.</p>
            ) : (
              visibleSessionWindows.map((window) => (
                <WindowCard
                  key={window.key}
                  window={window}
                  layout="list"
                  isSending={isSending}
                  imageDisplayMode={imageDisplayMode}
                  thumbnailsOnly={thumbnailsOnly}
                  findQuery={findQuery}
                  highlightQuery={highlightQuery}
                  onSave={onSaveTabs}
                  onFocus={onFocusTab}
                />
              ))
            )
          ) : (
            snapshots.map((snapshot) => (
              <ConnectionCard
                key={snapshot.connectionId}
                snapshot={snapshot}
                isSending={isSending}
                imageDisplayMode={imageDisplayMode}
                thumbnailsOnly={thumbnailsOnly}
                findQuery={findQuery}
                highlightQuery={highlightQuery}
                onSave={onSaveTabs}
                onFocus={onFocusTab}
              />
            ))
          )}
        </div>
      )}

      {!groupByDate && viewMode === "grid" && (
        <CurrentSessionGrid
          windows={visibleSessionWindows}
          masonryStyle={masonryStyle}
          isSending={isSending}
          imageDisplayMode={imageDisplayMode}
          thumbnailsOnly={thumbnailsOnly}
          findQuery={findQuery}
          highlightQuery={highlightQuery}
          onSave={onSaveTabs}
          onFocus={onFocusTab}
        />
      )}

      {groupByDate && (
        <CurrentSessionDateGroups
          windows={visibleSessionWindows}
          tabs={sessionTabs}
          viewMode={viewMode}
          masonryStyle={masonryStyle}
          isSending={isSending}
          imageDisplayMode={imageDisplayMode}
          thumbnailsOnly={thumbnailsOnly}
          groupByWindow={effectiveGroupByWindow}
          findQuery={findQuery}
          highlightQuery={highlightQuery}
          onSave={onSaveTabs}
          onFocus={onFocusTab}
        />
      )}
    </section>
  );
};

interface ConnectionCardProps {
  snapshot: BrowserTabSnapshot;
  isSending: boolean;
  imageDisplayMode: ImageDisplayMode;
  thumbnailsOnly: boolean;
  findQuery: string;
  highlightQuery: string;
  onSave: (
    tabs: TabDescriptor[],
    meta: { browser: string; connectionId: string; windowId?: number | null }
  ) => void;
  onFocus: (
    tab: TabDescriptor,
    options?: { connectionId?: string; preferWindowId?: number }
  ) => void;
}

const ConnectionCard: React.FC<ConnectionCardProps> = ({
  snapshot,
  isSending,
  imageDisplayMode,
  thumbnailsOnly,
  findQuery,
  highlightQuery,
  onSave,
  onFocus
}) => {
  const { byWindow, orphans } = React.useMemo(() => {
    const map = new Map<number, TabDescriptor[]>();
    const orphanList: TabDescriptor[] = [];
    for (const tab of snapshot.payload.tabs) {
      if (tab.windowId != null) {
        const list = map.get(tab.windowId) ?? [];
        list.push(tab);
        map.set(tab.windowId, list);
      } else {
        orphanList.push(tab);
      }
    }
    return { byWindow: map, orphans: orphanList };
  }, [snapshot.payload.tabs]);

  const sortedWindowIds = React.useMemo(
    () => Array.from(byWindow.keys()).sort((a, b) => a - b),
    [byWindow]
  );

  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center mb-1">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-200">
          <BrowserIcon browser={snapshot.browser} className="w-4 h-4" />
          <span>Current Tabs - {snapshot.browser}</span>
        </h2>
        <span className="text-xs text-gray-500 font-mono">
          Last update: {formatTime(snapshot.lastUpdate)}
        </span>
      </div>
      <div className="text-xs text-gray-500 font-mono mb-2">
        Connection: {snapshot.connectionId}
      </div>

      {snapshot.payload.tabs.length === 0 ? (
        <p className="text-gray-500 text-sm italic">No tabs available.</p>
      ) : (
        <div className="space-y-3 ml-4">
          {sortedWindowIds.map((windowId, idx) => (
            <WindowGroup
              key={windowId}
              windowId={windowId}
              windowIndex={idx + 1}
              tabs={byWindow.get(windowId) ?? []}
              browser={snapshot.browser}
              connectionId={snapshot.connectionId}
              isSending={isSending}
              imageDisplayMode={imageDisplayMode}
              thumbnailsOnly={thumbnailsOnly}
              findQuery={findQuery}
              highlightQuery={highlightQuery}
              onSave={onSave}
              onFocus={onFocus}
            />
          ))}

          {orphans.length > 0 && (
            <WindowGroup
              label="Other Tabs"
              tabs={orphans}
              browser={snapshot.browser}
              connectionId={snapshot.connectionId}
              isSending={isSending}
              imageDisplayMode={imageDisplayMode}
              thumbnailsOnly={thumbnailsOnly}
              findQuery={findQuery}
              highlightQuery={highlightQuery}
              onSave={onSave}
              onFocus={onFocus}
            />
          )}
        </div>
      )}
    </section>
  );
};

const CurrentSessionGrid: React.FC<{
  windows: CurrentSessionWindow[];
  masonryStyle: React.CSSProperties;
  isSending: boolean;
  imageDisplayMode: ImageDisplayMode;
  thumbnailsOnly: boolean;
  findQuery: string;
  highlightQuery: string;
  onSave: (
    tabs: TabDescriptor[],
    meta: { browser: string; connectionId: string; windowId?: number | null }
  ) => void;
  onFocus: (
    tab: TabDescriptor,
    options?: { connectionId?: string; preferWindowId?: number }
  ) => void;
}> = ({
  windows,
  masonryStyle,
  isSending,
  imageDisplayMode,
  thumbnailsOnly,
  findQuery,
  highlightQuery,
  onSave,
  onFocus
}) => {
  if (windows.length === 0) {
    return <p className="text-gray-500 text-sm italic">No tabs available.</p>;
  }

  return (
    <div className="masonry-layout" style={masonryStyle}>
      {windows.map((window) => (
        <WindowCard
          key={window.key}
          window={window}
          layout="grid"
          isSending={isSending}
          imageDisplayMode={imageDisplayMode}
          thumbnailsOnly={thumbnailsOnly}
          findQuery={findQuery}
          highlightQuery={highlightQuery}
          onSave={onSave}
          onFocus={onFocus}
        />
      ))}
    </div>
  );
};

const CurrentSessionDateGroups: React.FC<{
  windows: CurrentSessionWindow[];
  tabs: CurrentSessionTabItem[];
  viewMode: ViewMode;
  masonryStyle: React.CSSProperties;
  isSending: boolean;
  imageDisplayMode: ImageDisplayMode;
  thumbnailsOnly: boolean;
  groupByWindow: boolean;
  findQuery: string;
  highlightQuery: string;
  onSave: (
    tabs: TabDescriptor[],
    meta: { browser: string; connectionId: string; windowId?: number | null }
  ) => void;
  onFocus: (
    tab: TabDescriptor,
    options?: { connectionId?: string; preferWindowId?: number }
  ) => void;
}> = ({
  windows,
  tabs,
  viewMode,
  masonryStyle,
  isSending,
  imageDisplayMode,
  thumbnailsOnly,
  groupByWindow,
  findQuery,
  highlightQuery,
  onSave,
  onFocus
}) => {
  const groupedWindows = React.useMemo(
    () =>
      groupItemsByDay(windows, (window) => window.firstSeenAt ?? window.lastUpdate).map((group) => ({
        ...group,
        items: [...group.items].sort(
          (a, b) => (b.firstSeenAt ?? b.lastUpdate) - (a.firstSeenAt ?? a.lastUpdate)
        )
      })),
    [windows]
  );

  const groupedTabs = React.useMemo(
    () =>
      groupItemsByDay(tabs, (item) => item.timestamp).map((group) => ({
        ...group,
        items: [...group.items].sort(
          (a, b) =>
            b.timestamp - a.timestamp || (b.tab.lastAccessed ?? 0) - (a.tab.lastAccessed ?? 0)
        )
      })),
    [tabs]
  );

  if (groupByWindow && groupedWindows.length === 0) {
    return <p className="text-gray-500 text-sm italic">No tabs available.</p>;
  }

  if (!groupByWindow && groupedTabs.length === 0) {
    return <p className="text-gray-500 text-sm italic">No tabs available.</p>;
  }

  if (groupByWindow) {
    return (
      <div className="space-y-14">
        {groupedWindows.map((group) => (
          <section key={group.dayStart} className="space-y-6">
            <DateStampBadge timestamp={group.dayStart} />
            {viewMode === "grid" ? (
              <div className="masonry-layout" style={masonryStyle}>
                {group.items.map((window) => (
                  <WindowCard
                    key={window.key}
                    window={window}
                    layout="grid"
                    isSending={isSending}
                    imageDisplayMode={imageDisplayMode}
                    thumbnailsOnly={thumbnailsOnly}
                    findQuery={findQuery}
                    highlightQuery={highlightQuery}
                    onSave={onSave}
                    onFocus={onFocus}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {group.items.map((window) => (
                  <WindowCard
                    key={window.key}
                    window={window}
                    layout="list"
                    isSending={isSending}
                    imageDisplayMode={imageDisplayMode}
                    thumbnailsOnly={thumbnailsOnly}
                    findQuery={findQuery}
                    highlightQuery={highlightQuery}
                    onSave={onSave}
                    onFocus={onFocus}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-14">
      {groupedTabs.map((group) => (
        <section key={group.dayStart} className="space-y-6">
          <DateStampBadge timestamp={group.dayStart} />
          {viewMode === "grid" ? (
            <ul className="masonry-layout list-none m-0 p-0" style={masonryStyle}>
              {group.items.map((item) => (
                <TabRow
                  key={item.key}
                  className="masonry-item"
                  tab={item.tab}
                  connectionId={item.connectionId}
                  preferWindowId={item.preferWindowId}
                  isSending={isSending}
                  imageDisplayMode={imageDisplayMode}
                  thumbnailsOnly={thumbnailsOnly}
                  findQuery={findQuery}
                  highlightQuery={highlightQuery}
                  onFocus={onFocus}
                />
              ))}
            </ul>
          ) : (
            <ul className="space-y-2">
              {group.items.map((item) => (
                <TabRow
                  key={item.key}
                  tab={item.tab}
                  connectionId={item.connectionId}
                  preferWindowId={item.preferWindowId}
                  isSending={isSending}
                  imageDisplayMode={imageDisplayMode}
                  thumbnailsOnly={thumbnailsOnly}
                  findQuery={findQuery}
                  highlightQuery={highlightQuery}
                  onFocus={onFocus}
                />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
};

const WindowCard: React.FC<{
  window: CurrentSessionWindow;
  layout: "grid" | "list";
  isSending: boolean;
  imageDisplayMode: ImageDisplayMode;
  thumbnailsOnly: boolean;
  findQuery: string;
  highlightQuery: string;
  onSave: (
    tabs: TabDescriptor[],
    meta: { browser: string; connectionId: string; windowId?: number | null }
  ) => void;
  onFocus: (
    tab: TabDescriptor,
    options?: { connectionId?: string; preferWindowId?: number }
  ) => void;
}> = ({
  window,
  layout,
  isSending,
  imageDisplayMode,
  thumbnailsOnly,
  findQuery,
  highlightQuery,
  onSave,
  onFocus
}) => {
  const WindowIcon = window.windowId != null ? getWindowIcon(window.windowId) : null;
  const displayLabel = window.label ?? `Window ${window.windowIndex ?? "?"}`;
  const cardClass =
    layout === "grid"
      ? "masonry-item rounded-xl border border-[#16161a] bg-[#141414] p-3"
      : "rounded-xl border border-[#16161a] bg-[#141414] p-3";

  return (
    <article className={cardClass}>
      <div className="flex items-start gap-2">
        <BrowserIcon browser={window.browser} className="w-4 h-4 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-100 truncate">
              <HighlightText text={displayLabel} query={highlightQuery} />
            </h3>
            {WindowIcon && <WindowIcon className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500 font-mono">
            <span>{window.browser}</span>
            <span>•</span>
            <span>{window.tabs.length} tab{window.tabs.length === 1 ? "" : "s"}</span>
            <span>•</span>
            <span>{formatTime(window.lastUpdate)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            onSave(window.tabs, {
              browser: window.browser,
              connectionId: window.connectionId,
              windowId: window.windowId ?? null
            })
          }
          disabled={window.tabs.length === 0}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-300 hover:text-gray-100 hover:bg-[#202020] rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Save all tabs in this window"
        >
          <Save className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Save</span>
        </button>
      </div>

      <ul className={`mt-3 ${imageDisplayMode === "none" ? "space-y-1" : "space-y-2.5"}`}>
        {window.tabs.map((tab) => (
          <TabRow
            key={`${tab.id ?? tab.url}`}
            tab={tab}
            connectionId={window.connectionId}
            preferWindowId={window.windowId}
            isSending={isSending}
            imageDisplayMode={imageDisplayMode}
            thumbnailsOnly={thumbnailsOnly}
            findQuery={findQuery}
            highlightQuery={highlightQuery}
            onFocus={onFocus}
          />
        ))}
      </ul>
    </article>
  );
};

interface WindowGroupProps {
  /** Sequential 1-based index used to render "Window N". Required when windowId is given. */
  windowIndex?: number;
  /** Chrome window id, when known. Used to pick a stable per-window icon and to forward as preferWindowId. */
  windowId?: number;
  /** Override label (used for the "Other Tabs" orphan group). */
  label?: string;
  tabs: TabDescriptor[];
  browser: string;
  connectionId: string;
  isSending: boolean;
  imageDisplayMode: ImageDisplayMode;
  thumbnailsOnly: boolean;
  findQuery: string;
  highlightQuery: string;
  onSave: (
    tabs: TabDescriptor[],
    meta: { browser: string; connectionId: string; windowId?: number | null }
  ) => void;
  onFocus: (
    tab: TabDescriptor,
    options?: { connectionId?: string; preferWindowId?: number }
  ) => void;
}

const WindowGroup: React.FC<WindowGroupProps> = ({
  windowIndex,
  windowId,
  label,
  tabs,
  browser,
  connectionId,
  isSending,
  imageDisplayMode,
  thumbnailsOnly,
  findQuery,
  highlightQuery,
  onSave,
  onFocus
}) => {
  const WindowIcon = windowId != null ? getWindowIcon(windowId) : null;
  const displayLabel = label ?? `Window ${windowIndex ?? "?"}`;

  const handleRenameWindow = () => {
    toast.info(`Rename "${displayLabel}" — coming soon`);
  };

  return (
    <div>
      {/* Window header */}
      <div className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-purple-500/10 transition-colors">
        <BrowserIcon browser={browser} className="w-4 h-4" />
        <HighlightText className="text-gray-100 font-medium" text={displayLabel} query={highlightQuery} />
        {WindowIcon && <WindowIcon className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />}

        <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onSave(tabs, { browser, connectionId, windowId: windowId ?? null })}
            disabled={tabs.length === 0}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-300 hover:text-purple-100 hover:bg-purple-500/12 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Save all tabs in this window"
          >
            <Save className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Save Window</span>
          </button>
          <button
            type="button"
            onClick={handleRenameWindow}
            className="p-1 text-gray-400 hover:text-purple-100 hover:bg-purple-500/12 rounded transition-colors"
            title="Rename / change icon"
            aria-label={`Rename ${displayLabel}`}
          >
            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Tab list */}
      <ul className={`mt-1 ml-5 ${imageDisplayMode === "none" ? "space-y-0.5" : "space-y-2.5"}`}>
        {tabs.map((tab) => (
          <TabRow
            key={`${tab.id ?? tab.url}`}
            tab={tab}
            connectionId={connectionId}
            preferWindowId={windowId}
            isSending={isSending}
            imageDisplayMode={imageDisplayMode}
            thumbnailsOnly={thumbnailsOnly}
            findQuery={findQuery}
            highlightQuery={highlightQuery}
            onFocus={onFocus}
          />
        ))}
      </ul>
    </div>
  );
};

interface TabRowProps {
  tab: TabDescriptor;
  connectionId: string;
  preferWindowId?: number;
  isSending: boolean;
  imageDisplayMode: ImageDisplayMode;
  thumbnailsOnly: boolean;
  className?: string;
  findQuery: string;
  highlightQuery: string;
  onFocus: (
    tab: TabDescriptor,
    options?: { connectionId?: string; preferWindowId?: number }
  ) => void;
}

const TabRow: React.FC<TabRowProps> = ({
  tab,
  connectionId,
  preferWindowId,
  isSending,
  imageDisplayMode,
  thumbnailsOnly,
  className = "",
  findQuery,
  highlightQuery,
  onFocus
}) => {
  const domain = getDomain(tab.url);
  const disabled = !tab.url || isSending;
  const isSmallImage = imageDisplayMode === "small";
  const isLargeImage = imageDisplayMode === "large";
  const durationOverlayText = isLargeImage ? tab.videoDurationText : undefined;
  const allowPreviewImage = shouldShowPreviewImage(tab, thumbnailsOnly);
  const matchesFind = normalizeSearchQuery(findQuery).length > 0 && tabMatchesSearch(tab, findQuery);
  const shouldShowMatchedUrl =
    normalizeSearchQuery(highlightQuery).length > 0 && !!tab.url && textMatchesSearch([tab.url], highlightQuery);

  const handleFocus = () => {
    if (disabled) return;
    onFocus(tab, { connectionId, preferWindowId });
  };

  const handleKey = (e: React.KeyboardEvent<HTMLLIElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleFocus();
    }
  };

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.info(`Rename "${tab.title ?? tab.url ?? "tab"}" — coming soon`);
  };

  return (
    <li
      data-find-match={matchesFind ? "true" : undefined}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={`Focus tab ${tab.title ?? tab.url ?? "Untitled"}`}
      onClick={handleFocus}
      onKeyDown={handleKey}
      className={`group relative rounded-md transition-colors ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer hover:bg-purple-500/10 focus:bg-purple-500/10 focus:outline-hidden"
      } ${className}`}
    >
      <div className={isLargeImage ? "flex flex-col gap-3 px-2 py-2" : "flex items-center gap-3 px-2 py-1.5"}>
        {isLargeImage && (
          <TabPreviewImage
            tab={tab}
            className="h-40 w-full shrink-0"
            durationOverlayText={durationOverlayText}
            hideWhenEmpty
            showImage={allowPreviewImage}
          />
        )}
        {isSmallImage && (
          <TabPreviewImage
            tab={tab}
            className="h-14 w-24 shrink-0"
            hideWhenEmpty={thumbnailsOnly}
            showImage={allowPreviewImage}
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            {tab.favIconUrl ? (
              <img
                src={tab.favIconUrl}
                alt=""
                className="w-4 h-4 rounded-sm shrink-0 mt-0.5"
                onError={(e) => {
                  // Hide broken favicons gracefully
                  (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
                }}
              />
            ) : (
              <Globe className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" aria-hidden="true" />
            )}

            <div className="min-w-0 flex-1">
              <HighlightText
                className="text-xs font-mono text-gray-500 truncate"
                text={domain || "local"}
                query={highlightQuery}
              />
              <span className="mt-0.5 block text-sm text-gray-200 truncate">
                <HighlightText text={tab.title} fallback="Untitled" query={highlightQuery} />
              </span>
              <TabVideoMeta tab={tab} className="mt-1" showDuration={!isLargeImage} />
              {shouldShowMatchedUrl && (
                <HighlightText
                  className="mt-1 block truncate font-mono text-xs text-gray-500"
                  text={tab.url}
                  query={highlightQuery}
                />
              )}
            </div>

            <div className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
              <button
                type="button"
                onClick={handleRename}
                className="p-1 text-gray-400 hover:text-purple-100 hover:bg-purple-500/12 rounded transition-colors"
                title="Rename / change icon"
                aria-label="Rename tab"
              >
                <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <TabHoverTooltip title={tab.title ?? "Untitled"} url={tab.url} />
    </li>
  );
};
