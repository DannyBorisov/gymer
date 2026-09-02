import Fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import config from "./config.js";
import googleSheetsPlugin from "./plugins/googleSheets.js";
import firestorePlugin from "./plugins/firestore.js";
import genaiPlugin from "./plugins/genai.js";
import routes from "./routes/index.js";
import { oauthRoutes } from "./routes/auth.js";
import CorsConfig from "./cors.js";

export function buildApp() {
  const fastify = Fastify({
    logger: {
      transport: {
        target: "pino-pretty",
        options: {
          colorize: false,
          singleLine: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname,req,res,reqId,responseTime",
          messageFormat: "{msg}",
        },
      },
    },
  });

  fastify.register(fastifyCookie, { secret: config.env.SESSION_SECRET });
  fastify.register(fastifyCors, CorsConfig);
  fastify.register(googleSheetsPlugin);
  fastify.register(firestorePlugin);
  fastify.register(genaiPlugin);

  fastify.register(oauthRoutes, { prefix: "/auth" });
  fastify.register(routes, { prefix: "/api" });

  fastify.get("/api/health", async () => {
    return { status: "ok" };
  });

  return fastify;
}
