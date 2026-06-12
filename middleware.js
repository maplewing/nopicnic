import { NextResponse } from "next/server";

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Don't protect the login page itself
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
