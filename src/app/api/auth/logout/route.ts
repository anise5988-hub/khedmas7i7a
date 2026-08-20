import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Déconnexion réussie." });
  response.cookies.delete("profy_user_id");
  response.cookies.delete("profy_role");
  return response;
}
