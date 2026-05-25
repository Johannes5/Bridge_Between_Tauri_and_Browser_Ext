import type { TabsDeltaPayload } from "shared-proto";

export interface TabsDeltaDeps {
  applyBrowserDelta: (connectionId: string, payload: TabsDeltaPayload) => void;
}

export const tabsDeltaHandler = (payload: TabsDeltaPayload, deps: TabsDeltaDeps): void => {
  const { connectionId } = payload;
  if (connectionId) {
    deps.applyBrowserDelta(connectionId, payload);
  }
};
