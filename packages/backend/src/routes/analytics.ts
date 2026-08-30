import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middlewares/auth.js";
import {
  getExerciseProgression,
  getExerciseBests,
} from "../handlers/analytics.js";

const AnalyticsRoutes: FastifyPluginAsync = async (server) => {
  server.get(
    "/progression",
    { preHandler: requireAuth },
    getExerciseProgression,
  );
  server.get("/bests", { preHandler: requireAuth }, getExerciseBests);
};

export default AnalyticsRoutes;
