import { z } from "zod";
import { EnvelopeSchema } from "../schemas/envelope.js";
import {
  PresenceQueryPayloadSchema,
  PresenceStatusPayloadSchema
} from "../schemas/presence.js";
import {
  TabsListPayloadSchema,
  TabsOpenOrFocusPayloadSchema,
  TabsSavedPayloadSchema,
  TabsRestorePayloadSchema
} from "../schemas/tabs.js";

export const isEnvelope = (value: unknown): value is ReturnType<typeof EnvelopeSchema.parse> => {
  try {
    EnvelopeSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const payloadParsers = {
  "tabs.list": TabsListPayloadSchema,
  "tabs.list.request": z.undefined().optional(),
  "tabs.openOrFocus": TabsOpenOrFocusPayloadSchema,
  "tabs.save": TabsSavedPayloadSchema,
  "tabs.restore": TabsRestorePayloadSchema,
  "presence.query": PresenceQueryPayloadSchema,
  "presence.status": PresenceStatusPayloadSchema
} as const;

export type BridgeMessageType = keyof typeof payloadParsers;
