import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middlewares/auth.js";
import {
  getExercises,
  saveQuickWorkout,
  getWorkoutHistory,
  getWorkoutDetail,
  getWorkoutTemplates,
  createWorkoutTemplate,
  deleteWorkoutTemplate,
} from "../handlers/workouts.js";
import type {
  SaveQuickWorkoutBodyType,
  GetWorkoutDetailParamsType,
  GetWorkoutDetailQueryType,
  CreateWorkoutTemplateBodyType,
  DeleteWorkoutTemplateParamsType,
} from "../schemas/workouts.js";

const quickWorkoutRoutes: FastifyPluginAsync = async (server) => {
  server.get("/exercises", { preHandler: requireAuth }, getExercises);

  server.post<{ Body: SaveQuickWorkoutBodyType }>(
    "/save",
    { preHandler: requireAuth },
    saveQuickWorkout,
  );
};

const workoutTemplateRoutes: FastifyPluginAsync = async (server) => {
  server.get("/", { preHandler: requireAuth }, getWorkoutTemplates);

  server.post<{ Body: CreateWorkoutTemplateBodyType }>(
    "/",
    { preHandler: requireAuth },
    createWorkoutTemplate,
  );

  server.delete<{ Params: DeleteWorkoutTemplateParamsType }>(
    "/:id",
    { preHandler: requireAuth },
    deleteWorkoutTemplate,
  );
};

const workoutRoutes: FastifyPluginAsync = async (server) => {
  server.get("/history", { preHandler: requireAuth }, getWorkoutHistory);
  server.get<{
    Params: GetWorkoutDetailParamsType;
    Querystring: GetWorkoutDetailQueryType;
  }>("/:id", { preHandler: requireAuth }, getWorkoutDetail);
};

export { quickWorkoutRoutes, workoutRoutes, workoutTemplateRoutes };
