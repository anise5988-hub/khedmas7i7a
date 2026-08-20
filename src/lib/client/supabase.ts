import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export async function signInWithGoogle(role: "STUDENT" | "TEACHER" = "STUDENT") {
  if (!supabase) {
    alert("Configuration Supabase manquante. Veuillez ajouter NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans votre fichier .env");
    return { data: null, error: new Error("Supabase non configuré.") };
  }

  const redirectTo = `${window.location.origin}/auth/callback?role=${role}`;
  return await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });
}
