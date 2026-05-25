import type { TabsSavedPayload } from "shared-proto";
import type { SavedTabCollection } from "../../types";
import { formatSavedWindowLabel } from "../../utils/savedWindowLabel";

export interface TabsSaveDeps {
  addSavedCollection: (entry: SavedTabCollection) => void;
}

export const tabsSaveHandler = (payload: TabsSavedPayload, deps: TabsSaveDeps): void => {
  const savedAt = payload.savedAt ?? Date.now();
  const entry: SavedTabCollection = {
    id: `${savedAt}-${Math.random()}`,
    savedAt,
    windowId: payload.windowId,
    source: payload.source,
    label: formatSavedWindowLabel(savedAt),
    tabs: payload.tabs,
    browser: payload.browser,
    connectionId: payload.connectionId,
  };
  deps.addSavedCollection(entry);
};
