import { z } from "zod";

export const SaveBodyWeightBodySchema = z.object({
  weight: z.number().positive(),
});
export type SaveBodyWeightBodyType = z.infer<typeof SaveBodyWeightBodySchema>;
