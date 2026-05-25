// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { tabsSaveHandler } from "../tabs-save";
import type { TabsSavedPayload } from "shared-proto";

const basePayload: TabsSavedPayload = {
  savedAt: 1_700_000_000_000,
  tabs: [],
  connectionId: "conn-1",
  browser: "chrome",
  windowId: 42,
  source: "extension",
};

describe("tabsSaveHandler", () => {
  it("calls addSavedCollection with the correct shape", () => {
    const addSavedCollection = vi.fn();
    tabsSaveHandler(basePayload, { addSavedCollection });

    expect(addSavedCollection).toHaveBeenCalledTimes(1);
    const entry = addSavedCollection.mock.calls[0][0];
    expect(entry.savedAt).toBe(1_700_000_000_000);
    expect(entry.browser).toBe("chrome");
    expect(entry.connectionId).toBe("conn-1");
    expect(entry.windowId).toBe(42);
    expect(entry.source).toBe("extension");
    expect(entry.tabs).toEqual([]);
    expect(typeof entry.id).toBe("string");
    expect(entry.id.length).toBeGreaterThan(0);
    expect(typeof entry.label).toBe("string");
    expect(entry.label.length).toBeGreaterThan(0);
  });

  it("passes through tabs array", () => {
    const addSavedCollection = vi.fn();
    const tab = { id: 1, url: "https://example.com", title: "Example" };
    tabsSaveHandler({ ...basePayload, tabs: [tab] }, { addSavedCollection });
    expect(addSavedCollection.mock.calls[0][0].tabs).toEqual([tab]);
  });
});
