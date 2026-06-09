import crypto from "crypto";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function createReviewToken(review) {
  const payload = { ...review, ts: Date.now() };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", process.env.DOWNLOAD_TOKEN_SECRET)
    .update(data)
    .digest("hex");
  return `${data}.${sig}`;
}

export function verifyReviewToken(token) {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = crypto
    .createHmac("sha256", process.env.DOWNLOAD_TOKEN_SECRET)
    .update(data)
    .digest("hex");

  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) return null;
  } catch {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(data, "base64url").toString());
  } catch {
    return null;
  }

  if (Date.now() - payload.ts > SEVEN_DAYS_MS) return null;
  return payload;
}
