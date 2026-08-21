import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Identify protected route areas
  const isAdminRoute = pathname.startsWith("/admin");
  const isTeacherRoute = pathname.startsWith("/teacher");
  const isStudentDashboardRoute = pathname.startsWith("/dashboard");

  if (!isAdminRoute && !isTeacherRoute && !isStudentDashboardRoute) {
    return NextResponse.next();
  }

  // 2. Read authenticated session cookies
  const userId =
    request.cookies.get("profy_user_id")?.value ||
    request.cookies.get("profyspace_user_id")?.value ||
    request.cookies.get("user_id")?.value ||
    request.cookies.get("profy_supabase_access_token")?.value;
  const role = request.cookies.get("profy_role")?.value;
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

  if (isTeacherRoute) {
    if (role === "STUDENT") {
      // Students cannot access teacher dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/teacher/:path*",
    "/dashboard/:path*",
  ],
};
