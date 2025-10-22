import { z } from "zod";

export const PresenceQueryPayloadSchema = z.object({
  requester: z.enum(["app", "extension", "sidecar"]).optional()
});

export type PresenceQueryPayload = z.infer<typeof PresenceQueryPayloadSchema>;

export const PresenceStatusPayloadSchema = z.object({
  app: z.enum(["online", "offline"]).optional(),
  extension: z.enum(["online", "offline"]).optional(),
  sidecar: z.enum(["online", "offline"]).optional(),
  timestamp: z.number().int().optional(),
  connectionId: z.string().optional(),
  browser: z.string().optional()
});

export type PresenceStatusPayload = z.infer<typeof PresenceStatusPayloadSchema>;
