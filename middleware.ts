import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const pathname = req.nextUrl.pathname;

  // Always allow access to auth API routes and home page
  if (pathname.startsWith("/api/auth") || pathname === "/") {
    return NextResponse.next();
  }

  // Check for session cookie even if req.auth is not set yet (handles OAuth callback redirects)
  const hasSessionCookie = req.cookies.has("next-auth.session-token") || 
                          req.cookies.has("__Secure-next-auth.session-token") ||
                          req.cookies.has("authjs.session-token") ||
                          req.cookies.has("__Secure-authjs.session-token");

  // If we have a session cookie or req.auth, allow access
  if (req.auth || hasSessionCookie) {
    return NextResponse.next();
  }

  // If not authenticated, redirect to home
  return NextResponse.redirect(new URL("/", req.url));
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

