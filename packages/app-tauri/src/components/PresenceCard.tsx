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
    <section>
      <h2 className="text-sm font-medium mb-3 text-gray-400">Presence</h2>
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6">
        <div>
          <span className="block text-xs uppercase tracking-wider text-gray-500 mb-1">App</span>
          <span className="font-mono text-sm text-blue-300">{presence.app ?? "unknown"}</span>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Extension</span>
          <span className={presence.extension ? "font-mono text-sm text-green-400" : "font-mono text-sm text-gray-400"}>
            {presence.extension ?? "offline"}
          </span>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Sidecar</span>
          <span className="font-mono text-sm text-purple-300">{presence.sidecar ?? "unknown"}</span>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Updated</span>
          <span className="font-mono text-sm text-gray-300">
            {presence.timestamp ? new Date(presence.timestamp).toLocaleTimeString() : "n/a"}
          </span>
        </div>
      </div>
      <div className="flex gap-3">
        <button 
          onClick={onRequestSnapshot} 
          disabled={isSending}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md font-medium transition-colors text-sm"
        >
          Request Tabs Snapshot
        </button>
        <button 
          onClick={onOpenExample} 
          disabled={isSending}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-200 rounded-md font-medium transition-colors text-sm border border-gray-600"
        >
          Open Example Page
        </button>
      </div>
      {error && (
        <div className="mt-4 p-3 bg-red-900/30 border border-red-800 text-red-200 rounded-lg text-sm">
          Error: {error}
        </div>
      )}
    </section>
  );
};
