import * as React from "react";
import { Globe, Pencil } from "lucide-react";
import type { SavedTabCollection, BrowserTabSnapshot } from "../types";
import type { TabDescriptor } from "shared-proto";
import { getSavedWindowLabel } from "../utils/savedWindowLabel";
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

const DEFAULT_VIEW_MODE: ViewMode = "grid";
const DEFAULT_GROUP_BY_DATE = true;
const DEFAULT_GROUP_BY_WINDOW = true;
const DEFAULT_IMAGE_DISPLAY_MODE: ImageDisplayMode = "large";
const DEFAULT_THUMBNAILS_ONLY = true;
const DEFAULT_COLUMN_WIDTH = 300;

const shouldShowPreviewImage = (tab: TabDescriptor, thumbnailsOnly: boolean): boolean =>
  !thumbnailsOnly || tab.previewImageKind === "video-thumbnail";

interface SavedTabItem {
  key: string;
  tab: TabDescriptor;
  entry: SavedTabCollection;
  savedAt: number;
}

interface SavedCollectionsListProps {
  collections: SavedTabCollection[];
  browserTabs: Map<string, BrowserTabSnapshot>;
  onClear: () => void;
  onRemove: (id: string) => void;
  onRename: (id: string, label: string) => void;
  onRestore: (entry: SavedTabCollection, suspend: boolean) => void;
  onOpenTab: (tab: TabDescriptor, options?: { connectionId?: string; preferWindowId?: number }) => void;
}

export const SavedCollectionsList: React.FC<SavedCollectionsListProps> = ({
  collections,
  browserTabs,
  onClear,
  onRemove,
  onRename,
  onRestore,
  onOpenTab
}) => {
  const [expandedSaved, setExpandedSaved] = React.useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState("");
  const [viewMode, setViewMode] = React.useState<ViewMode>(DEFAULT_VIEW_MODE);
  const [groupByDate, setGroupByDate] = React.useState(DEFAULT_GROUP_BY_DATE);
  const [groupByWindow, setGroupByWindow] = React.useState(DEFAULT_GROUP_BY_WINDOW);
  const [imageDisplayMode, setImageDisplayMode] = React.useState<ImageDisplayMode>(
    DEFAULT_IMAGE_DISPLAY_MODE
  );
  const [thumbnailsOnly, setThumbnailsOnly] = React.useState(DEFAULT_THUMBNAILS_ONLY);
  const [columnWidth, setColumnWidth] = React.useState(DEFAULT_COLUMN_WIDTH);
  const editInputRef = React.useRef<HTMLInputElement>(null);
  const masonryStyle = React.useMemo(
    () => ({ ["--masonry-column-width" as string]: `${columnWidth}px` }) as React.CSSProperties,
    [columnWidth]
  );

  React.useEffect(() => {
    if (editingId) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingId]);

  const flatTabs = React.useMemo<SavedTabItem[]>(
    () =>
      collections.flatMap((entry) =>
        entry.tabs.map((tab, index) => ({
          key: `${entry.id}-${tab.id ?? tab.url ?? index}`,
          tab,
          entry,
          savedAt: entry.savedAt
        }))
      ),
    [collections]
  );

  const handleGroupByDateChange = React.useCallback((enabled: boolean) => {
    setGroupByDate(enabled);
    if (!enabled) {
      setGroupByWindow(true);
    }
  }, []);

  const handleGroupByWindowChange = React.useCallback((enabled: boolean) => {
    if (!enabled) {
      setGroupByDate(true);
    }
    setGroupByWindow(enabled);
  }, []);

  const toggleSavedExpanded = (id: string) => {
    setExpandedSaved((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const startEditing = (entry: SavedTabCollection) => {
    setEditingId(entry.id);
    setEditValue(getSavedWindowLabel(entry));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue("");
  };

  const commitEditing = (id: string) => {
    const trimmed = editValue.trim();
    if (trimmed) {
      onRename(id, trimmed);
    }
    cancelEditing();
  };

  const handleOpenSingleTab = (tab: TabDescriptor, entry: SavedTabCollection) => {
    // Smart routing logic
    let targetConnectionId = entry.connectionId;
    if (targetConnectionId && !browserTabs.has(targetConnectionId)) {
      targetConnectionId = undefined;
    }
    if (!targetConnectionId && entry.browser && browserTabs.size > 0) {
      const matchingBrowser = Array.from(browserTabs.values()).find(
        (snap) => snap.browser === entry.browser
      );
      targetConnectionId = matchingBrowser?.connectionId;
    }
    if (!targetConnectionId && browserTabs.size > 0) {
      targetConnectionId = Array.from(browserTabs.values())[0]?.connectionId;
    }

    onOpenTab(tab, {
      connectionId: targetConnectionId,
      preferWindowId: entry.windowId ?? undefined
    });
  };

  const renderTabItem = (
    entry: SavedTabCollection,
    tab: TabDescriptor,
    key: string,
    compactCard = false
  ) => {
    const isSmallImage = imageDisplayMode === "small";
    const isLargeImage = imageDisplayMode === "large";
    const allowPreviewImage = shouldShowPreviewImage(tab, thumbnailsOnly);

    return (
      <li
        key={key}
        className={`group relative text-sm ${
          compactCard ? "py-0" : "py-1 border-b border-[#222222] last:border-0"
        } hover:bg-[#1a1a1a] px-2 -mx-2 rounded transition-colors`}
      >
        <div className={isLargeImage ? "flex flex-col gap-3 py-1" : "flex items-center justify-between gap-3"}>
          {isLargeImage && (
            <TabPreviewImage
              tab={tab}
              className="h-40 w-full shrink-0"
              durationOverlayText={tab.videoDurationText}
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

          <div className="flex items-start gap-2 min-w-0 flex-1 pr-4">
            {tab.favIconUrl ? (
              <img
                src={tab.favIconUrl}
                alt=""
                className="w-4 h-4 rounded-sm shrink-0 mt-0.5"
                onError={(e) => {
                  e.currentTarget.style.visibility = "hidden";
                }}
              />
            ) : (
              <Globe className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-gray-300 truncate">{tab.title ?? tab.url ?? "Untitled"}</span>
              <TabVideoMeta tab={tab} className="mt-1" showDuration={!isLargeImage} />
              {tab.url && (
                <span className="text-gray-500 text-xs truncate font-mono mt-1">{tab.url}</span>
              )}
            </div>
          </div>
          <div
            className={`opacity-0 group-hover:opacity-100 transition-opacity ${
              isLargeImage ? "" : "shrink-0"
            }`}
          >
            {tab.url ? (
              <button
                onClick={() => handleOpenSingleTab(tab, entry)}
                className="text-gray-300 hover:text-gray-100 text-xs font-medium px-2 py-1 rounded bg-[#1a1a1a] hover:bg-[#202020] border border-[#2a2a2a]"
              >
                Open
              </button>
            ) : (
              <span className="text-gray-600 text-xs">No URL</span>
            )}
          </div>
        </div>
        <TabHoverTooltip title={tab.title ?? "Untitled"} url={tab.url} />
      </li>
    );
  };

  const renderCollection = (entry: SavedTabCollection, variant: "list" | "grid") => {
    const visibleTabs = expandedSaved[entry.id] ? entry.tabs : entry.tabs.slice(0, 5);
    const containerClass =
      variant === "grid"
        ? "masonry-item rounded-xl border border-[#16161a] bg-[#141414] p-4"
        : "py-4";
    const headerClass =
      variant === "grid"
        ? "flex flex-col gap-3 mb-4"
        : "flex justify-between items-start mb-4";
    const actionsClass =
      variant === "grid"
        ? "flex flex-wrap gap-2"
        : "flex gap-2";

    return (
      <div key={entry.id} className={containerClass}>
        <div className={headerClass}>
          <div className="min-w-0 flex-1 pr-4">
            {editingId === entry.id ? (
              <input
                ref={editInputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => commitEditing(entry.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitEditing(entry.id);
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    cancelEditing();
                  }
                }}
                className="w-full max-w-xl bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-lg font-medium text-gray-100 focus:outline-none focus:border-[#4a4a4a]"
                aria-label="Rename saved window"
              />
            ) : (
              <div className="flex items-center gap-2 mb-1 group/title">
                <h3 className="text-lg font-medium text-gray-200 truncate">
                  {getSavedWindowLabel(entry)}
                </h3>
                <button
                  type="button"
                  onClick={() => startEditing(entry)}
                  className="p-1 text-gray-500 hover:text-gray-200 hover:bg-[#1f1f1f] opacity-0 group-hover/title:opacity-100 focus:opacity-100 transition-colors shrink-0 rounded"
                  title="Rename saved window"
                  aria-label={`Rename ${getSavedWindowLabel(entry)}`}
                >
                  <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 font-mono">
              <span>{new Date(entry.savedAt).toLocaleString()}</span>
              {entry.source && (
                <>
                  <span>•</span>
                  <span>from {entry.source}</span>
                </>
              )}
              {entry.browser && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <BrowserIcon browser={entry.browser} className="w-3.5 h-3.5" />
                    {entry.browser}
                  </span>
                </>
              )}
              {typeof entry.windowId === "number" && (
                <>
                  <span>•</span>
                  <span>window #{entry.windowId}</span>
                </>
              )}
            </div>
          </div>
          <div className={actionsClass}>
            <button
              onClick={() => onRestore(entry, true)}
              className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#202020] text-gray-200 border border-[#2a2a2a] rounded text-xs font-medium transition-colors"
            >
              Restore (suspend)
            </button>
            <button
              onClick={() => onRestore(entry, false)}
              className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#202020] text-gray-200 border border-[#2a2a2a] rounded text-xs font-medium transition-colors"
            >
              Restore (eager)
            </button>
            <button
              className="px-3 py-1.5 text-gray-400 hover:text-gray-200 hover:bg-[#202020] rounded text-xs font-medium transition-colors"
              onClick={() => onRemove(entry.id)}
            >
              Remove
            </button>
          </div>
        </div>
        <ul className="space-y-2 mb-3">
          {visibleTabs.map((tab, idx) => renderTabItem(entry, tab, `${entry.id}-${tab.id ?? idx}`))}
        </ul>
        {entry.tabs.length > 5 && (
          <div className="flex justify-center mt-2">
            <button
              className="text-xs text-gray-500 hover:text-gray-300 hover:bg-[#1a1a1a] transition-colors rounded px-2 py-1"
              onClick={() => toggleSavedExpanded(entry.id)}
            >
              {expandedSaved[entry.id]
                ? "Show less"
                : `+${entry.tabs.length - 5} more tab(s)...`}
            </button>
          </div>
        )}
      </div>
    );
  };

  const groupedCollections = React.useMemo(
    () => groupItemsByDay(collections, (entry) => entry.savedAt),
    [collections]
  );

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <DateGroupingToggle enabled={groupByDate} onChange={handleGroupByDateChange} />
          <ControlToggle
            label="By Window"
            enabled={groupByWindow}
            onChange={handleGroupByWindowChange}
            disabled={!groupByDate}
            title={!groupByDate ? "Requires By Date" : undefined}
          />
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
          <ImageDisplayModeToggle value={imageDisplayMode} onChange={setImageDisplayMode} />
          <ControlToggle
            label="Thumbnails Only"
            enabled={thumbnailsOnly}
            onChange={setThumbnailsOnly}
            disabled={imageDisplayMode === "none"}
            title={imageDisplayMode === "none" ? "Requires images" : undefined}
          />
          {viewMode === "grid" && (
            <MasonryWidthControl value={columnWidth} onChange={setColumnWidth} />
          )}
        </div>
        <button
          className="text-gray-400 hover:text-gray-200 hover:bg-[#1a1a1a] text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-gray-400 rounded px-2 py-1"
          onClick={onClear}
          disabled={collections.length === 0}
        >
          Clear Saved Entries
        </button>
      </div>
      {collections.length === 0 ? (
        <p className="text-gray-500 text-sm italic">No saved tab sets yet.</p>
      ) : groupByDate && groupByWindow ? (
        <div className="space-y-14">
          {groupedCollections.map((group) => (
            <section key={group.dayStart} className="space-y-6">
              <DateStampBadge timestamp={group.dayStart} />
              {viewMode === "grid" ? (
                <div className="masonry-layout" style={masonryStyle}>
                  {group.items.map((entry) => renderCollection(entry, "grid"))}
                </div>
              ) : (
                <div className="space-y-4">
                  {group.items.map((entry) => renderCollection(entry, "list"))}
                </div>
              )}
            </section>
          ))}
        </div>
      ) : groupByDate ? (
        <div className="space-y-14">
          {groupItemsByDay(flatTabs, (item) => item.savedAt).map((group) => (
            <section key={group.dayStart} className="space-y-6">
              <DateStampBadge timestamp={group.dayStart} />
              {viewMode === "grid" ? (
                <div className="masonry-layout" style={masonryStyle}>
                  {group.items.map((item) => (
                    <div
                      key={item.key}
                      className="masonry-item rounded-xl border border-[#16161a] bg-[#141414] p-4"
                    >
                      <ul className="space-y-2 mb-0">
                        {renderTabItem(item.entry, item.tab, item.key, true)}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="space-y-2">
                  {group.items.map((item) => renderTabItem(item.entry, item.tab, item.key, false))}
                </ul>
              )}
            </section>
          ))}
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-4">
          {collections.map((entry) => renderCollection(entry, "list"))}
        </div>
      ) : (
        <div className="masonry-layout" style={masonryStyle}>
          {collections.map((entry) => renderCollection(entry, "grid"))}
        </div>
      )}
    </section>
  );
};
