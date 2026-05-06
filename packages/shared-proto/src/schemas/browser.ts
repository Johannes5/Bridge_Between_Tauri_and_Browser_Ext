import { z } from "zod";

export const BrowserInfoPayloadSchema = z.object({
    browser: z.string().optional()
});

export type BrowserInfoPayload = z.infer<typeof BrowserInfoPayloadSchema>;
