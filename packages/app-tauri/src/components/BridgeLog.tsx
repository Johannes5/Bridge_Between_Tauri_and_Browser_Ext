import * as React from "react";
import type { LogEntry } from "../types";

interface BridgeLogProps {
  entries: LogEntry[];
}

export const BridgeLog: React.FC<BridgeLogProps> = ({ entries }) => {
  return (
    <section className="card">
      <h2>Bridge Log</h2>
      {entries.length === 0 ? (
        <p className="muted">Waiting for bridge traffic...</p>
      ) : (
        <ul className="log-list">
          {entries.map((entry, index) => (
            <li key={`${entry.type}-${index}`}>
              <span className="log-time">{new Date(entry.at).toLocaleTimeString()}</span>
              <span className="log-type">{entry.type}</span>
              <span>{entry.summary}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
