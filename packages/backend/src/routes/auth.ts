import type { FastifyPluginAsync } from "fastify";
import crypto from "crypto";
import config from "../config.js";
import type { UserInfo } from "../plugins/googleSheets.js";
import {
  getAuthUrl,
  handleCallback,
  getAuthStatus,
  logout,
  handleNativeAuth,
} from "../handlers/auth.js";

export interface SessionData {
  tokens?: {
    access_token: string;
    refresh_token?: string;
    expiry_date?: number;
  };
  user?: UserInfo;
}

// Encryption helpers using Node.js built-in crypto
const ENCRYPTION_KEY = crypto.scryptSync(config.env.SESSION_SECRET, "salt", 32);
const IV_LENGTH = 16;

export function encrypt(data: SessionData): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data)),
    cipher.final(),
  ]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(text: string): SessionData | null {
  try {
    const [ivHex, encryptedHex] = text.split(":");
    if (!ivHex || !encryptedHex) return null;
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString());
  } catch {
    return null;
  }
}

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
  const isProduction = process.env.NODE_ENV === "production";
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

// OAuth routes - registered at /auth (no /api prefix)
export const oauthRoutes: FastifyPluginAsync = async (server) => {
  server.get<{ Querystring: { native?: string } }>("/google", getAuthUrl);

  server.get<{ Querystring: { code: string; state?: string } }>(
    "/google/callback",
    handleCallback,
  );
};

// API auth routes - registered at /api/auth
export const authApiRoutes: FastifyPluginAsync = async (server) => {
  server.get("/google/status", getAuthStatus);

  server.post("/logout", logout);

  server.post<{ Body: { code: string } }>("/google/native", handleNativeAuth);
};
