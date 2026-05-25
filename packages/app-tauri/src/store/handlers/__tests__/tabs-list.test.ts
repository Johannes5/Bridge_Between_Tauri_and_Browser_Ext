// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { tabsListHandler } from "../tabs-list";
import type { TabsListPayload } from "shared-proto";

const basePayload: TabsListPayload = {
  tabs: [],
  connectionId: "conn-1",
  browser: "chrome",
};

describe("tabsListHandler", () => {
  it("calls updateBrowserSnapshot when connectionId and browser are present", () => {
    const updateBrowserSnapshot = vi.fn();
    tabsListHandler(basePayload, { updateBrowserSnapshot });
    expect(updateBrowserSnapshot).toHaveBeenCalledWith("conn-1", "chrome", basePayload);
  });

  it("does nothing when connectionId is missing", () => {
    const updateBrowserSnapshot = vi.fn();
    tabsListHandler({ tabs: [] }, { updateBrowserSnapshot });
    expect(updateBrowserSnapshot).not.toHaveBeenCalled();
  });

  it("does nothing when browser is missing", () => {
    const updateBrowserSnapshot = vi.fn();
    tabsListHandler({ tabs: [], connectionId: "conn-1" }, { updateBrowserSnapshot });
    expect(updateBrowserSnapshot).not.toHaveBeenCalled();
  });
});
