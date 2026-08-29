import type { RouteHandler } from "fastify";
import config from "../config.js";
import { getSession, setSession, clearSession } from "../routes/auth.js";
import { encrypt } from "../lib/encryption.js";

export const getAuthUrl: RouteHandler<{
  Querystring: { native?: string };
}> = async function (request, reply) {
  const { native } = request.query;
  const state = native === "true" ? "native" : "web";
  const authUrl = this.sheets.getAuthUrl(state);
  return reply.redirect(authUrl);
};

export const handleCallback: RouteHandler<{
  Querystring: { code: string; state?: string };
}> = async function (request, reply) {
  const { code, state } = request.query;

  if (!code) {
    return reply.status(400).send({ error: "Missing code parameter" });
  }

  // For native app, pass code directly - app will exchange it
  if (state === "native") {
    return reply.redirect(
      `gymerr://auth/callback?code=${encodeURIComponent(code)}`,
    );
  }

  // For web, exchange code here
  try {
    const { tokens, user } = await this.sheets.handleCallback(code);

    try {
      await this.firestore.upsertUser(user);
    } catch (firestoreError) {
      this.log.warn(
        { err: firestoreError },
        "Failed to upsert user to Firestore",
      );
    }

    setSession(reply, { tokens, user });
    return reply.redirect(config.env.FRONTEND_URL);
  } catch (error) {
    this.log.error(error);
    return reply.redirect(`${config.env.FRONTEND_URL}/login?error=auth_failed`);
  }
};

export const getAuthStatus: RouteHandler = async function (request) {
  const session = getSession(request);
  return {
    authenticated: !!session.tokens,
    user: session.user || null,
  };
};

export const logout: RouteHandler = async function (_request, reply) {
  clearSession(reply);
  return { success: true };
};

export const handleNativeAuth: RouteHandler<{
  Body: { code: string };
}> = async function (request, reply) {
  const { code } = request.body;

  if (!code) {
    return reply.status(400).send({ error: "Missing auth code" });
  }

  try {
    const { tokens, user } = await this.sheets.handleCallback(code);
    try {
      await this.firestore.upsertUser(user);
    } catch (firestoreError) {
      this.log.warn(
        { err: firestoreError },
        "Failed to upsert user to Firestore",
      );
    }

    const sessionToken = encrypt({ tokens, user });

    return { success: true, user, sessionToken };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to exchange auth code" });
  }
};
