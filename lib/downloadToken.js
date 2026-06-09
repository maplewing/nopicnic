// HMAC-signed download tokens — no database required.
//
// Token format:  base64url(JSON payload) + "." + HMAC-SHA256 signature
// Payload:       { slug, email, exp }
// Expiry:        72 hours from creation
//
// Required env var:  DOWNLOAD_TOKEN_SECRET  (any long random string)
// Generate one with: openssl rand -hex 32

import { createHmac, timingSafeEqual } from "crypto";

const TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

function sign(payload) {
  return createHmac("sha256", process.env.DOWNLOAD_TOKEN_SECRET)
    .update(payload)
    .digest("base64url");
}

export function createDownloadToken(productSlug, email) {
  const payload = Buffer.from(
    JSON.stringify({ slug: productSlug, email, exp: Date.now() + TTL_MS })
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

export function verifyDownloadToken(token) {
  if (!token || typeof token !== "string") return null;

  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;

  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  // Constant-time comparison to prevent timing attacks
  const expected = sign(payload);
  const a = Buffer.from(sig, "base64url");
  const b = Buffer.from(expected, "base64url");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let data;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }

  if (Date.now() > data.exp) return null;

  return data; // { slug, email, exp }
}
