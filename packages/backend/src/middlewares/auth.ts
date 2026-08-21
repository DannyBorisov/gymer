import type { FastifyRequest, FastifyReply } from "fastify";
import { getSession, type SessionData } from "../routes/auth.js";

// Extend FastifyRequest to include session
declare module "fastify" {
  interface FastifyRequest {
    session: SessionData;
  }
}

// Type for authenticated session (with tokens guaranteed)
export interface AuthenticatedSession {
  tokens: NonNullable<SessionData["tokens"]>;
  user?: SessionData["user"];
}

// Middleware that requires authentication
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const session = getSession(request);

  if (!session.tokens) {
    return reply.status(401).send({ error: "Not authenticated" });
  }

  // Attach session to request for use in route handlers
  request.session = session;
}

// Helper to get typed session from request (use after requireAuth)
export function getAuthSession(request: FastifyRequest): AuthenticatedSession {
  return request.session as AuthenticatedSession;
}
