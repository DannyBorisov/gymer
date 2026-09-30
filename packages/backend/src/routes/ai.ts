import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middlewares/auth.js";
import {
  getWorkoutTip,
  postWorkoutChat,
  generateAiProgram,
  getPlateauAdvice,
} from "../handlers/ai.js";
import type {
  WorkoutTipBodyType,
  WorkoutChatBodyType,
  GenerateProgramBodyType,
  PlateauAdviceBodyType,
} from "../schemas/ai.js";

const aiRoutes: FastifyPluginAsync = async (server) => {
  server.post<{ Body: WorkoutTipBodyType }>(
    "/workout-tip",
    { preHandler: requireAuth },
    getWorkoutTip,
  );

  server.post<{ Body: WorkoutChatBodyType }>(
    "/workout-chat",
    { preHandler: requireAuth },
    postWorkoutChat,
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
