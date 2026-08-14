import Fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";
import fastifyStatic from "@fastify/static";
import path from "path";
import { fileURLToPath } from "url";
import config from "./config.js";
import googleSheetsPlugin, { type UserInfo } from "./plugins/googleSheets.js";

declare module "@fastify/session" {
  interface FastifySessionObject {
    tokens?: {
      access_token: string;
      refresh_token?: string;
      expiry_date?: number;
    };
    user?: UserInfo;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({
  logger: true,
});

// Register session plugins
fastify.register(fastifyCookie);
fastify.register(fastifySession, {
  secret: config.env.SESSION_SECRET,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
});

// Register plugins
fastify.register(googleSheetsPlugin);

// Serve static files from the React build folder
fastify.register(fastifyStatic, {
  root: path.join(__dirname, "../frontend/dist"),
  prefix: "/",
});

// API routes
fastify.get("/api/health", async () => {
  return { status: "ok" };
});

// Google OAuth routes
fastify.get("/auth/google", async (_request, reply) => {
  const authUrl = fastify.sheets.getAuthUrl();
  return reply.redirect(authUrl);
});

fastify.get("/auth/google/callback", async (request, reply) => {
  const { code } = request.query as { code: string };
  if (!code) {
    return reply.status(400).send({ error: "Missing code parameter" });
  }

  try {
    const { tokens, user } = await fastify.sheets.handleCallback(code);
    request.session.tokens = tokens;
    request.session.user = user;
    return reply.redirect("/");
  } catch (error) {
    fastify.log.error(error);
    return reply.redirect("/login?error=auth_failed");
  }
});

fastify.get("/api/auth/google/status", async (request) => {
  return {
    authenticated: !!request.session.tokens,
    user: request.session.user || null,
  };
});

fastify.post("/api/auth/logout", async (request) => {
  request.session.destroy();
  return { success: true };
});

// Fallback to index.html for client-side routing
fastify.setNotFoundHandler(async (_request, reply) => {
  return reply.sendFile("index.html");
});

const start = async () => {
  try {
    await fastify.listen({ port: config.env.PORT, host: "0.0.0.0" });
    console.log(`Server running on http://localhost:${config.env.PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
