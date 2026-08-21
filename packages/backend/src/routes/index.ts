import type { FastifyPluginAsync } from "fastify";
import { authApiRoutes } from "./auth.js";
import { programCreateRoute, programsRoutes } from "./programs.js";
import { quickWorkoutRoutes, workoutRoutes } from "./workouts.js";
import profileRoutes from "./profile.js";
import { analyticsRoutes } from "./analytics.js";

const routes: FastifyPluginAsync = async (server) => {
  server.register(authApiRoutes, { prefix: "/auth" });
  server.register(programCreateRoute, { prefix: "/program" });
  server.register(programsRoutes, { prefix: "/programs" });
  server.register(quickWorkoutRoutes, { prefix: "/quick-workouts" });
  server.register(workoutRoutes, { prefix: "/workouts" });
  server.register(profileRoutes);
  server.register(analyticsRoutes, { prefix: "/analytics" });
};

export default routes;
