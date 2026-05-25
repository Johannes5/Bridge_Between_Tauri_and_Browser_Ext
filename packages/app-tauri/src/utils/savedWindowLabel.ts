export function formatSavedWindowLabel(savedAt: number): string {
  const date = new Date(savedAt);
  let weekday = date.toLocaleDateString("de-DE", { weekday: "short" });
  if (!weekday.endsWith(".")) {
    weekday = `${weekday}.`;
  }
  const datePart = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `Saved Window - ${weekday}, ${datePart} - ${timePart}`;
}

export function getSavedWindowLabel(entry: {
  label?: string | null;
  savedAt: number;
}): string {
  return entry.label ?? formatSavedWindowLabel(entry.savedAt);
}
