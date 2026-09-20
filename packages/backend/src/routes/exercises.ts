import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middlewares/auth.js";
import { getExercises } from "../handlers/exercises.js";

const ExercisesRoutes: FastifyPluginAsync = async (server) => {
  server.get("/", { preHandler: requireAuth }, getExercises);
};

export default ExercisesRoutes;
