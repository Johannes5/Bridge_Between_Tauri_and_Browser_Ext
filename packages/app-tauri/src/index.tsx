import * as React from "react";
import * as ReactDOM from "react-dom/client";
import {
  TabsOpenOrFocusPayloadSchema,
  type TabDescriptor,
} from "shared-proto";
import "./index.css";

import { PresenceCard } from "./components/PresenceCard";
import { ActiveConnectionsList } from "./components/ActiveConnectionsList";
import { SavedCollectionsList } from "./components/SavedCollectionsList";
import { BridgeLog } from "./components/BridgeLog";
import { CollapsibleSection } from "./components/CollapsibleSection";
import { useBridgeStore } from "./store";
import type { SavedTabCollection } from "./types";
import { formatSavedWindowLabel } from "./utils/savedWindowLabel";
import { normalizeSearchQuery } from "./components/SearchHighlight";

const randomId = () => `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

type SearchMode = "filter" | "find";

interface GlobalSearchBarProps {
  mode: SearchMode;
  filterQuery: string;
  findQuery: string;
  findMatchCount: number;
  activeFindIndex: number;
  inputRef: React.RefObject<HTMLInputElement>;
  onModeChange: (mode: SearchMode) => void;
  onFilterQueryChange: (query: string) => void;
  onFindQueryChange: (query: string) => void;
  onFindStep: (direction: 1 | -1) => void;
}

const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  mode,
  filterQuery,
  findQuery,
  findMatchCount,
  activeFindIndex,
  inputRef,
  onModeChange,
  onFilterQueryChange,
  onFindQueryChange,
  onFindStep
}) => {
  const isFilterMode = mode === "filter";
  const value = isFilterMode ? filterQuery : findQuery;

  const handleChange = (nextValue: string) => {
    if (isFilterMode) {
      onFilterQueryChange(nextValue);
      if (nextValue.length > 0) {
        onFindQueryChange("");
      }
    } else {
      onFindQueryChange(nextValue);
      if (nextValue.length > 0) {
        onFilterQueryChange("");
      }
    }
  };

  return (
    <div className="sticky top-0 z-20 -mx-8 mb-8 border-b border-[#222222] bg-[#181818]/95 px-8 py-4 backdrop-blur">
      <div className="flex flex-col gap-3 rounded-xl border border-[#242424] bg-[#141414] p-3 shadow-lg shadow-black/20 sm:flex-row sm:items-center">
        <div className="flex shrink-0 rounded-lg border border-[#2a2a2a] bg-[#181818] p-1 text-xs font-medium text-gray-400">
          <button
            type="button"
            onClick={() => onModeChange("filter")}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              isFilterMode ? "bg-purple-500/15 text-purple-100" : "hover:text-gray-200"
            }`}
          >
            Filter
          </button>
          <button
            type="button"
            onClick={() => onModeChange("find")}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              !isFilterMode ? "bg-amber-400/15 text-amber-100" : "hover:text-gray-200"
            }`}
          >
            Find
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => {
              if (!isFilterMode && e.key === "Enter") {
                e.preventDefault();
                onFindStep(e.shiftKey ? -1 : 1);
              }
            }}
            className="w-full rounded-lg border border-[#2a2a2a] bg-[#101010] px-3 py-2 text-sm text-gray-100 placeholder:text-gray-600 focus:border-[#4a4a4a] focus:outline-none"
            placeholder={
              isFilterMode
                ? "Filter windows and saved tab groups by tab title or URL..."
                : "Find and highlight tabs without filtering..."
            }
            aria-label={isFilterMode ? "Filter tab groups" : "Find tabs"}
          />
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-gray-500">
          <span>{isFilterMode ? "Cmd/Ctrl+Shift+F" : "Cmd/Ctrl+F"}</span>
          {!isFilterMode && normalizeSearchQuery(findQuery).length > 0 && (
            <span className="rounded bg-[#1f1f1f] px-2 py-1 text-gray-300">
              {findMatchCount > 0 ? `${activeFindIndex}/${findMatchCount}` : "0 results"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

import { Toaster, toast } from 'sonner';
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="p-8 text-center text-red-500 min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: "#181818" }}>
      <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
      <pre className="text-sm bg-gray-800 p-4 rounded mb-4 overflow-auto max-w-2xl">
        {error.message}
      </pre>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-gray-700 rounded hover:bg-purple-500/15 text-white transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

const App: React.FC = () => {
  const [searchMode, setSearchMode] = React.useState<SearchMode>("filter");
  const [filterQuery, setFilterQuery] = React.useState("");
  const [findQuery, setFindQuery] = React.useState("");
  const [findMatchCount, setFindMatchCount] = React.useState(0);
  const [activeFindIndex, setActiveFindIndex] = React.useState(0);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const activeFindIndexRef = React.useRef(0);
  // Select specific slices to avoid unnecessary re-renders
  const browserTabs = useBridgeStore((s) => s.browserTabs);
  const presence = useBridgeStore((s) => s.presence);
  const logEntries = useBridgeStore((s) => s.logEntries);
  const savedCollections = useBridgeStore((s) => s.savedCollections);
  const isSending = useBridgeStore((s) => s.isSending);
  const error = useBridgeStore((s) => s.error);

  const {
    sendEnvelope,
    addSavedCollection,
    removeSavedCollection,
    renameSavedCollection,
    clearSavedCollections,
    loadSavedCollections,
    startListening,
  } = useBridgeStore();

  // Show toast on global error
  React.useEffect(() => {
    if (error) {
      toast.error(`Bridge Error: ${error}`);
    }
  }, [error]);

  // Initialize store hooks
  React.useEffect(() => {
    loadSavedCollections();
    const listenPromise = startListening();

    // Initial bootstrap
    sendEnvelope({
      v: 1,
      id: randomId(),
      type: "presence.query",
      payload: { requester: "app" }
    }).then(() => {
       sendEnvelope({
        v: 1,
        id: randomId(),
        type: "tabs.list.request"
      });
    });

    return () => {
      listenPromise.then((unlisten) => unlisten());
    };
  }, [loadSavedCollections, startListening, sendEnvelope]);


  // Derived state
  const browserSnapshots = React.useMemo(() =>
    Array.from(browserTabs.values()).sort((a, b) =>
      a.browser.localeCompare(b.browser)
    ), [browserTabs]);

  const focusSearchInput = React.useCallback(() => {
    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });
  }, []);

  const scrollToFindMatch = React.useCallback(
    (direction: 0 | 1 | -1 = 0) => {
      if (normalizeSearchQuery(findQuery).length === 0) {
        document
          .querySelectorAll<HTMLElement>("[data-find-active='true']")
          .forEach((match) => match.removeAttribute("data-find-active"));
        setFindMatchCount(0);
        setActiveFindIndex(0);
        activeFindIndexRef.current = 0;
        return;
      }

      window.requestAnimationFrame(() => {
        const matches = Array.from(document.querySelectorAll<HTMLElement>("[data-find-match='true']"));
        setFindMatchCount(matches.length);

        if (matches.length === 0) {
          document
            .querySelectorAll<HTMLElement>("[data-find-active='true']")
            .forEach((match) => match.removeAttribute("data-find-active"));
          setActiveFindIndex(0);
          activeFindIndexRef.current = 0;
          return;
        }

        const nextIndex =
          direction === 0
            ? 0
            : (activeFindIndexRef.current + direction + matches.length) % matches.length;

        activeFindIndexRef.current = nextIndex;
        setActiveFindIndex(nextIndex + 1);
        matches.forEach((match) => match.removeAttribute("data-find-active"));
        matches[nextIndex]?.setAttribute("data-find-active", "true");
        matches[nextIndex]?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    },
    [findQuery]
  );

  React.useEffect(() => {
    scrollToFindMatch(0);
  }, [browserSnapshots, filterQuery, findQuery, savedCollections, scrollToFindMatch]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLocaleLowerCase();
      const hasModifier = event.metaKey || event.ctrlKey;
      if (!hasModifier || key !== "f") return;

      event.preventDefault();
      if (event.shiftKey) {
        setSearchMode("filter");
      } else {
        setSearchMode("find");
      }
      focusSearchInput();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusSearchInput]);

  const getDefaultConnectionId = React.useCallback((): string | undefined => {
    if (browserTabs.size === 0) return undefined;
    return Array.from(browserTabs.values())[0]?.connectionId;
  }, [browserTabs]);

  const handleRequestTabs = () => {
    sendEnvelope({
      v: 1,
      id: randomId(),
      type: "tabs.list.request"
    });
    toast.info("Refreshed tabs");
  };

  const handleOpenTab = async (
    tab: TabDescriptor,
    options?: {
      matchStrategy?: "exact" | "origin" | "path";
      preferWindowId?: number | null;
      connectionId?: string;
    }
  ) => {
    if (!tab.url) return;

    let targetConnectionId = options?.connectionId;
    if (targetConnectionId && !browserTabs.has(targetConnectionId)) {
      targetConnectionId = undefined;
    }
    if (!targetConnectionId) {
      targetConnectionId = getDefaultConnectionId();
    }

    if (!targetConnectionId) {
      console.warn("[bridge-app] no browser connection available");
      toast.warning("No browser connection available");
      return;
    }

    const payload = {
      url: tab.url,
      matchStrategy: options?.matchStrategy ?? "exact",
      preferWindowId: options?.preferWindowId ?? tab.windowId,
      connectionId: targetConnectionId
    };

    console.log("[bridge-app] Sending tabs.openOrFocus:", payload);
    
    try {
      await sendEnvelope({
        v: 1,
        id: randomId(),
        type: "tabs.openOrFocus",
        payload: TabsOpenOrFocusPayloadSchema.parse(payload)
      });
      // Refresh list after action
      handleRequestTabs();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to open tab: ${message}`);
    }
  };

  const handleOpenExample = async () => {
    const targetConnectionId = getDefaultConnectionId();
    if (!targetConnectionId) {
       toast.warning("No browser connection available");
       return;
    }

    await sendEnvelope({
      v: 1,
      id: randomId(),
      type: "tabs.openOrFocus",
      payload: {
        url: "https://example.com/bridge-test",
        matchStrategy: "origin",
        connectionId: targetConnectionId
      }
    });
    handleRequestTabs();
  };

  const handleSaveTabs = (
    tabs: TabDescriptor[],
    meta: {
      browser: string;
      connectionId: string;
      windowId?: number | null
    }
  ) => {
    const savedAt = Date.now();

    addSavedCollection({
      id: randomId(),
      windowId: meta.windowId ?? null,
      tabs,
      source: "app",
      savedAt,
      browser: meta.browser,
      connectionId: meta.connectionId,
      label: formatSavedWindowLabel(savedAt),
    });
    toast.success("Saved tabs to collection");
  };

  const handleRestoreSavedCollection = async (entry: SavedTabCollection, suspend: boolean) => {
      const urls = entry.tabs.map((t) => t.url).filter((v): v is string => typeof v === "string");
      if (urls.length === 0) return;

      let targetConnectionId = entry.connectionId;
      if (targetConnectionId && !browserTabs.has(targetConnectionId)) {
        targetConnectionId = undefined;
      }
      if (!targetConnectionId && entry.browser) {
        // find matching browser
        const match = Array.from(browserTabs.values()).find(b => b.browser === entry.browser);
        if (match) targetConnectionId = match.connectionId;
      }
      if (!targetConnectionId) {
        targetConnectionId = getDefaultConnectionId();
      }
      
      if (!targetConnectionId) {
        toast.error("Original browser not found, and no default available.");
        return;
      }
      
      await sendEnvelope({
        v: 1,
        id: randomId(),
        type: "tabs.restore",
        payload: {
          urls,
          newWindow: true,
          focused: true,
          suspend,
          connectionId: targetConnectionId
        }
      });
      toast.success("Restored collection");
  };

  return (
    <div className="max-w-7xl mx-auto p-8 font-sans text-gray-100">
      <GlobalSearchBar
        mode={searchMode}
        filterQuery={filterQuery}
        findQuery={findQuery}
        findMatchCount={findMatchCount}
        activeFindIndex={activeFindIndex}
        inputRef={searchInputRef}
        onModeChange={(mode) => {
          setSearchMode(mode);
          focusSearchInput();
        }}
        onFilterQueryChange={setFilterQuery}
        onFindQueryChange={setFindQuery}
        onFindStep={scrollToFindMatch}
      />
      <div>
        <CollapsibleSection title="Current Session" defaultOpen>
          <ActiveConnectionsList
            snapshots={browserSnapshots}
            isSending={isSending}
            extensionStatus={presence.extension}
            onSaveTabs={handleSaveTabs}
            onFocusTab={handleOpenTab}
            filterQuery={filterQuery}
            findQuery={findQuery}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Saved Tab Collections" defaultOpen className="mt-16">
          <SavedCollectionsList
            collections={savedCollections}
            browserTabs={browserTabs}
            onClear={clearSavedCollections}
            onRemove={removeSavedCollection}
            onRename={renameSavedCollection}
            onRestore={handleRestoreSavedCollection}
            onOpenTab={handleOpenTab}
            filterQuery={filterQuery}
            findQuery={findQuery}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Presence & Bridge Log" className="mt-8">
          <PresenceCard
            presence={presence}
            isSending={isSending}
            error={error}
            onRequestSnapshot={handleRequestTabs}
            onOpenExample={handleOpenExample}
          />
          <BridgeLog entries={logEntries} />
        </CollapsibleSection>
      </div>
      <Toaster position="bottom-right" theme="dark" />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
