import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  EnvelopeSchema,
  PresenceStatusPayloadSchema,
  TabsListPayloadSchema,
  TabsOpenOrFocusPayloadSchema,
  type Envelope,
  type TabsListPayload,
  type TabDescriptor
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

const randomId = () => `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

const App: React.FC = () => {
  const [tabsSnapshot, setTabsSnapshot] = React.useState<TabsListPayload | null>(null);
  const [presence, setPresence] = React.useState<PresenceState>({});
  const [logEntries, setLogEntries] = React.useState<LogEntry[]>([]);
  const [isSending, setIsSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const pushLog = React.useCallback((entry: LogEntry) => {
    setLogEntries((prev) => [entry, ...prev].slice(0, 50));
  }, []);

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
            setTabsSnapshot(payload);
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
  }, [pushLog]);

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

  const handleOpenTab = async (tab: TabDescriptor) => {
    if (!tab.url) {
      return;
    }
    await sendEnvelope({
      v: 1,
      id: randomId(),
      type: "tabs.openOrFocus",
      payload: TabsOpenOrFocusPayloadSchema.parse({
        url: tab.url,
        matchStrategy: "origin",
        preferWindowId: tab.windowId ?? undefined
      })
    });
  };

  const handleRequestTabs = async () => {
    await sendEnvelope({
      v: 1,
      id: randomId(),
      type: "tabs.list.request"
    });
  };

  const handleOpenExample = async () => {
    await sendEnvelope({
      v: 1,
      id: randomId(),
      type: "tabs.openOrFocus",
      payload: { url: "https://example.com/bridge-test", matchStrategy: "origin" }
    });
  };

  const tabs = tabsSnapshot?.tabs ?? [];

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

      <section className="card">
        <h2>Current Window Tabs</h2>
        {tabs.length === 0 ? (
          <p className="muted">No tab data received yet.</p>
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
                    <button onClick={() => handleOpenTab(tab)} disabled={!tab.url || isSending}>
                      Focus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
