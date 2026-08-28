import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/server/session-token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Identify protected route areas
  const isAdminRoute = pathname.startsWith("/admin");
  const isTeacherRoute = pathname.startsWith("/teacher");
  const isStudentDashboardRoute = pathname.startsWith("/dashboard");
  const isClassroomRoute = pathname.startsWith("/classroom");

  if (!isAdminRoute && !isTeacherRoute && !isStudentDashboardRoute && !isClassroomRoute) {
    return NextResponse.next();
  }

  // 2. Resolve identity/role from the signed session cookie — this is the
  // only claim middleware can't have re-verified against the database (it
  // runs on the Edge runtime, before any API route gets a chance to), so it
  // must not trust the plain profy_user_id/profy_role cookies, which are
  // trivially editable by anyone with browser devtools access.
  const session = await verifySessionToken(request.cookies.get("profy_session")?.value);

  // Sessions created before signed cookies existed only have the legacy
  // unsigned cookies. Accept them as a fallback so those users aren't
  // logged out immediately — they'll get a signed cookie on next login and
  // this fallback can be removed once the 30-day cookie lifetime has passed.
  const legacyUserId = request.cookies.get("profy_user_id")?.value;
  const legacyRole = request.cookies.get("profy_role")?.value;

  const userId = session?.userId ?? legacyUserId;
  const role = session?.role ?? legacyRole;

  // 3. Unauthenticated access check
  if (!userId) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Role-Based Access Control (RBAC) Enforcement
  if (isAdminRoute) {
    if (role !== "ADMIN") {
      // Non-admins cannot access admin console
      const redirectTarget = role === "TEACHER" ? "/teacher/dashboard" : "/dashboard";
      return NextResponse.redirect(new URL(redirectTarget, request.url));
    }
  }

  if (isTeacherRoute && role !== "TEACHER" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/teacher/:path*",
    "/dashboard/:path*",
    "/classroom/:path*",
  ],
};
