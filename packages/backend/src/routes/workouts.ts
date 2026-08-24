import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middlewares/auth.js";
import {
  createOrGetQuickWorkoutsSheet,
  getExercises,
  saveQuickWorkout,
  getWorkoutHistory,
  getWorkoutDetail,
} from "../handlers/workouts.js";
import type { SaveQuickWorkoutRequest } from "../types.js";

const quickWorkoutRoutes: FastifyPluginAsync = async (server) => {
  server.post("/", { preHandler: requireAuth }, createOrGetQuickWorkoutsSheet);

  server.get("/exercises", { preHandler: requireAuth }, getExercises);

  server.post<{ Body: SaveQuickWorkoutRequest }>(
    "/save",
    { preHandler: requireAuth },
    saveQuickWorkout,
  );
};

const workoutRoutes: FastifyPluginAsync = async (server) => {
  server.get("/history", { preHandler: requireAuth }, getWorkoutHistory);
  server.get("/:id", { preHandler: requireAuth }, getWorkoutDetail);
};

export { quickWorkoutRoutes, workoutRoutes };
