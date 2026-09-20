/**
 * Signed, expiring tokens built on Web Crypto so they can be verified both in
 * the Edge middleware and in Node route handlers / server actions.
 *
 * Format: base64url(payloadJson) + "." + base64url(hmacSha256(payload))
 */

export type TokenPayload = {
  sub: "admin" | "page";
  /** Page id, only for sub === "page" */
  pid?: string;
  /** Expiry, unix seconds */
  exp: number;
};

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const b64 = typeof btoa === "function" ? btoa(binary) : Buffer.from(binary, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): Uint8Array<ArrayBuffer> {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (input.length % 4)) % 4);
  const binary = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signToken(payload: TokenPayload, secret: string): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(sig))}`;
}

export async function verifyToken(token: string | undefined | null, secret: string): Promise<TokenPayload | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const key = await hmacKey(secret);
    const ok = await crypto.subtle.verify("HMAC", key, fromBase64Url(sig), encoder.encode(body));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as TokenPayload;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
