import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middlewares/auth.js";
import { getExercises, createExercise } from "../handlers/exercises.js";
import type { CreateExerciseBodyType } from "../schemas/exercises.js";

const ExercisesRoutes: FastifyPluginAsync = async (server) => {
  server.get("/", { preHandler: requireAuth }, getExercises);

  server.post<{ Body: CreateExerciseBodyType }>(
    "/",
    { preHandler: requireAuth },
    createExercise,
  );
};

export default ExercisesRoutes;
