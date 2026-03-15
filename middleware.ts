import { NextRequest, NextResponse } from "next/server";

// Protected admin routes that require authentication
const protectedRoutes = [
  "/admin/dashboard",
  "/admin/bookings",
  "/admin/review",
  "/admin/seat-map",
];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Get the auth token from cookies
  const authToken = request.cookies.get("sb-auth-token")?.value;

  // If no auth token and trying to access protected route, redirect to login
  if (!authToken) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Continue to next middleware/route
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
