import * as React from "react";
import type { SavedTabCollection, BrowserTabSnapshot } from "../types";
import type { TabDescriptor } from "@bridge/shared-proto";

interface SavedCollectionsListProps {
  collections: SavedTabCollection[];
  browserTabs: Map<string, BrowserTabSnapshot>;
  onClear: () => void;
  onRemove: (id: string) => void;
  onRestore: (entry: SavedTabCollection, suspend: boolean) => void;
  onOpenTab: (tab: TabDescriptor, options?: { connectionId?: string; preferWindowId?: number }) => void;
}

export const SavedCollectionsList: React.FC<SavedCollectionsListProps> = ({
  collections,
  browserTabs,
  onClear,
  onRemove,
  onRestore,
  onOpenTab
}) => {
  const [expandedSaved, setExpandedSaved] = React.useState<Record<string, boolean>>({});

  const toggleSavedExpanded = (id: string) => {
    setExpandedSaved((prev) => ({ ...prev, [id]: !prev[id] }));
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

  return (
    <section className="card">
      <h2>Saved Tab Collections</h2>
      <div className="actions">
        <button
          className="ghost"
          onClick={onClear}
          disabled={collections.length === 0}
        >
          Clear Saved Entries
        </button>
      </div>
      {collections.length === 0 ? (
        <p className="muted">No saved tab sets yet.</p>
      ) : (
        <div className="saved-list">
          {collections.map((entry) => (
            <div key={entry.id} className="saved-entry">
              <div className="saved-entry-header">
                <div>
                  <h3>{entry.label ?? `Window with ${entry.tabs.length} tabs`}</h3>
                  <div className="saved-meta">
                    <span>{new Date(entry.savedAt).toLocaleString()}</span>
                    {entry.source && <span>from {entry.source}</span>}
                    {entry.browser && <span>{entry.browser}</span>}
                    {typeof entry.windowId === "number" && (
                      <span>window #{entry.windowId}</span>
                    )}
                  </div>
                </div>
                <div className="saved-entry-actions">
                  <button onClick={() => onRestore(entry, true)}>Restore (suspend)</button>
                  <button onClick={() => onRestore(entry, false)}>Restore (eager)</button>
                  <button
                    className="ghost destructive"
                    onClick={() => onRemove(entry.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <ul className="saved-tabs">
                {(expandedSaved[entry.id] ? entry.tabs : entry.tabs.slice(0, 5)).map((tab, idx) => (
                  <li key={`${entry.id}-${tab.id ?? idx}`}>
                    <span className="saved-tab-title">{tab.title ?? tab.url ?? "Untitled"}</span>
                    <div className="saved-tab-controls">
                      {tab.url ? (
                        <button onClick={() => handleOpenSingleTab(tab, entry)}>
                          Open
                        </button>
                      ) : (
                        <span className="muted">No URL</span>
                      )}
                    </div>
                    {tab.url && <span className="saved-tab-url">{tab.url}</span>}
                  </li>
                ))}
              </ul>
              {entry.tabs.length > 5 && (
                <div className="saved-entry-actions">
                  <button className="ghost" onClick={() => toggleSavedExpanded(entry.id)}>
                    {expandedSaved[entry.id]
                      ? "Show less"
                      : `Show all (+${entry.tabs.length - 5})`}
                  </button>
                </div>
              )}

              {entry.tabs.length > 5 && (
                <p className="muted">+{entry.tabs.length - 5} more tab(s)...</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
