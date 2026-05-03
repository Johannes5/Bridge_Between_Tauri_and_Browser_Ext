import { z } from "zod";

export const FocusWindowPayloadSchema = z.object({
  hwnd: z.number().int().optional()
});

export const WindowInfoSchema = z.object({
  hwnd: z.number().int(),
  pid: z.number().int(),
  title: z.string(),
});

export const WindowsListPayloadSchema = z.object({
  windows: z.array(WindowInfoSchema),
  connectionId: z.string(),
  hwnds: z.any()
});

export type WindowInfo = z.infer<typeof WindowInfoSchema>;
export type WindowsListPayload = z.infer<typeof WindowsListPayloadSchema>;

