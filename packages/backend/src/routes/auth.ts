import type { FastifyPluginAsync } from "fastify";
import {
  getAuthUrl,
  handleCallback,
  getAuthStatus,
  logout,
  handleNativeAuth,
} from "../handlers/auth.js";
import type {
  GetAuthUrlQueryType,
  HandleCallbackQueryType,
  HandleNativeAuthBodyType,
} from "../schemas/auth.js";

export const oauthRoutes: FastifyPluginAsync = async (server) => {
  server.get<{ Querystring: GetAuthUrlQueryType }>("/google", getAuthUrl);

  server.get<{ Querystring: HandleCallbackQueryType }>(
    "/google/callback",
    handleCallback,
  );
};

export const authApiRoutes: FastifyPluginAsync = async (server) => {
  server.get("/google/status", getAuthStatus);

  server.post("/logout", logout);

  server.post<{ Body: HandleNativeAuthBodyType }>(
    "/google/native",
    handleNativeAuth,
  );
};
