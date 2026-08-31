import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middlewares/auth.js";
import { getBodyWeight, saveBodyWeight } from "../handlers/profile.js";

const ProfileRoutes: FastifyPluginAsync = async (server) => {
  server.get("/body-weight", { preHandler: requireAuth }, getBodyWeight);

  server.post<{ Body: { weight: number } }>(
    "/body-weight",
    { preHandler: requireAuth },
    saveBodyWeight,
  );
};

export default ProfileRoutes;
