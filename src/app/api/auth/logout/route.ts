import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Déconnexion réussie." });
  const cookieOptions = { path: "/", maxAge: 0, expires: new Date(0) };

  const cookiesToClear = [
    "profy_user_id",
    "profy_role",
    "profyspace_user_id",
    "profy_supabase_access_token",
    "sb-access-token",
    "sb-refresh-token",
    "user_id",
  ];

  for (const name of cookiesToClear) {
    response.cookies.set(name, "", cookieOptions);
    response.cookies.delete(name);
  }

  return response;
}
