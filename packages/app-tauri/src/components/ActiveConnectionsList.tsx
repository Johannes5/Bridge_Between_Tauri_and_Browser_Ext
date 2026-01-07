import * as React from "react";
import type { BrowserTabSnapshot } from "../types";
import type { TabDescriptor } from "@bridge/shared-proto";

interface ActiveConnectionsListProps {
  snapshots: BrowserTabSnapshot[];
  isSending: boolean;
  onSaveSnapshot: (snapshot: BrowserTabSnapshot) => void;
  onFocusTab: (tab: TabDescriptor, options?: { connectionId?: string; preferWindowId?: number }) => void;
}

export const ActiveConnectionsList: React.FC<ActiveConnectionsListProps> = ({
  snapshots,
  isSending,
  onSaveSnapshot,
  onFocusTab
}) => {
  if (snapshots.length === 0) {
    return (
      <section className="card">
        <h2>Current Window Tabs</h2>
        <p className="muted">No browser connections yet. Make sure your browser extension is connected.</p>
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
          onSave={onSaveSnapshot}
          onFocus={onFocusTab}
        />
      ))}
    </>
  );
};

interface ConnectionCardProps {
  snapshot: BrowserTabSnapshot;
  isSending: boolean;
  onSave: (snapshot: BrowserTabSnapshot) => void;
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
    <section className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Current Tabs - {snapshot.browser}</h2>
        <button
          onClick={() => onSave(snapshot)}
          disabled={snapshot.payload.tabs.length === 0}
          style={{ fontSize: "0.9rem" }}
        >
          Save These Tabs
        </button>
      </div>
      <div className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>
        Connection: {snapshot.connectionId} • Last update:{" "}
        {new Date(snapshot.lastUpdate).toLocaleTimeString()}
      </div>

      {snapshot.payload.tabs.length === 0 ? (
        <p className="muted">No tabs available.</p>
      ) : (
        <div className="window-groups">
          {sortedWindowIds.map((windowId) => (
            <WindowGroup
              key={windowId}
              label={`Window #${windowId}`}
              tabs={tabsByWindow.map.get(windowId) ?? []}
              connectionId={snapshot.connectionId}
              isSending={isSending}
              onFocus={onFocus}
              windowId={windowId}
            />
          ))}

          {tabsByWindow.orphans.length > 0 && (
            <WindowGroup
              label="Other Tabs"
              tabs={tabsByWindow.orphans}
              connectionId={snapshot.connectionId}
              isSending={isSending}
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
  connectionId: string;
  isSending: boolean;
  onFocus: (tab: TabDescriptor, options?: { connectionId?: string; preferWindowId?: number }) => void;
  windowId?: number;
}

const WindowGroup: React.FC<WindowGroupProps> = ({ 
  label, 
  tabs, 
  connectionId, 
  isSending, 
  onFocus,
  windowId 
}) => {
  return (
    <div className="window-group" style={{ marginBottom: "1.5rem" }}>
      <h3 style={{ fontSize: "1rem", marginTop: 0, marginBottom: "0.5rem", opacity: 0.8 }}>
        {label}
      </h3>
      <table className="tab-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>URL</th>
            <th>Last Accessed</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {tabs.map((tab) => (
            <tr key={`${tab.id ?? tab.url}`}>
              <td>{tab.title ?? "Untitled"}</td>
              <td className="tab-url">{tab.url ?? "n/a"}</td>
              <td>
                {tab.lastAccessed
                  ? new Date(tab.lastAccessed).toLocaleTimeString()
                  : "unknown"}
              </td>
              <td>
                <button
                  onClick={() =>
                    onFocus(tab, {
                      connectionId,
                      preferWindowId: windowId
                    })
                  }
                  disabled={!tab.url || isSending}
                >
                  Focus
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
