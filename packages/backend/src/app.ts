import Fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import config from "./config.js";
import googleSheetsPlugin from "./plugins/googleSheets.js";
import routes from "./routes/index.js";
import { oauthRoutes } from "./routes/auth.js";

export function buildApp() {
  const fastify = Fastify({
    logger: true,
  });

  fastify.register(fastifyCookie, { secret: config.env.SESSION_SECRET });

  fastify.register(fastifyCors, {
    origin: [
      config.env.FRONTEND_URL,
      "https://gymerr.co",
      "https://www.gymerr.co",
      /\.vercel\.app$/,
      "capacitor://localhost",
      "ionic://localhost",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  fastify.register(googleSheetsPlugin);

  // OAuth routes at /auth (no /api prefix)
  fastify.register(oauthRoutes, { prefix: "/auth" });

  // API routes at /api
  fastify.register(routes, { prefix: "/api" });

  // Health check
  fastify.get("/api/health", async () => {
    return { status: "ok" };
  });

  return fastify;
}
