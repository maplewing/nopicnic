import { NextResponse } from "next/server";
import { isConsentRequiredCountry, REGION_COOKIE } from "./lib/region";

// Stamps every response with the visitor's region so the client knows whether
// the Meta pixel may load. Static pages can't read request headers, so this
// cookie is how the geo signal reaches them. It holds "eu" or "row" and nothing
// else — no identifier, no personal data.
function tagRegion(request, response) {
  const country = request.headers.get("x-vercel-ip-country") || "";
  if (!country) return response; // not on Vercel; the client falls back to time zone
  response.cookies.set(REGION_COOKIE, isConsentRequiredCountry(country) ? "eu" : "row", {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
  });
  return response;
}

async function requireAdmin(request) {
  const cookie = request.cookies.get("npp-admin-session")?.value;
  if (!cookie) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Verify session token using Web Crypto API (Edge Runtime compatible)
  const encoder = new TextEncoder();
  const data = encoder.encode("npp_admin_v1:" + (process.env.ADMIN_PASSWORD || ""));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const expected = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (cookie !== expected) {
    const response = NextResponse.redirect(new URL("/admin/login", request.url));
    response.cookies.delete("npp-admin-session");
    return response;
  }

  return null;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Don't protect the login page itself
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const denied = await requireAdmin(request);
    if (denied) return denied;
  }

  return tagRegion(request, NextResponse.next());
}

export const config = {
  matcher: [
    // Every page, skipping API routes and anything served straight off disk.
    "/((?!api/|_next/static|_next/image|images/|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
