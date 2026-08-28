// Signs {userId, role} into a compact, tamper-evident cookie value so
// middleware (which runs on the Edge runtime and can't hit the database)
// can trust the role claim without a DB round-trip. Uses Web Crypto
// (crypto.subtle) rather than Node's `crypto` module so the same code
// runs unmodified in both the Edge middleware and Node API routes.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function getHmacKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export type SessionPayload = { userId: string; role: string };

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");

  const body = base64UrlEncode(encoder.encode(JSON.stringify({ ...payload, iat: Date.now() })));
  const key = await getHmacKey(secret);
  const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const signature = base64UrlEncode(new Uint8Array(signatureBytes));
  return `${body}.${signature}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;

  try {
    const key = await getHmacKey(secret);
    const expectedSignatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const expectedSignature = base64UrlEncode(new Uint8Array(expectedSignatureBytes));
    if (!timingSafeEqual(expectedSignature, signature)) return null;

    const payload = JSON.parse(decoder.decode(base64UrlDecode(body)));
    if (typeof payload?.userId !== "string" || typeof payload?.role !== "string") return null;
    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}
