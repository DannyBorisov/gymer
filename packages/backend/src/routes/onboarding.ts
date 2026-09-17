import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middlewares/auth.js";
import { getOnboarding, saveOnboarding } from "../handlers/onboarding.js";
import type { SaveOnboardingBodyType } from "../schemas/onboarding.js";

const OnboardingRoutes: FastifyPluginAsync = async (server) => {
  server.get("/", { preHandler: requireAuth }, getOnboarding);
  server.put<{ Body: SaveOnboardingBodyType }>(
    "/",
    { preHandler: requireAuth },
    saveOnboarding,
  );
};

export default OnboardingRoutes;
