import type { FastifyPluginAsync } from "fastify";
import {
  getAuthUrl,
  handleCallback,
  getAuthStatus,
  logout,
  handleNativeAuth,
} from "../handlers/auth.js";

export const oauthRoutes: FastifyPluginAsync = async (server) => {
  server.get<{ Querystring: { native?: string } }>("/google", getAuthUrl);

  server.get<{ Querystring: { code: string; state?: string } }>(
    "/google/callback",
    handleCallback,
  );
};

export const authApiRoutes: FastifyPluginAsync = async (server) => {
  server.get("/google/status", getAuthStatus);

  server.post("/logout", logout);

  server.post<{ Body: { code: string } }>("/google/native", handleNativeAuth);
};
