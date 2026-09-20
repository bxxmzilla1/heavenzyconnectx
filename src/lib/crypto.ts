import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/* ---------------------------------------------------------------------------
 * Passcode hashing (scrypt). Format: scrypt$<saltHex>$<hashHex>
 * ------------------------------------------------------------------------- */

export function hashPasscode(passcode: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(passcode.normalize("NFKC"), salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPasscode(passcode: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(passcode.normalize("NFKC"), Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Constant-time comparison for the admin passcode (stored as plain env var). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a.normalize("NFKC"));
  const bb = Buffer.from(b.normalize("NFKC"));
  if (ab.length !== bb.length) {
    // Compare against self to keep timing roughly constant, then fail.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

/* ---------------------------------------------------------------------------
 * Secret encryption at rest (AES-256-GCM). Format: v1:<ivB64>:<tagB64>:<dataB64>
 * ------------------------------------------------------------------------- */

function aesKey(): Buffer {
  // Derive a fixed 32-byte key from whatever string the operator provided.
  return createHash("sha256").update(env.encryptionKey).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", aesKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${data.toString("base64")}`;
}

export function decryptSecret(stored: string): string {
  const [version, ivB64, tagB64, dataB64] = stored.split(":");
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Unrecognised encrypted secret format");
  }
  const decipher = createDecipheriv("aes-256-gcm", aesKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}
