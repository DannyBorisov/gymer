import { z } from "zod";

// ============ POST /body-weight ============

export const SaveBodyWeightBodySchema = z.object({
  weight: z.number(),
});
export type SaveBodyWeightBodyType = z.infer<typeof SaveBodyWeightBodySchema>;
