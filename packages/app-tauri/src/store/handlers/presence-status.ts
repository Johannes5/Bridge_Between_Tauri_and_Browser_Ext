import type { PresenceStatusPayload, Envelope } from "shared-proto";
import type { PresenceState } from "../../types";

export interface PresenceStatusDeps {
  setPresence: (update: Partial<PresenceState>) => void;
  removeConnection: (connectionId: string) => void;
  sendEnvelope: (envelope: Envelope) => Promise<void>;
}

export const presenceStatusHandler = (payload: PresenceStatusPayload, deps: PresenceStatusDeps): void => {
  deps.setPresence({
    app: payload.app,
    extension: payload.extension,
    sidecar: payload.sidecar,
    timestamp: payload.timestamp ?? Date.now(),
  });

  if (payload.sidecar === "offline" && payload.connectionId) {
    deps.removeConnection(payload.connectionId);
  } else if (payload.connectionId && payload.browser && payload.sidecar !== "offline") {
    deps.sendEnvelope({
      v: 1,
      type: "tabs.list.request",
      id: `auto-req-${Date.now()}`,
      payload: { connectionId: payload.connectionId },
    });
  }
};
