import type { FastifyPluginAsync } from "fastify";
import { NodeEnv } from "../config.js";
import {
  getAuthUrl,
  handleCallback,
  getAuthStatus,
  logout,
  handleNativeAuth,
} from "../handlers/auth.js";
import { decrypt, encrypt, SessionData } from "../lib/encryption.js";

export function getSession(request: {
  cookies: Record<string, string | undefined>;
  headers: { authorization?: string | string[] };
}): SessionData {
  // Check for Authorization header first (native app)
  const authHeader = request.headers.authorization;
  const authValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (authValue?.startsWith("Bearer ")) {
    const token = authValue.slice(7);
    return decrypt(token) || {};
  }

  // Fall back to cookie (web)
  const sessionCookie = request.cookies.session;
  if (!sessionCookie) return {};
  return decrypt(sessionCookie) || {};
}

export function setSession(
  reply: {
    setCookie: (name: string, value: string, options: object) => void;
  },
  data: SessionData,
) {
  const isProduction = process.env.NODE_ENV === NodeEnv.Production;
  reply.setCookie("session", encrypt(data), {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export function clearSession(reply: {
  clearCookie: (name: string, options: object) => void;
}) {
  reply.clearCookie("session", { path: "/" });
}

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
