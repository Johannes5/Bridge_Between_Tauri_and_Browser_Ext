import { z } from "zod";

/**
 * Envelope shared by every bridge message. Acts as a light-weight JSON-RPC wrapper.
 */
export const EnvelopeSchema = z.object({
  v: z.literal(1),
  id: z.string().min(1).optional(),
  type: z.string().min(1),
  payload: z.unknown().optional()
});

export type Envelope = z.infer<typeof EnvelopeSchema>;

export const EnvelopeWithPayloadSchema = <T extends z.ZodTypeAny>(payload: T) =>
  EnvelopeSchema.extend({
    payload
  });
