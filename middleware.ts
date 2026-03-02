import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Routes the Figma plugin calls from https://www.figma.com – allow CORS and no redirect (API returns 401 if unauth) */
function isFigmaPluginApiPath(pathname: string): boolean {
  return (
    pathname === "/api/templates" ||
    pathname.startsWith("/api/templates/") ||
    pathname === "/api/import/figma"
  );
}

function withCorsHeaders(response: NextResponse, origin: string | null): NextResponse {
  // Production: only allow Figma plugin origin. Development: also allow any origin for local testing.
  const allowOrigin =
    origin === "https://www.figma.com"
      ? "https://www.figma.com"
      : process.env.NODE_ENV === "development"
        ? origin ?? "*"
        : "";
  if (allowOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowOrigin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
  return response;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const origin = request.headers.get("origin");

  // CORS for Figma plugin: /api/templates, /api/import/figma
  if (isFigmaPluginApiPath(pathname)) {
    if (request.method === "OPTIONS") {
      return withCorsHeaders(new NextResponse(null, { status: 204 }), origin);
    }
    const res = NextResponse.next();
    return withCorsHeaders(res, origin);
  }

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

