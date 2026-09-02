import type { FastifyRequest, FastifyReply } from "fastify";
import type { SessionData } from "../lib/encryption.js";
import { getSession } from "../lib/session.js";

export interface AuthenticatedSession {
  tokens: NonNullable<SessionData["tokens"]>;
  user?: SessionData["user"];
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const session = getSession(request);

  if (!session.tokens) {
    return reply.status(401).send({ error: "Not authenticated" });
  }

  request.session = session;
}

export function getAuthSession(request: FastifyRequest): AuthenticatedSession {
  return request.session as AuthenticatedSession;
}
