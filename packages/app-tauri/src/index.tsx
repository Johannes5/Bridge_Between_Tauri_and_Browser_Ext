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
import { useBridgeStore } from "./store";
import type { SavedTabCollection } from "./types";

const randomId = () => `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

import { Toaster, toast } from 'sonner';
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="p-8 text-center text-red-500 bg-gray-900 min-h-screen flex flex-col items-center justify-center">
      <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
      <pre className="text-sm bg-gray-800 p-4 rounded mb-4 overflow-auto max-w-2xl">
        {error.message}
      </pre>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 text-white transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

const App: React.FC = () => {
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

  const getDefaultConnectionId = React.useCallback((): string | undefined => {
    if (browserTabs.size === 0) return undefined;
    return Array.from(browserTabs.values())[0]?.connectionId;
  }, [browserTabs]);

  const inferLabel = React.useCallback((tabs: TabDescriptor[]): string | null => {
    if (!tabs.length) return null;
    return tabs.find((t) => t.title)?.title ?? tabs.find((t) => t.url)?.url ?? null;
  }, []);

  // Handlers
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
    const payload = {
      id: randomId(),
      windowId: meta.windowId ?? null,
      tabs: tabs,
      reason: "app-manual",
      source: "app" as const,
      savedAt: Date.now(),
      browser: meta.browser,
      connectionId: meta.connectionId,
      label: null
    };

    addSavedCollection({
       ...payload,
       label: inferLabel(payload.tabs)
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
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
          Bridge Dev Console
        </h1>
        <p className="text-gray-400">
          Inspect the desktop ⇄ extension bridge and trigger cross-process actions.
        </p>
      </header>

      <div className="space-y-8">
        <PresenceCard
          presence={presence}
          isSending={isSending}
          error={error}
          onRequestSnapshot={handleRequestTabs}
          onOpenExample={handleOpenExample}
        />

        <ActiveConnectionsList
          snapshots={browserSnapshots}
          isSending={isSending}
          extensionStatus={presence.extension}
          onSaveTabs={handleSaveTabs}
          onFocusTab={handleOpenTab}
        />

        <SavedCollectionsList
          collections={savedCollections}
          browserTabs={browserTabs}
          onClear={clearSavedCollections}
          onRemove={removeSavedCollection}
          onRestore={handleRestoreSavedCollection}
          onOpenTab={handleOpenTab}
        />

        <BridgeLog entries={logEntries} />
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
