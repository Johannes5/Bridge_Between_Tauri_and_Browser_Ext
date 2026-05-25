import * as React from "react";
import type { LogEntry } from "../types";

interface BridgeLogProps {
  entries: LogEntry[];
}

export const BridgeLog: React.FC<BridgeLogProps> = ({ entries }) => {
  return (
    <section>
      <h2 className="text-sm font-medium mb-3 text-gray-400">Bridge Log</h2>
      {entries.length === 0 ? (
        <p className="text-gray-500 text-sm italic">Waiting for bridge traffic...</p>
      ) : (
        <div className="h-64 overflow-y-auto font-mono text-xs scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          <ul className="space-y-1">
            {entries.map((entry, index) => (
              <li key={`${entry.type}-${index}`} className="flex gap-4 hover:bg-white/5 p-1 rounded transition-colors break-all">
                <span className="text-gray-500 shrink-0 select-none">
                  {new Date(entry.at).toLocaleTimeString()}
                </span>
                <span className={`shrink-0 font-bold ${
                  entry.type.includes('error') ? 'text-red-400' :
                  entry.type.includes('query') ? 'text-blue-400' :
                  entry.type.includes('status') ? 'text-green-400' :
                  'text-purple-400'
                }`}>
                  {entry.type}
                </span>
                <span className="text-gray-300">
                  {entry.summary}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};
