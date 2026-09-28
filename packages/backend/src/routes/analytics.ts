import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middlewares/auth.js";
import {
  getExerciseProgression,
  getExerciseBests,
  getAnalyticsSummary,
  getPersonalRecords,
  getWorkoutConsistency,
  getMuscleGroupVolume,
  getMuscleRecovery,
} from "../handlers/analytics.js";

const AnalyticsRoutes: FastifyPluginAsync = async (server) => {
  server.get(
    "/progression",
    { preHandler: requireAuth },
    getExerciseProgression,
  );
  server.get("/bests", { preHandler: requireAuth }, getExerciseBests);
  server.get("/summary", { preHandler: requireAuth }, getAnalyticsSummary);
  server.get("/records", { preHandler: requireAuth }, getPersonalRecords);
  server.get(
    "/consistency",
    { preHandler: requireAuth },
    getWorkoutConsistency,
  );
  server.get("/volume", { preHandler: requireAuth }, getMuscleGroupVolume);
  server.get("/recovery", { preHandler: requireAuth }, getMuscleRecovery);
};

export default AnalyticsRoutes;
