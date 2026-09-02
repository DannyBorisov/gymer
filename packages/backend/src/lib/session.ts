import { FastifyReply } from "fastify";
import { NodeEnv } from "../config.js";
import { encrypt, decrypt } from "./encryption.js";
import type { SessionData } from "./encryption.js";

export function setSession(reply: FastifyReply, data: SessionData) {
  const isProduction = process.env.NODE_ENV === NodeEnv.Production;
  reply.setCookie("session", encrypt(data), {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function getSession(request: {
  cookies: Record<string, string | undefined>;
  headers: { authorization?: string | string[] };
}): SessionData {
  const authHeader = request.headers.authorization;
  const authValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (authValue?.startsWith("Bearer ")) {
    const token = authValue.slice(7);
    return decrypt(token) || {};
  }

  const sessionCookie = request.cookies.session;
  if (!sessionCookie) return {};
  return decrypt(sessionCookie) || {};
}
