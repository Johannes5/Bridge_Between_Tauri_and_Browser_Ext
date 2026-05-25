// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { presenceStatusHandler } from "../presence-status";
import type { PresenceStatusPayload } from "shared-proto";

const makeDeps = () => ({
  setPresence: vi.fn(),
  removeConnection: vi.fn(),
  sendEnvelope: vi.fn().mockResolvedValue(undefined),
});

describe("presenceStatusHandler", () => {
  it("updates presence state with all fields", () => {
    const deps = makeDeps();
    const payload: PresenceStatusPayload = { app: "online", sidecar: "online", extension: "online" };
    presenceStatusHandler(payload, deps);
    expect(deps.setPresence).toHaveBeenCalledWith(
      expect.objectContaining({ app: "online", sidecar: "online", extension: "online" })
    );
  });

  it("removes connection when sidecar goes offline", () => {
    const deps = makeDeps();
    const payload: PresenceStatusPayload = { sidecar: "offline", connectionId: "conn-1" };
    presenceStatusHandler(payload, deps);
    expect(deps.removeConnection).toHaveBeenCalledWith("conn-1");
    expect(deps.sendEnvelope).not.toHaveBeenCalled();
  });

  it("requests tabs.list.request when a new connection appears", () => {
    const deps = makeDeps();
    const payload: PresenceStatusPayload = { sidecar: "online", connectionId: "conn-1", browser: "chrome" };
    presenceStatusHandler(payload, deps);
    expect(deps.sendEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "tabs.list.request",
        payload: { connectionId: "conn-1" },
      })
    );
    expect(deps.removeConnection).not.toHaveBeenCalled();
  });

  it("does not removeConnection when sidecar offline but no connectionId", () => {
    const deps = makeDeps();
    const payload: PresenceStatusPayload = { sidecar: "offline" };
    presenceStatusHandler(payload, deps);
    expect(deps.removeConnection).not.toHaveBeenCalled();
    expect(deps.sendEnvelope).not.toHaveBeenCalled();
  });

  it("does not request tabs when browser is missing", () => {
    const deps = makeDeps();
    const payload: PresenceStatusPayload = { sidecar: "online", connectionId: "conn-1" };
    presenceStatusHandler(payload, deps);
    expect(deps.sendEnvelope).not.toHaveBeenCalled();
  });
});
