import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middlewares/auth.js";
import {
  getWorkoutTip,
  generateAiProgram,
  getPlateauAdvice,
} from "../handlers/ai.js";
import type {
  WorkoutTipBodyType,
  GenerateProgramBodyType,
  PlateauAdviceBodyType,
} from "../schemas/ai.js";

const aiRoutes: FastifyPluginAsync = async (server) => {
  server.post<{ Body: WorkoutTipBodyType }>(
    "/workout-tip",
    { preHandler: requireAuth },
    getWorkoutTip,
  );

  server.post<{ Body: GenerateProgramBodyType }>(
    "/generate-program",
    { preHandler: requireAuth },
    generateAiProgram,
  );

  server.post<{ Body: PlateauAdviceBodyType }>(
    "/plateau-advice",
    { preHandler: requireAuth },
    getPlateauAdvice,
  );
};

export default aiRoutes;
