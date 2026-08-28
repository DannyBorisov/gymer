import crypto from "crypto";
import config from "../config.js";
import { UserInfo } from "../types.js";

export interface SessionData {
  tokens?: {
    access_token: string;
    refresh_token?: string;
    expiry_date?: number;
  };
  user?: UserInfo;
}

export const ENCRYPTION_KEY = crypto.scryptSync(
  config.env.SESSION_SECRET,
  "salt",
  32,
);
export const IV_LENGTH = 16;

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
