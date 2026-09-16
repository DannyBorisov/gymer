import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middlewares/auth.js";
import { getWorkoutTip, generateAiProgram } from "../handlers/ai.js";

interface WorkoutTipBodySchema {
  programId: string;
  week: number;
  workoutName: string;
}

type WorkoutTipBody = WorkoutTipBodySchema;

interface GenerateProgramBody {
  durationWeeks: number;
  frequency: number;
}

const aiRoutes: FastifyPluginAsync = async (server) => {
  server.post<{ Body: WorkoutTipBody }>(
    "/workout-tip",
    { preHandler: requireAuth },
    getWorkoutTip,
  );

  server.post<{ Body: GenerateProgramBody }>(
    "/generate-program",
    { preHandler: requireAuth },
    generateAiProgram,
  );
};

export default aiRoutes;
