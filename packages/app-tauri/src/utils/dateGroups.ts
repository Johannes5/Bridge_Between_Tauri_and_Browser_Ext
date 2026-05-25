export interface DateGroup<T> {
  dayStart: number;
  items: T[];
}

export const getLocalDayStart = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

export const groupItemsByDay = <T>(
  items: T[],
  getTimestamp: (item: T) => number
): DateGroup<T>[] => {
  const groups = new Map<number, T[]>();

  for (const item of items) {
    const dayStart = getLocalDayStart(getTimestamp(item));
    const existing = groups.get(dayStart) ?? [];
    existing.push(item);
    groups.set(dayStart, existing);
  }

  return Array.from(groups.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([dayStart, groupedItems]) => ({
      dayStart,
      items: groupedItems
    }));
};

const weekdayFormatter = new Intl.DateTimeFormat("de-DE", { weekday: "short" });
const monthFormatter = new Intl.DateTimeFormat("de-DE", { month: "short" });

export const formatDateStampLabel = (timestamp: number): string => {
  const date = new Date(timestamp);
  const weekday = weekdayFormatter.format(date);
  const month = monthFormatter.format(date);
  const weekdayLabel = weekday.endsWith(".") ? weekday : `${weekday}.`;

  return `- ${weekdayLabel}, ${month} ${date.getDate()}, ${date.getFullYear()}`;
};
