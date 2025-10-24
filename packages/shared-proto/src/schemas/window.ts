import { z } from "zod";

export const FocusWindowPayloadSchema = z.object({
  windowId: z.number().int().optional(),
  title: z.string().optional(),
  url: z.string().optional(),
  browser: z.string().optional(),
  connectionId: z.string().optional()
});

export type FocusWindowPayload = z.infer<typeof FocusWindowPayloadSchema>;

