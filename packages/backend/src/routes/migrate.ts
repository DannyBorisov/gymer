import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middlewares/auth.js";
import { migrateToFirebase } from "../handlers/migrate.js";

const MigrateRoutes: FastifyPluginAsync = async (server) => {
  // POST /api/migrate - Migrate Google Sheets to Firebase Storage
  server.post("/", { preHandler: requireAuth }, migrateToFirebase);
};

export default MigrateRoutes;
