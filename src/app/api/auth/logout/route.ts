import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Déconnexion réussie." });
  const cookieOptions = { path: "/", maxAge: 0, expires: new Date(0) };

  response.cookies.set("profy_user_id", "", cookieOptions);
  response.cookies.set("profy_role", "", cookieOptions);
  response.cookies.set("profyspace_user_id", "", cookieOptions);

  response.cookies.delete("profy_user_id");
  response.cookies.delete("profy_role");
  response.cookies.delete("profyspace_user_id");

  return response;
}
