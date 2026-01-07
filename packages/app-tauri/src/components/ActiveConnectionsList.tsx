import * as React from "react";
import type { BrowserTabSnapshot } from "../types";
import type { TabDescriptor } from "@bridge/shared-proto";

interface ActiveConnectionsListProps {
  snapshots: BrowserTabSnapshot[];
  isSending: boolean;
  extensionStatus?: string;
  onSaveTabs: (tabs: TabDescriptor[], meta: { browser: string; connectionId: string; windowId?: number | null }) => void;
  onFocusTab: (tab: TabDescriptor, options?: { connectionId?: string; preferWindowId?: number }) => void;
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
    // Show spinner for at least 1.5 seconds to allow connections to handshake
    // BUT if we connect earlier, clear it immediately.
    if (extensionStatus === "online") {
        setIsInitializing(false);
        return;
    }
    
    const timer = setTimeout(() => setIsInitializing(false), 1500);
    return () => clearTimeout(timer);
  }, [extensionStatus]);

  // Show loader if determining initial state OR if extension is not explicitly online
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
        <p className="text-gray-500 text-sm">No browser connections yet. Make sure your browser extension is connected.</p>
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
  onSave: (tabs: TabDescriptor[], meta: { browser: string; connectionId: string; windowId?: number | null }) => void;
  onFocus: (tab: TabDescriptor, options?: { connectionId?: string; preferWindowId?: number }) => void;
}

const ConnectionCard: React.FC<ConnectionCardProps> = ({ snapshot, isSending, onSave, onFocus }) => {
  const tabsByWindow = React.useMemo(() => {
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
    return { map, orphans };
  }, [snapshot.payload.tabs]);

  const sortedWindowIds = Array.from(tabsByWindow.map.keys()).sort((a, b) => a - b);

  return (
    <section className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-xl font-semibold text-gray-200">Current Tabs - {snapshot.browser}</h2>
        <button
          onClick={() => onSave(snapshot.payload.tabs, { browser: snapshot.browser, connectionId: snapshot.connectionId })}
          disabled={snapshot.payload.tabs.length === 0}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
        >
          Save All Tabs
        </button>
      </div>
      <div className="text-xs text-gray-500 font-mono mb-6">
        Connection: {snapshot.connectionId} • Last update:{" "}
        {new Date(snapshot.lastUpdate).toLocaleTimeString()}
      </div>

      {snapshot.payload.tabs.length === 0 ? (
        <p className="text-gray-500 text-sm italic">No tabs available.</p>
      ) : (
        <div className="space-y-6">
          {sortedWindowIds.map((windowId) => (
            <WindowGroup
              key={windowId}
              label={`Window #${windowId}`}
              tabs={tabsByWindow.map.get(windowId) ?? []}
              browser={snapshot.browser}
              connectionId={snapshot.connectionId}
              isSending={isSending}
              onSave={onSave}
              onFocus={onFocus}
              windowId={windowId}
            />
          ))}

          {tabsByWindow.orphans.length > 0 && (
            <WindowGroup
              label="Other Tabs"
              tabs={tabsByWindow.orphans}
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
  label: string;
  tabs: TabDescriptor[];
  browser: string;
  connectionId: string;
  isSending: boolean;
  onSave: (tabs: TabDescriptor[], meta: { browser: string; connectionId: string; windowId?: number | null }) => void;
  onFocus: (tab: TabDescriptor, options?: { connectionId?: string; preferWindowId?: number }) => void;
  windowId?: number;
}

const WindowGroup: React.FC<WindowGroupProps> = ({ 
  label, 
  tabs, 
  browser,
  connectionId, 
  isSending, 
  onSave,
  onFocus,
  windowId 
}) => {
  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-900/30">
      <div className="flex justify-between items-center bg-gray-900/50 px-4 py-2 border-b border-gray-700">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
          {label}
        </h3>
        <button
          onClick={() => onSave(tabs, { browser, connectionId, windowId })}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium hover:underline"
        >
          Save Window
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-900/30 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Title</th>
              <th className="px-4 py-2 font-medium">URL</th>
              <th className="px-4 py-2 font-medium">Last Accessed</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {tabs.map((tab) => (
              <tr key={`${tab.id ?? tab.url}`} className="hover:bg-gray-700/30 transition-colors">
                <td className="px-4 py-2 text-gray-200 max-w-xs truncate" title={tab.title ?? undefined}>
                  {tab.title ?? "Untitled"}
                </td>
                <td className="px-4 py-2 text-gray-400 max-w-xs truncate font-mono text-xs" title={tab.url ?? undefined}>
                  {tab.url ?? "n/a"}
                </td>
                <td className="px-4 py-2 text-gray-500 text-xs">
                  {tab.lastAccessed
                    ? new Date(tab.lastAccessed).toLocaleTimeString()
                    : "unknown"}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() =>
                      onFocus(tab, {
                        connectionId,
                        preferWindowId: windowId
                      })
                    }
                    disabled={!tab.url || isSending}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-xs font-medium rounded transition-colors"
                  >
                    Focus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
