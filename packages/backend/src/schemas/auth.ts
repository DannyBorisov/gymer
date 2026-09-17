import { z } from "zod";

export const GetAuthUrlQuerySchema = z.object({
  native: z.string().optional(),
});
export type GetAuthUrlQueryType = z.infer<typeof GetAuthUrlQuerySchema>;

export const HandleCallbackQuerySchema = z.object({
  code: z.string(),
  state: z.string().optional(),
});
export type HandleCallbackQueryType = z.infer<typeof HandleCallbackQuerySchema>;

export const HandleNativeAuthBodySchema = z.object({
  code: z.string(),
});
export type HandleNativeAuthBodyType = z.infer<
  typeof HandleNativeAuthBodySchema
>;
