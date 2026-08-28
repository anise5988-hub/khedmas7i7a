import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/server/session-cookies";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Déconnexion réussie." });
  clearSessionCookies(response);
  return response;
}
