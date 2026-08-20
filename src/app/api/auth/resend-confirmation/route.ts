import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAuth } from "@/lib/server/supabase-auth";

const schema = z.object({ email: z.string().email().transform((value) => value.toLowerCase().trim()) });

export async function POST(request: Request) {
  if (!supabaseAuth) return NextResponse.json({ error: "Service email non configuré." }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
  const origin = new URL(request.url).origin;
  const { error } = await supabaseAuth.auth.resend({ type: "signup", email: parsed.data.email, options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || origin}/auth/callback` } });
  if (error) {
    console.error("Supabase confirmation resend failed", { message: error.message, status: error.status, code: error.code });
    return NextResponse.json({ error: "Impossible de renvoyer l'email pour le moment." }, { status: 400 });
  }
  return NextResponse.json({ success: true, message: "Email de confirmation renvoyé. Vérifiez aussi vos spams." });
}
