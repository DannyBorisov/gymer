import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middlewares/auth.js";
import { getExerciseProgression } from "../handlers/analytics.js";

export const analyticsRoutes: FastifyPluginAsync = async (server) => {
  server.get("/progression", { preHandler: requireAuth }, getExerciseProgression);
};
