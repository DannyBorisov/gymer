import type { FastifyPluginAsync } from "fastify";
import { authApiRoutes } from "./auth.js";
import ProgramsRoutes from "./programs.js";
import { quickWorkoutRoutes, workoutRoutes } from "./workouts.js";
import AnalyticsRoutes from "./analytics.js";
import ProfileRoutes from "./profile.js";
import AiRoutes from "./ai.js";
import { SessionData } from "../lib/encryption.js";

declare module "fastify" {
  interface FastifyRequest {
    session: SessionData;
  }
}

const routes: FastifyPluginAsync = async (server) => {
  server.register(authApiRoutes, { prefix: "/auth" });
  server.register(ProgramsRoutes, { prefix: "/programs" });
  server.register(quickWorkoutRoutes, { prefix: "/quick-workouts" });
  server.register(workoutRoutes, { prefix: "/workouts" });
  server.register(ProfileRoutes);
  server.register(AnalyticsRoutes, { prefix: "/analytics" });
  server.register(AiRoutes, { prefix: "/ai" });
};

export default routes;
