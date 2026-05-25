import * as React from "react";
import { Pencil } from "lucide-react";
import type { SavedTabCollection, BrowserTabSnapshot } from "../types";
import type { TabDescriptor } from "@bridge/shared-proto";
import { getSavedWindowLabel } from "../utils/savedWindowLabel";
import { BrowserIcon } from "./BrowserIcon";

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
  const editInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editingId) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingId]);

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

  return (
    <section>
      <div className="flex justify-end mb-4">
        <button
          className="text-gray-400 hover:text-red-400 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-gray-400"
          onClick={onClear}
          disabled={collections.length === 0}
        >
          Clear Saved Entries
        </button>
      </div>
      {collections.length === 0 ? (
        <p className="text-gray-500 text-sm italic">No saved tab sets yet.</p>
      ) : (
        <div className="space-y-4">
          {collections.map((entry) => (
            <div key={entry.id} className="py-4">
              <div className="flex justify-between items-start mb-4">
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
                      className="w-full max-w-xl bg-gray-800 border border-gray-600 rounded px-2 py-1 text-lg font-medium text-gray-100 focus:outline-none focus:border-blue-500"
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
                        className="p-1 text-gray-500 hover:text-gray-200 opacity-0 group-hover/title:opacity-100 focus:opacity-100 transition-opacity shrink-0"
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
                <div className="flex gap-2">
                  <button 
                    onClick={() => onRestore(entry, true)}
                    className="px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/30 rounded text-xs font-medium transition-colors"
                  >
                    Restore (suspend)
                  </button>
                  <button 
                    onClick={() => onRestore(entry, false)}
                    className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/30 rounded text-xs font-medium transition-colors"
                  >
                    Restore (eager)
                  </button>
                  <button
                    className="px-3 py-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded text-xs font-medium transition-colors"
                    onClick={() => onRemove(entry.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <ul className="space-y-2 mb-3">
                {(expandedSaved[entry.id] ? entry.tabs : entry.tabs.slice(0, 5)).map((tab, idx) => (
                  <li key={`${entry.id}-${tab.id ?? idx}`} className="flex items-center justify-between text-sm py-1 border-b border-gray-800/50 last:border-0 hover:bg-gray-800/50 px-2 -mx-2 rounded transition-colors group">
                    <div className="flex flex-col min-w-0 flex-1 pr-4">
                      <span className="text-gray-300 truncate" title={tab.title ?? undefined}>
                        {tab.title ?? tab.url ?? "Untitled"}
                      </span>
                      {tab.url && <span className="text-gray-500 text-xs truncate font-mono">{tab.url}</span>}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      {tab.url ? (
                        <button 
                          onClick={() => handleOpenSingleTab(tab, entry)}
                          className="text-blue-400 hover:text-blue-300 text-xs font-medium px-2 py-1 rounded bg-blue-900/20"
                        >
                          Open
                        </button>
                      ) : (
                        <span className="text-gray-600 text-xs">No URL</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {entry.tabs.length > 5 && (
                <div className="flex justify-center mt-2">
                  <button 
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors" 
                    onClick={() => toggleSavedExpanded(entry.id)}
                  >
                    {expandedSaved[entry.id]
                      ? "Show less"
                      : `+${entry.tabs.length - 5} more tab(s)...`}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
