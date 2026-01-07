import * as React from "react";
import type { PresenceState } from "../types";

interface PresenceCardProps {
  presence: PresenceState;
  isSending: boolean;
  error: string | null;
  onRequestSnapshot: () => void;
  onOpenExample: () => void;
}

export const PresenceCard: React.FC<PresenceCardProps> = ({
  presence,
  isSending,
  error,
  onRequestSnapshot,
  onOpenExample
}) => {
  return (
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
        <button onClick={onRequestSnapshot} disabled={isSending}>
          Request Tabs Snapshot
        </button>
        <button onClick={onOpenExample} disabled={isSending}>
          Open Example Page
        </button>
      </div>
      {error && <div className="result error">{error}</div>}
    </section>
  );
};
