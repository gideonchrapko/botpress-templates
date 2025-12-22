import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Always allow access to auth API routes and home page
  if (pathname.startsWith("/api/auth") || pathname === "/") {
    return NextResponse.next();
  }

  // Check for session cookie (database sessions store session tokens in cookies)
  // Note: We can't use auth() here because Prisma doesn't work in Edge Runtime
  // The actual session validation happens in the API routes and pages
  const hasSessionCookie = 
    request.cookies.has("next-auth.session-token") || 
    request.cookies.has("__Secure-next-auth.session-token") ||
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token");

  // If we have a session cookie, allow access
  if (hasSessionCookie) {
    return NextResponse.next();
  }

  // If not authenticated, redirect to home
  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

