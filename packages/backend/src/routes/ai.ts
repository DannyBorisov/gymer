import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middlewares/auth.js";
import { getWorkoutTip } from "../handlers/ai.js";

const aiRoutes: FastifyPluginAsync = async (server) => {
  server.post<{
    Body: { programId: string; week: number; workoutName: string };
  }>("/workout-tip", { preHandler: requireAuth }, getWorkoutTip);
};

export default aiRoutes;
