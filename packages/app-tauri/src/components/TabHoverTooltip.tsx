import * as React from "react";

interface TabHoverTooltipProps {
  title?: string | null;
  url?: string | null;
}

export const TabHoverTooltip: React.FC<TabHoverTooltipProps> = ({ title, url }) => {
  const showTitle = title?.trim();
  const showUrl = url?.trim();

  if (!showTitle && !showUrl) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute left-3 right-3 top-full z-30 mt-2 hidden rounded-xl border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-left shadow-[0_14px_30px_rgba(0,0,0,0.45)] group-hover:block group-focus-within:block">
      {showTitle && <div className="text-sm font-medium text-gray-100 whitespace-normal break-words">{showTitle}</div>}
      {showUrl && (
        <div className="mt-1 text-xs font-mono text-gray-400 whitespace-normal break-all">
          {showUrl}
        </div>
      )}
    </div>
  );
};
