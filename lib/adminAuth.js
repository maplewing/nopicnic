import crypto from "crypto";

export function getSessionToken() {
  return crypto
    .createHash("sha256")
    .update("npp_admin_v1:" + (process.env.ADMIN_PASSWORD || ""))
    .digest("hex");
}

export function checkAdminAuth(req) {
  const token = req.cookies?.["npp-admin-session"];
  if (!token) return false;
  const expected = getSessionToken();
  try {
    return crypto.timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}
