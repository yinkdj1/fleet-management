import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/bookings",
  "/customers",
  "/vehicles",
  "/maintenance",
  "/reports",
  "/monitoring",
  "/notifications",
  "/coupon",
  "/admin",
  "/guest-manage",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isProtected) {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/bookings/:path*",
    "/customers/:path*",
    "/vehicles/:path*",
    "/maintenance/:path*",
    "/reports/:path*",
    "/monitoring/:path*",
    "/notifications/:path*",
    "/coupon/:path*",
    "/admin/:path*",
    "/guest-manage/:path*",
  ],
};
