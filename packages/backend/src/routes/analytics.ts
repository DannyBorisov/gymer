import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middlewares/auth.js";
import {
  getExerciseProgression,
  getExerciseBests,
  getOneRepMaxRecords,
  saveOneRepMax,
} from "../handlers/analytics.js";

interface SaveOneRepMaxBody {
  exercise: string;
  weight: number;
}

export const analyticsRoutes: FastifyPluginAsync = async (server) => {
  server.get("/progression", { preHandler: requireAuth }, getExerciseProgression);
  server.get("/bests", { preHandler: requireAuth }, getExerciseBests);
  server.get("/1rm", { preHandler: requireAuth }, getOneRepMaxRecords);
  server.post<{ Body: SaveOneRepMaxBody }>(
    "/1rm",
    { preHandler: requireAuth },
    saveOneRepMax,
  );
};
