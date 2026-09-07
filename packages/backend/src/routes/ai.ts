import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middlewares/auth.js";
import { getWorkoutTip } from "../handlers/ai.js";

interface WorkoutTipBodySchema {
  programId: string;
  week: number;
  workoutName: string;
}

type WorkoutTipBody = WorkoutTipBodySchema;

const aiRoutes: FastifyPluginAsync = async (server) => {
  server.post<{ Body: WorkoutTipBody }>(
    "/workout-tip",
    { preHandler: requireAuth },
    getWorkoutTip,
  );
};

export default aiRoutes;
