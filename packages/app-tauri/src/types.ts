import type { TabDescriptor, TabsListPayload } from "@bridge/shared-proto";

export type PresenceState = {
  app?: string;
  extension?: string;
  sidecar?: string;
  timestamp?: number;
};

export type LogEntry = {
  at: number;
  type: string;
  summary: string;
};

export type SavedTabCollection = {
  id: string;
  savedAt: number;
  windowId?: number | null;
  source?: string;
  label?: string | null;
  tabs: TabDescriptor[];
  browser?: string;
  connectionId?: string;
};

export type BrowserTabSnapshot = {
  browser: string;
  connectionId: string;
  payload: TabsListPayload;
  lastUpdate: number;
};
