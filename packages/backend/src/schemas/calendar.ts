import { z } from "zod";

export const GetCalendarNotesQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});
export type GetCalendarNotesQueryType = z.infer<typeof GetCalendarNotesQuerySchema>;

export const SaveCalendarNoteBodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().min(1).max(500),
});
export type SaveCalendarNoteBodyType = z.infer<typeof SaveCalendarNoteBodySchema>;

export const DeleteCalendarNoteParamsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type DeleteCalendarNoteParamsType = z.infer<typeof DeleteCalendarNoteParamsSchema>;
