import type { TabDescriptor, TabsDeltaPayload } from "shared-proto";

/**
 * Applies a delta to a tab list and returns a new sorted array.
 * Order: remove → upsert (add + update) → sort by windowId then index.
 */
export const applyDelta = (tabs: TabDescriptor[], delta: TabsDeltaPayload): TabDescriptor[] => {
  let result = [...tabs];

  // 1. Remove
  if (delta.removed.length > 0) {
    const removedSet = new Set(delta.removed);
    result = result.filter(t => t.id == null || !removedSet.has(t.id));
  }

  // 2. Upsert (added + updated)
  const tabMap = new Map<number, number>();
  result.forEach((t, i) => { if (t.id != null) tabMap.set(t.id, i); });

  for (const tab of [...delta.added, ...delta.updated]) {
    if (tab.id == null) continue;
    if (tabMap.has(tab.id)) {
      result[tabMap.get(tab.id)!] = tab;
    } else {
      result.push(tab);
    }
  }

  // 3. Sort by windowId then index
  result.sort((a, b) => {
    if (a.windowId !== b.windowId) return (a.windowId ?? 0) - (b.windowId ?? 0);
    return (a.index ?? 0) - (b.index ?? 0);
  });

  return result;
};
