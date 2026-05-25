// @vitest-environment node
import { describe, it, expect } from "vitest";
import { applyDelta } from "../tab-delta";
import type { TabDescriptor, TabsDeltaPayload } from "shared-proto";

const tab = (id: number, windowId = 1, index = 0, extra: Partial<TabDescriptor> = {}): TabDescriptor => ({
  id,
  windowId,
  index,
  url: `https://example.com/${id}`,
  title: `Tab ${id}`,
  ...extra,
});

const emptyDelta = (): TabsDeltaPayload => ({ added: [], updated: [], removed: [] });

describe("applyDelta", () => {
  describe("remove", () => {
    it("removes tabs by id", () => {
      const tabs = [tab(1), tab(2), tab(3)];
      const result = applyDelta(tabs, { ...emptyDelta(), removed: [2] });
      expect(result.map(t => t.id)).toEqual([1, 3]);
    });

    it("preserves tabs without an id when other ids are removed", () => {
      const noId: TabDescriptor = { url: "https://example.com/noid" };
      const tabs = [tab(1), noId, tab(2)];
      const result = applyDelta(tabs, { ...emptyDelta(), removed: [1] });
      expect(result).toContain(noId);
      expect(result.some(t => t.id === 1)).toBe(false);
    });

    it("is a no-op when removed list is empty", () => {
      const tabs = [tab(1), tab(2)];
      const result = applyDelta(tabs, emptyDelta());
      expect(result).toHaveLength(2);
    });
  });

  describe("add", () => {
    it("appends new tabs", () => {
      const tabs = [tab(1)];
      const result = applyDelta(tabs, { ...emptyDelta(), added: [tab(2)] });
      expect(result.map(t => t.id)).toContain(2);
    });

    it("does not duplicate when adding an existing id", () => {
      const tabs = [tab(1)];
      const result = applyDelta(tabs, { ...emptyDelta(), added: [tab(1, 1, 0, { title: "Updated" })] });
      expect(result.filter(t => t.id === 1)).toHaveLength(1);
      expect(result.find(t => t.id === 1)?.title).toBe("Updated");
    });

    it("skips tabs without an id in added", () => {
      const tabs = [tab(1)];
      const noId: TabDescriptor = { url: "https://example.com/noid" };
      const result = applyDelta(tabs, { ...emptyDelta(), added: [noId] });
      expect(result).toHaveLength(1);
    });
  });

  describe("update", () => {
    it("replaces an existing tab by id", () => {
      const tabs = [tab(1, 1, 0, { title: "Old" })];
      const result = applyDelta(tabs, { ...emptyDelta(), updated: [tab(1, 1, 0, { title: "New" })] });
      expect(result.find(t => t.id === 1)?.title).toBe("New");
    });

    it("appends an updated tab whose id is not in the snapshot", () => {
      const tabs = [tab(1)];
      const result = applyDelta(tabs, { ...emptyDelta(), updated: [tab(99)] });
      expect(result.map(t => t.id)).toContain(99);
    });
  });

  describe("operation order: remove before upsert", () => {
    it("remove runs before add so a re-added tab survives", () => {
      const tabs = [tab(1, 1, 0, { title: "Old" })];
      const result = applyDelta(tabs, {
        added: [tab(1, 1, 0, { title: "Readded" })],
        updated: [],
        removed: [1],
      });
      // remove fires first, then add re-inserts it
      expect(result.filter(t => t.id === 1)).toHaveLength(1);
      expect(result.find(t => t.id === 1)?.title).toBe("Readded");
    });
  });

  describe("sort", () => {
    it("sorts by windowId ascending", () => {
      const tabs = [tab(3, 2), tab(1, 1), tab(2, 3)];
      const result = applyDelta(tabs, emptyDelta());
      expect(result.map(t => t.windowId)).toEqual([1, 2, 3]);
    });

    it("sorts by index within the same window", () => {
      const tabs = [tab(3, 1, 2), tab(1, 1, 0), tab(2, 1, 1)];
      const result = applyDelta(tabs, emptyDelta());
      expect(result.map(t => t.id)).toEqual([1, 2, 3]);
    });

    it("treats missing windowId as 0", () => {
      const noWindow: TabDescriptor = { id: 99, url: "https://example.com" };
      const tabs = [tab(1, 1), noWindow];
      const result = applyDelta(tabs, emptyDelta());
      expect(result[0].id).toBe(99);
    });
  });

  describe("immutability", () => {
    it("does not mutate the input array", () => {
      const tabs = [tab(1), tab(2)];
      const original = [...tabs];
      applyDelta(tabs, { ...emptyDelta(), removed: [1] });
      expect(tabs).toEqual(original);
    });
  });
});
