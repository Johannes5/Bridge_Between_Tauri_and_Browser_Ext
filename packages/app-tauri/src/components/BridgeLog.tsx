import * as React from "react";
import type { LogEntry } from "../types";

interface BridgeLogProps {
  entries: LogEntry[];
}

export const BridgeLog: React.FC<BridgeLogProps> = ({ entries }) => {
  return (
    <section className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
      <h2 className="text-xl font-semibold mb-4 text-gray-200">Bridge Log</h2>
      {entries.length === 0 ? (
        <p className="text-gray-500 text-sm italic">Waiting for bridge traffic...</p>
      ) : (
        <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs border border-gray-700 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
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
