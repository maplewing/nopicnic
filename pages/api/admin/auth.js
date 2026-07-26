import { getSessionToken } from "../../../lib/adminAuth";
import { checkRateLimit, clientIp } from "../../../lib/rateLimit";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const allowed = await checkRateLimit({
    key: `ratelimit:admin-auth:${clientIp(req)}`,
    limit: 10,
    windowSeconds: 10 * 60,
  });
  if (!allowed) {
    return res.status(429).json({ error: "Too many attempts. Try again in a few minutes." });
  }

  const { password } = req.body;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Incorrect password" });
  }

  const token = getSessionToken();
  const isProd = process.env.NODE_ENV === "production";
  res.setHeader(
    "Set-Cookie",
    `npp-admin-session=${token}; HttpOnly; ${isProd ? "Secure; " : ""}SameSite=Strict; Path=/; Max-Age=${60 * 60 * 24 * 30}`
  );
  return res.status(200).json({ ok: true });
}
