import {
  TabsListPayloadSchema,
  TabsDeltaPayloadSchema,
  TabsSavedPayloadSchema,
  PresenceStatusPayloadSchema,
  type Envelope,
} from "shared-proto";
import { tabsListHandler, type TabsListDeps } from "./handlers/tabs-list";
import { tabsDeltaHandler, type TabsDeltaDeps } from "./handlers/tabs-delta";
import { tabsSaveHandler, type TabsSaveDeps } from "./handlers/tabs-save";
import { presenceStatusHandler, type PresenceStatusDeps } from "./handlers/presence-status";
import { errorHandler, type ErrorDeps } from "./handlers/error";

export type AllHandlerDeps = TabsListDeps & TabsDeltaDeps & TabsSaveDeps & PresenceStatusDeps & ErrorDeps;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHandler = (payload: any, deps: AllHandlerDeps) => void;

const registry: Record<string, { schema: { parse: (v: unknown) => unknown } | null; handler: AnyHandler }> = {
  "tabs.list":       { schema: TabsListPayloadSchema,        handler: tabsListHandler },
  "tabs.delta":      { schema: TabsDeltaPayloadSchema,       handler: tabsDeltaHandler },
  "tabs.save":       { schema: TabsSavedPayloadSchema,       handler: tabsSaveHandler },
  "presence.status": { schema: PresenceStatusPayloadSchema,  handler: presenceStatusHandler },
  "error":           { schema: null,                         handler: errorHandler },
};

export const dispatch = (envelope: Envelope, deps: AllHandlerDeps): void => {
  const entry = registry[envelope.type];
  if (!entry) return;
  const payload = entry.schema ? entry.schema.parse(envelope.payload) : envelope.payload;
  entry.handler(payload, deps);
};
