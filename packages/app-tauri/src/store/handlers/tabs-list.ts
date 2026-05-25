import type { TabsListPayload } from "shared-proto";

export interface TabsListDeps {
  updateBrowserSnapshot: (connectionId: string, browser: string, payload: TabsListPayload) => void;
}

export const tabsListHandler = (payload: TabsListPayload, deps: TabsListDeps): void => {
  const { connectionId, browser } = payload;
  if (connectionId && browser) {
    deps.updateBrowserSnapshot(connectionId, browser, payload);
  }
};
