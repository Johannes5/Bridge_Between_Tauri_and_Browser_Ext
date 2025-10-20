import { z } from "zod";

export const TabDescriptorSchema = z.object({
  id: z.number().int().nonnegative().optional().nullable(),
  url: z.string().url().optional(),
  title: z.string().optional(),
  favIconUrl: z.string().url().optional(),
  lastAccessed: z.number().int().optional(),
  windowId: z.number().int().optional(),
  groupId: z.number().int().optional(),
  pinned: z.boolean().optional()
});

export type TabDescriptor = z.infer<typeof TabDescriptorSchema>;

export const TabsListPayloadSchema = z.object({
  windowId: z.number().int().optional().nullable(),
  tabs: z.array(TabDescriptorSchema)
});

export type TabsListPayload = z.infer<typeof TabsListPayloadSchema>;

export const TabsOpenOrFocusPayloadSchema = z.object({
  url: z.string().url(),
  preferWindowId: z.number().int().optional(),
  matchStrategy: z.enum(["exact", "origin", "path"]).default("exact")
});

export type TabsOpenOrFocusPayload = z.infer<typeof TabsOpenOrFocusPayloadSchema>;
