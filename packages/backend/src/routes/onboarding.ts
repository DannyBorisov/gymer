import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middlewares/auth.js";
import { getOnboarding, saveOnboarding } from "../handlers/onboarding.js";

const OnboardingRoutes: FastifyPluginAsync = async (server) => {
  server.get("/", { preHandler: requireAuth }, getOnboarding);
  server.put("/", { preHandler: requireAuth }, saveOnboarding);
};

export default OnboardingRoutes;
