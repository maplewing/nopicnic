import crypto from "crypto";

// Signs the recipient's address so an unsubscribe link only ever unsubscribes
// the person it was mailed to. Deliberately has no expiry: an opt-out link has
// to keep working however long the email sits in someone's inbox.
export function createUnsubscribeToken(email) {
  return crypto
    .createHmac("sha256", process.env.DOWNLOAD_TOKEN_SECRET || "")
    .update(String(email).trim().toLowerCase())
    .digest("hex");
}

export function verifyUnsubscribeToken(email, token) {
  if (!email || !token) return false;
  const expected = createUnsubscribeToken(email);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(String(token), "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

export function unsubscribeUrl(email, siteUrl = "https://nopicnicpress.com") {
  const token = createUnsubscribeToken(email);
  return `${siteUrl}/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}
