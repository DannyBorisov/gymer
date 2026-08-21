import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middlewares/auth.js";
import { getBodyWeight, saveBodyWeight } from "../handlers/profile.js";
import type { SaveBodyWeightRequest } from "../types.js";

const profileRoutes: FastifyPluginAsync = async (server) => {
  server.get("/body-weight", { preHandler: requireAuth }, getBodyWeight);

  server.post<{ Body: SaveBodyWeightRequest }>(
    "/body-weight",
    { preHandler: requireAuth },
    saveBodyWeight,
  );
};

export default profileRoutes;
