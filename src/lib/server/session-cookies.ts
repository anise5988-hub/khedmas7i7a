import type { NextResponse } from "next/server";
import { createSessionToken } from "./session-token";

const cookieOptions = {
  path: "/",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

// profy_session is the trustworthy one: middleware and getCurrentUser()
// verify its signature before relying on the role/userId inside it.
// The legacy profy_user_id/profy_role/profyspace_user_id cookies are kept
// alongside it only so sessions created before this change (which only
// have the legacy cookies) keep working until they expire or re-login.
export async function setSessionCookies(response: NextResponse, user: { id: string; role: string }) {
  const session = await createSessionToken({ userId: user.id, role: user.role });
  response.cookies.set("profy_session", session, { ...cookieOptions, httpOnly: true });
  response.cookies.set("profy_user_id", user.id, { ...cookieOptions, httpOnly: true });
  response.cookies.set("profy_role", user.role, { ...cookieOptions, httpOnly: true });
  response.cookies.set("profyspace_user_id", user.id, { ...cookieOptions, httpOnly: false });
}

export function clearSessionCookies(response: NextResponse) {
  const cookiesToClear = [
    "profy_session",
    "profy_user_id",
    "profy_role",
    "profyspace_user_id",
    "profy_supabase_access_token",
    "sb-access-token",
    "sb-refresh-token",
    "user_id",
  ];
  for (const name of cookiesToClear) {
    response.cookies.set(name, "", { path: "/", maxAge: 0, expires: new Date(0) });
    response.cookies.delete(name);
  }
}
