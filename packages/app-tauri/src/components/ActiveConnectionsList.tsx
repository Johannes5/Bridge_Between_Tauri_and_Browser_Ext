import * as React from "react";
import {
  Chrome,
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
import type { TabDescriptor } from "@bridge/shared-proto";

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

const getBrowserIcon = (browser: string): LucideIcon => {
  const b = browser.toLowerCase();
  if (b.includes("chrome")) return Chrome;
  return Globe;
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
}

export const ActiveConnectionsList: React.FC<ActiveConnectionsListProps> = ({
  snapshots,
  isSending,
  extensionStatus,
  onSaveTabs,
  onFocusTab
}) => {
  const [isInitializing, setIsInitializing] = React.useState(true);

  React.useEffect(() => {
    if (extensionStatus === "online") {
      setIsInitializing(false);
      return;
    }
    const timer = setTimeout(() => setIsInitializing(false), 1500);
    return () => clearTimeout(timer);
  }, [extensionStatus]);

  const showLoader = isInitializing || extensionStatus !== "online";

  if (snapshots.length === 0) {
    if (showLoader) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-900/50 rounded-xl border border-gray-800">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
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
      <section className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
        <h2 className="text-xl font-semibold mb-2 text-gray-200">Current Window Tabs</h2>
        <p className="text-gray-500 text-sm">
          No browser connections yet. Make sure your browser extension is connected.
        </p>
      </section>
    );
  }

  return (
    <>
      {snapshots.map((snapshot) => (
        <ConnectionCard
          key={snapshot.connectionId}
          snapshot={snapshot}
          isSending={isSending}
          onSave={onSaveTabs}
          onFocus={onFocusTab}
        />
      ))}
    </>
  );
};

interface ConnectionCardProps {
  snapshot: BrowserTabSnapshot;
  isSending: boolean;
  onSave: (
    tabs: TabDescriptor[],
    meta: { browser: string; connectionId: string; windowId?: number | null }
  ) => void;
  onFocus: (
    tab: TabDescriptor,
    options?: { connectionId?: string; preferWindowId?: number }
  ) => void;
}

const ConnectionCard: React.FC<ConnectionCardProps> = ({ snapshot, isSending, onSave, onFocus }) => {
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

  const BrowserIcon = getBrowserIcon(snapshot.browser);

  return (
    <section className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
      <div className="flex justify-between items-center mb-1">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-200">
          <BrowserIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
          <span>Current Tabs - {snapshot.browser}</span>
        </h2>
        <span className="text-xs text-gray-500 font-mono">
          Last update: {formatTime(snapshot.lastUpdate)}
        </span>
      </div>
      <div className="text-xs text-gray-500 font-mono mb-6">
        Connection: {snapshot.connectionId}
      </div>

      {snapshot.payload.tabs.length === 0 ? (
        <p className="text-gray-500 text-sm italic">No tabs available.</p>
      ) : (
        <div className="space-y-4">
          {sortedWindowIds.map((windowId, idx) => (
            <WindowGroup
              key={windowId}
              windowId={windowId}
              windowIndex={idx + 1}
              tabs={byWindow.get(windowId) ?? []}
              browser={snapshot.browser}
              connectionId={snapshot.connectionId}
              isSending={isSending}
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
              onSave={onSave}
              onFocus={onFocus}
            />
          )}
        </div>
      )}
    </section>
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
  onSave,
  onFocus
}) => {
  const BrowserIcon = getBrowserIcon(browser);
  const WindowIcon = windowId != null ? getWindowIcon(windowId) : null;
  const displayLabel = label ?? `Window ${windowIndex ?? "?"}`;

  const handleRenameWindow = () => {
    toast.info(`Rename "${displayLabel}" — coming soon`);
  };

  return (
    <div>
      {/* Window header */}
      <div className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-700/30 transition-colors">
        <BrowserIcon className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
        <span className="text-gray-100 font-medium">{displayLabel}</span>
        {WindowIcon && <WindowIcon className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />}

        <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onSave(tabs, { browser, connectionId, windowId: windowId ?? null })}
            disabled={tabs.length === 0}
            className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/10 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Save all tabs in this window"
          >
            <Save className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Save Window</span>
          </button>
          <button
            type="button"
            onClick={handleRenameWindow}
            className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
            title="Rename / change icon"
            aria-label={`Rename ${displayLabel}`}
          >
            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Tab list */}
      <ul className="mt-1 ml-6 space-y-0.5">
        {tabs.map((tab) => (
          <TabRow
            key={`${tab.id ?? tab.url}`}
            tab={tab}
            connectionId={connectionId}
            preferWindowId={windowId}
            isSending={isSending}
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
  onFocus: (
    tab: TabDescriptor,
    options?: { connectionId?: string; preferWindowId?: number }
  ) => void;
}

const TabRow: React.FC<TabRowProps> = ({ tab, connectionId, preferWindowId, isSending, onFocus }) => {
  const domain = getDomain(tab.url);
  const disabled = !tab.url || isSending;

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
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={`Focus tab ${tab.title ?? tab.url ?? "Untitled"}`}
      title={tab.url ?? undefined}
      onClick={handleFocus}
      onKeyDown={handleKey}
      className={`group flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer hover:bg-gray-700/40 focus:bg-gray-700/40 focus:outline-hidden"
      }`}
    >
      {tab.favIconUrl ? (
        <img
          src={tab.favIconUrl}
          alt=""
          className="w-4 h-4 rounded-sm shrink-0"
          onError={(e) => {
            // Hide broken favicons gracefully
            (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
          }}
        />
      ) : (
        <Globe className="w-4 h-4 text-gray-500 shrink-0" aria-hidden="true" />
      )}

      <span className="text-xs font-mono text-gray-500 shrink-0 w-16 truncate">
        {domain}
      </span>

      <span className="text-sm text-gray-200 truncate">{tab.title ?? "Untitled"}</span>

      <div className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
        <span className="text-[10px] text-gray-500 font-mono">{formatTime(tab.lastAccessed)}</span>
        <button
          type="button"
          onClick={handleRename}
          className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
          title="Rename / change icon"
          aria-label="Rename tab"
        >
          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </li>
  );
};
