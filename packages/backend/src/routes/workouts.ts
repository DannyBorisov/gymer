import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middlewares/auth.js";
import {
  getExercises,
  saveQuickWorkout,
  getWorkoutHistory,
  getWorkoutDetail,
} from "../handlers/workouts.js";
import type {
  SaveQuickWorkoutBodyType,
  GetWorkoutDetailParamsType,
  GetWorkoutDetailQueryType,
} from "../schemas/workouts.js";

const quickWorkoutRoutes: FastifyPluginAsync = async (server) => {
  server.get("/exercises", { preHandler: requireAuth }, getExercises);

  server.post<{ Body: SaveQuickWorkoutBodyType }>(
    "/save",
    { preHandler: requireAuth },
    saveQuickWorkout,
  );
};

const workoutRoutes: FastifyPluginAsync = async (server) => {
  server.get("/history", { preHandler: requireAuth }, getWorkoutHistory);
  server.get<{
    Params: GetWorkoutDetailParamsType;
    Querystring: GetWorkoutDetailQueryType;
  }>("/:id", { preHandler: requireAuth }, getWorkoutDetail);
};

export { quickWorkoutRoutes, workoutRoutes };
