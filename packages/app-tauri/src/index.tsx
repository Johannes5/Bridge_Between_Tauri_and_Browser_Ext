import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  EnvelopeSchema,
  PresenceStatusPayloadSchema,
  TabsListPayloadSchema,
  TabsOpenOrFocusPayloadSchema,
  TabsSavedPayloadSchema,
  type Envelope,
  type TabsListPayload,
  type TabDescriptor,
  type TabsSavedPayload
} from "@bridge/shared-proto";
import "./index.css";

type PresenceState = {
  app?: string;
  extension?: string;
  sidecar?: string;
  timestamp?: number;
};

type LogEntry = {
  at: number;
  type: string;
  summary: string;
};

type SavedTabCollection = {
  id: string;
  savedAt: number;
  windowId?: number | null;
  source?: string;
  label?: string | null;
  tabs: TabDescriptor[];
  browser?: string;
  connectionId?: string;
};

type BrowserTabSnapshot = {
  browser: string;
  connectionId: string;
  payload: TabsListPayload;
  lastUpdate: number;
};

const SAVED_TABS_KEY = "bridge:saved-tab-collections";

const randomId = () => `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

const App: React.FC = () => {
  const [browserTabs, setBrowserTabs] = React.useState<Map<string, BrowserTabSnapshot>>(new Map());
  const [presence, setPresence] = React.useState<PresenceState>({});
  const [logEntries, setLogEntries] = React.useState<LogEntry[]>([]);
  const [isSending, setIsSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [savedCollections, setSavedCollections] = React.useState<SavedTabCollection[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }
    try {
      const stored = window.localStorage.getItem(SAVED_TABS_KEY);
      if (!stored) {
        return [];
      }
      const parsed = JSON.parse(stored) as SavedTabCollection[];
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.map((entry) => ({
        ...entry,
        tabs: Array.isArray(entry.tabs) ? entry.tabs : []
      }));
    } catch {
      return [];
    }
  });

  const [expandedSaved, setExpandedSaved] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(SAVED_TABS_KEY, JSON.stringify(savedCollections));
    } catch (err) {
      console.error("[bridge-app] failed to persist saved tabs", err);
    }
  }, [savedCollections]);

  const pushLog = React.useCallback((entry: LogEntry) => {
    setLogEntries((prev) => [entry, ...prev].slice(0, 50));
  }, []);

  const getDefaultConnectionId = React.useCallback((): string | undefined => {
    if (browserTabs.size === 0) return undefined;
    // Return the first connection (could be enhanced to remember user preference)
    return Array.from(browserTabs.values())[0]?.connectionId;
  }, [browserTabs]);

  const inferLabel = React.useCallback((tabs: TabDescriptor[]): string | null => {
    if (!tabs.length) {
      return null;
    }
    const firstWithTitle = tabs.find((tab) => tab.title)?.title;
    if (firstWithTitle) {
      return firstWithTitle;
    }
    const firstWithUrl = tabs.find((tab) => tab.url)?.url;
    return firstWithUrl ?? null;
  }, []);

  const addSavedCollection = React.useCallback(
    (payload: TabsSavedPayload) => {
      const entry: SavedTabCollection = {
        id: randomId(),
        savedAt: payload.savedAt ?? Date.now(),
        windowId: payload.windowId ?? null,
        source: payload.source,
        label: payload.label ?? inferLabel(payload.tabs),
        tabs: payload.tabs.map((tab) => ({ ...tab })),
        browser: payload.browser,
        connectionId: payload.connectionId
      };
      setSavedCollections((prev) => [entry, ...prev].slice(0, 25));
      pushLog({
        at: Date.now(),
        type: "tabs.save",
        summary: `saved ${entry.tabs.length} tabs`
      });
    },
    [inferLabel, pushLog]
  );

  const sendEnvelope = React.useCallback(
    async (envelope: Envelope) => {
      setIsSending(true);
      setError(null);
      try {
        await invoke("bridge_send", { envelope });
        pushLog({ at: Date.now(), type: envelope.type, summary: "sent" });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        pushLog({ at: Date.now(), type: "error", summary: message });
      } finally {
        setIsSending(false);
      }
    },
    [pushLog]
  );

  React.useEffect(() => {
    const subscription = listen<string>("bridge://incoming", (event) => {
      const raw = event.payload;
      try {
        const envelope = EnvelopeSchema.parse(JSON.parse(raw));
        pushLog({
          at: Date.now(),
          type: envelope.type,
          summary: envelope.id ? `id=${envelope.id}` : "received"
        });

        switch (envelope.type) {
          case "tabs.list": {
            const payload = TabsListPayloadSchema.parse(envelope.payload);
            const connectionId = payload.connectionId;
            const browser = payload.browser;
            if (connectionId && browser) {
              setBrowserTabs((prev) => {
                const updated = new Map(prev);
                updated.set(connectionId, {
                  browser,
                  connectionId,
                  payload,
                  lastUpdate: Date.now()
                });
                return updated;
              });
            }
            break;
          }
          case "tabs.save": {
            const payload = TabsSavedPayloadSchema.parse(envelope.payload);
            addSavedCollection(payload);
            break;
          }
          case "presence.status": {
            const payload = PresenceStatusPayloadSchema.parse(envelope.payload ?? {});
            setPresence((prev) => ({
              app: payload.app ?? prev.app,
              extension: payload.extension ?? prev.extension,
              sidecar: payload.sidecar ?? prev.sidecar,
              timestamp: payload.timestamp ?? Date.now()
            }));
            
            // Clean up disconnected browsers
            if (payload.sidecar === "offline" && payload.connectionId) {
              const connId = payload.connectionId;
              setBrowserTabs((prev) => {
                const updated = new Map(prev);
                updated.delete(connId);
                return updated;
              });
            }
            break;
          }
          case "error": {
            const message =
              envelope.payload && typeof envelope.payload === "object"
                ? (envelope.payload as Record<string, unknown>).error
                : undefined;
            if (typeof message === "string") {
              setError(message);
            } else {
              setError("Bridge reported an unknown error");
            }
            break;
          }
          default:
            break;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn("[bridge-app] failed to parse envelope", message, raw);
        pushLog({ at: Date.now(), type: "parse-error", summary: message });
      }
    });

    return () => {
      subscription
        .then((unlisten) => unlisten())
        .catch((err) => console.error("[bridge-app] failed to clean listener", err));
    };
  }, [addSavedCollection, pushLog]);

  React.useEffect(() => {
    const bootstrap = async () => {
      await sendEnvelope({
        v: 1,
        id: randomId(),
        type: "presence.query",
        payload: { requester: "app" }
      });
      await sendEnvelope({
        v: 1,
        id: randomId(),
        type: "tabs.list.request"
      });
    };
    bootstrap().catch((err) => console.error("[bridge-app] bootstrap failed", err));
  }, [sendEnvelope]);

  const handleOpenTab = async (
    tab: TabDescriptor,
    options?: {
      matchStrategy?: "exact" | "origin" | "path";
      preferWindowId?: number | null;
      connectionId?: string;
    }
  ) => {
    if (!tab.url) {
      return;
    }
    
    const payload = {
      url: tab.url,
      matchStrategy: options?.matchStrategy ?? "origin",
      preferWindowId:
        options?.preferWindowId != null
          ? options.preferWindowId ?? undefined
          : tab.windowId ?? undefined,
      connectionId: options?.connectionId
    };
    
    console.log("[bridge-app] Sending tabs.openOrFocus:", payload);
    
    await sendEnvelope({
      v: 1,
      id: randomId(),
      type: "tabs.openOrFocus",
      payload: TabsOpenOrFocusPayloadSchema.parse(payload)
    });
    // Don't minimize app - let browser handle window focusing
  };

  const handleRequestTabs = async () => {
    await sendEnvelope({
      v: 1,
      id: randomId(),
      type: "tabs.list.request"
    });
  };

  const handleOpenExample = async () => {
    const targetConnectionId = getDefaultConnectionId();
    if (!targetConnectionId) {
      console.warn("[bridge-app] No browsers connected");
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
    // Don't minimize app - let browser handle window focusing
  };

  const handleSaveCurrentTabs = React.useCallback((snapshot: BrowserTabSnapshot) => {
    const payload = TabsSavedPayloadSchema.parse({
      windowId: snapshot.payload.windowId ?? null,
      tabs: snapshot.payload.tabs,
      reason: snapshot.payload.reason ?? "app-manual",
      source: "app",
      savedAt: Date.now(),
      browser: snapshot.browser,
      connectionId: snapshot.connectionId
    });
    addSavedCollection(payload);
  }, [addSavedCollection]);

  const handleRemoveSavedCollection = React.useCallback(
    (id: string) => {
      const removed = savedCollections.find((entry) => entry.id === id);
      setSavedCollections((prev) => prev.filter((entry) => entry.id !== id));
      if (removed) {
        pushLog({
          at: Date.now(),
          type: "tabs.save.remove",
          summary: `removed ${removed.tabs.length} tabs`
        });
      }
    },
    [pushLog, savedCollections]
  );

  const handleClearSavedCollections = React.useCallback(() => {
    if (!savedCollections.length) {
      return;
    }
    setSavedCollections([]);
    pushLog({
      at: Date.now(),
      type: "tabs.save.clear",
      summary: "cleared saved collections"
    });
  }, [pushLog, savedCollections.length]);

  const handleRestoreSavedCollection = React.useCallback(
    async (entry: SavedTabCollection, suspend: boolean) => {
      const urls = entry.tabs.map((t) => t.url).filter((v): v is string => typeof v === "string");
      if (urls.length === 0) return;
      
      // Priority: 1) saved connectionId, 2) find browser by name, 3) first available
      let targetConnectionId = entry.connectionId;
      
      // If saved connection exists, verify it's still connected
      if (targetConnectionId && !browserTabs.has(targetConnectionId)) {
        console.log("[bridge-app] Saved connection no longer available, finding alternative");
        targetConnectionId = undefined;
      }
      
      // Try to find browser by name (e.g., if saved from Chrome, restore to Chrome)
      if (!targetConnectionId && entry.browser && browserTabs.size > 0) {
        const matchingBrowser = Array.from(browserTabs.values()).find(
          (snap) => snap.browser === entry.browser
        );
        if (matchingBrowser) {
          targetConnectionId = matchingBrowser.connectionId;
          console.log(`[bridge-app] Restoring to matching browser: ${entry.browser}`);
        }
      }
      
      // Fallback to first available
      if (!targetConnectionId && browserTabs.size > 0) {
        targetConnectionId = Array.from(browserTabs.values())[0]?.connectionId;
        console.log("[bridge-app] Restoring to first available browser");
      }
      
      if (!targetConnectionId) {
        console.warn("[bridge-app] No browsers connected");
        return;
      }
      
      const payload = { 
        urls, 
        newWindow: true, 
        focused: true, 
        suspend, 
        connectionId: targetConnectionId 
      };
      
      console.log("[bridge-app] Sending tabs.restore:", payload);
      
      await sendEnvelope({
        v: 1,
        id: randomId(),
        type: "tabs.restore",
        payload
      });
      // Don't minimize app - let browser handle window focusing
    },
    [browserTabs, sendEnvelope]
  );

  const toggleSavedExpanded = React.useCallback((id: string) => {
    setExpandedSaved((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Convert Map to array for easier rendering
  const browserSnapshots = Array.from(browserTabs.values()).sort((a, b) => 
    a.browser.localeCompare(b.browser)
  );

  return (
    <div className="container">
      <header>
        <h1>Bridge Dev Console</h1>
        <p>Inspect the desktop ⇄ extension bridge and trigger cross-process actions.</p>
      </header>

      <section className="card">
        <h2>Presence</h2>
        <div className="presence-grid">
          <div>
            <strong>App:</strong> {presence.app ?? "unknown"}
          </div>
          <div>
            <strong>Extension:</strong> {presence.extension ?? "unknown"}
          </div>
          <div>
            <strong>Sidecar:</strong> {presence.sidecar ?? "unknown"}
          </div>
          <div>
            <strong>Updated:</strong>{" "}
            {presence.timestamp ? new Date(presence.timestamp).toLocaleTimeString() : "n/a"}
          </div>
        </div>
        <div className="actions">
          <button onClick={handleRequestTabs} disabled={isSending}>
            Request Tabs Snapshot
          </button>
          <button onClick={handleOpenExample} disabled={isSending}>
            Open Example Page
          </button>
        </div>
        {error && <div className="result error">{error}</div>}
      </section>

      {browserSnapshots.length === 0 ? (
        <section className="card">
          <h2>Current Window Tabs</h2>
          <p className="muted">No browser connections yet. Make sure your browser extension is connected.</p>
        </section>
      ) : (
        browserSnapshots.map((snapshot) => (
          <section key={snapshot.connectionId} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Current Window Tabs - {snapshot.browser}</h2>
              <button
                onClick={() => handleSaveCurrentTabs(snapshot)}
                disabled={snapshot.payload.tabs.length === 0}
                style={{ fontSize: '0.9rem' }}
              >
                Save These Tabs
              </button>
            </div>
            <div className="muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              Connection: {snapshot.connectionId} • Last update: {new Date(snapshot.lastUpdate).toLocaleTimeString()}
            </div>
            {snapshot.payload.tabs.length === 0 ? (
              <p className="muted">No tabs in this window.</p>
            ) : (
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
                  {snapshot.payload.tabs.map((tab) => (
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
                          onClick={() => handleOpenTab(tab, { 
                            connectionId: snapshot.connectionId,
                            preferWindowId: snapshot.payload.windowId ?? undefined
                          })}
                          disabled={!tab.url || isSending}
                        >
                          Focus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))
      )}

      <section className="card">
        <h2>Saved Tab Collections</h2>
        <div className="actions">
          <button
            className="ghost"
            onClick={handleClearSavedCollections}
            disabled={savedCollections.length === 0}
          >
            Clear Saved Entries
          </button>
        </div>
        {savedCollections.length === 0 ? (
          <p className="muted">No saved tab sets yet.</p>
        ) : (
          <div className="saved-list">
            {savedCollections.map((entry) => (
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
                    <button onClick={() => handleRestoreSavedCollection(entry, true)}>Restore (suspend)</button>
                    <button onClick={() => handleRestoreSavedCollection(entry, false)}>Restore (eager)</button>
                    <button
                      className="ghost destructive"
                      onClick={() => handleRemoveSavedCollection(entry.id)}
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
                          <button
                            onClick={() => {
                              // Use the same smart routing logic as restore
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
                              
                              handleOpenTab(tab, {
                                matchStrategy: "exact",
                                preferWindowId: entry.windowId ?? undefined,
                                connectionId: targetConnectionId
                              });
                            }}
                          >
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

      <section className="card">
        <h2>Bridge Log</h2>
        {logEntries.length === 0 ? (
          <p className="muted">Waiting for bridge traffic...</p>
        ) : (
          <ul className="log-list">
            {logEntries.map((entry, index) => (
              <li key={`${entry.type}-${index}`}>
                <span className="log-time">{new Date(entry.at).toLocaleTimeString()}</span>
                <span className="log-type">{entry.type}</span>
                <span>{entry.summary}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
