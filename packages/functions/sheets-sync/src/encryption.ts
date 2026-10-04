import crypto from "node:crypto";

export interface TokenData {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

const IV_LENGTH = 16;

function getEncryptionKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is required");
  }
  return new Uint8Array(crypto.scryptSync(secret, "salt", 32));
}

export function decryptTokens(text: string): TokenData | null {
  try {
    const [ivHex, encryptedHex] = text.split(":");
    if (!ivHex || !encryptedHex) return null;
    const iv = new Uint8Array(Buffer.from(ivHex, "hex"));
    const encrypted = new Uint8Array(Buffer.from(encryptedHex, "hex"));
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      getEncryptionKey(),
      iv,
    );
    const decrypted = new Uint8Array([
      ...decipher.update(encrypted),
      ...decipher.final(),
    ]);
    return JSON.parse(Buffer.from(decrypted).toString());
  } catch {
    return null;
  }
}

export function encryptTokens(tokens: TokenData): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    getEncryptionKey(),
    new Uint8Array(iv),
  );
  const encrypted = new Uint8Array([
    ...cipher.update(JSON.stringify(tokens)),
    ...cipher.final(),
  ]);
  return iv.toString("hex") + ":" + Buffer.from(encrypted).toString("hex");
}
