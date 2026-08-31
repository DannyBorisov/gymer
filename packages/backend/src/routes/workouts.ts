import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middlewares/auth.js";
import {
  getExercises,
  saveQuickWorkout,
  getWorkoutHistory,
  getWorkoutDetail,
} from "../handlers/workouts.js";
import type { CreateQuickWorkoutInput } from "../dal/types.js";

const quickWorkoutRoutes: FastifyPluginAsync = async (server) => {
  server.get("/exercises", { preHandler: requireAuth }, getExercises);

  server.post<{ Body: CreateQuickWorkoutInput }>(
    "/save",
    { preHandler: requireAuth },
    saveQuickWorkout,
  );
};

const workoutRoutes: FastifyPluginAsync = async (server) => {
  server.get("/history", { preHandler: requireAuth }, getWorkoutHistory);
  server.get<{
    Params: { id: string };
    Querystring: {
      type: string;
      programId?: string;
      week?: string;
      workout?: string;
    };
  }>("/:id", { preHandler: requireAuth }, getWorkoutDetail);
};

export { quickWorkoutRoutes, workoutRoutes };
