// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { tabsDeltaHandler } from "../tabs-delta";
import type { TabsDeltaPayload } from "shared-proto";

const basePayload: TabsDeltaPayload = {
  added: [],
  updated: [],
  removed: [],
  connectionId: "conn-1",
};

describe("tabsDeltaHandler", () => {
  it("calls applyBrowserDelta when connectionId is present", () => {
    const applyBrowserDelta = vi.fn();
    tabsDeltaHandler(basePayload, { applyBrowserDelta });
    expect(applyBrowserDelta).toHaveBeenCalledWith("conn-1", basePayload);
  });

  it("does nothing when connectionId is missing", () => {
    const applyBrowserDelta = vi.fn();
    tabsDeltaHandler({ added: [], updated: [], removed: [] }, { applyBrowserDelta });
    expect(applyBrowserDelta).not.toHaveBeenCalled();
  });
});
