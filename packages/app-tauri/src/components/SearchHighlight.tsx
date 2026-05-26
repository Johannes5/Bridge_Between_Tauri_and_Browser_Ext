import * as React from "react";
import type { TabDescriptor } from "shared-proto";

export const normalizeSearchQuery = (query: string): string => query.trim().toLocaleLowerCase();

const getTabSearchFields = (tab: TabDescriptor): string[] => [
  tab.title ?? "",
  tab.url ?? "",
  tab.channelName ?? "",
  tab.videoDurationText ?? ""
];

export const textMatchesSearch = (values: Array<string | number | null | undefined>, query: string): boolean => {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return true;

  return values.some((value) => String(value ?? "").toLocaleLowerCase().includes(normalizedQuery));
};

export const tabMatchesSearch = (tab: TabDescriptor, query: string): boolean =>
  textMatchesSearch(getTabSearchFields(tab), query);

interface HighlightTextProps {
  text?: string | null;
  fallback?: string;
  query: string;
  className?: string;
}

export const HighlightText: React.FC<HighlightTextProps> = ({
  text,
  fallback = "",
  query,
  className
}) => {
  const displayText = text && text.length > 0 ? text : fallback;
  const normalizedQuery = normalizeSearchQuery(query);
  const normalizedText = displayText.toLocaleLowerCase();
  const matchIndex = normalizedQuery ? normalizedText.indexOf(normalizedQuery) : -1;

  if (matchIndex < 0) {
    return <span className={className}>{displayText}</span>;
  }

  const before = displayText.slice(0, matchIndex);
  const match = displayText.slice(matchIndex, matchIndex + normalizedQuery.length);
  const after = displayText.slice(matchIndex + normalizedQuery.length);

  return (
    <span className={className}>
      {before}
      <mark className="rounded bg-amber-400/30 px-0.5 text-amber-100">{match}</mark>
      {after}
    </span>
  );
};
