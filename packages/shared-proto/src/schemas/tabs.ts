import { z } from "zod";

const chromeSchemes = ["chrome://", "chrome-extension://", "edge://", "about:", "moz-extension://"];

const relaxedUrlBase = z.string().min(1).superRefine((value, ctx) => {
  const allowed = chromeSchemes.some((prefix) => value.startsWith(prefix));
  if (allowed) {
    return;
  }
  try {
    // Use WHATWG URL to validate standard URLs.
    // eslint-disable-next-line no-new
    new URL(value);
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.invalid_string, validation: "url" });
  }
});

const relaxedUrl = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, relaxedUrlBase.optional());

export const TabDescriptorSchema = z.object({
  id: z.number().int().nonnegative().optional().nullable(),
  url: relaxedUrl,
  title: z.string().optional(),
  favIconUrl: relaxedUrl,
  lastAccessed: z.number().int().optional(),
  windowId: z.number().int().optional(),
  groupId: z.number().int().optional(),
  pinned: z.boolean().optional()
});

export type TabDescriptor = z.infer<typeof TabDescriptorSchema>;

export const TabsListPayloadSchema = z.object({
  windowId: z.number().int().optional().nullable(),
  reason: z.string().optional(),
  tabs: z.array(TabDescriptorSchema)
});

export type TabsListPayload = z.infer<typeof TabsListPayloadSchema>;

export const TabsOpenOrFocusPayloadSchema = z.object({
  url: z.preprocess((value) => (typeof value === "string" ? value.trim() : value), relaxedUrlBase),
  preferWindowId: z.number().int().optional(),
  matchStrategy: z.enum(["exact", "origin", "path"]).default("exact")
});

export type TabsOpenOrFocusPayload = z.infer<typeof TabsOpenOrFocusPayloadSchema>;
