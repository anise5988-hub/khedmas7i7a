import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
}) : null;

export async function signInWithGoogle(role: "STUDENT" | "TEACHER" = "STUDENT") {
  if (!supabase) {
    const errorMsg = "Clé Supabase manquante ! Veuillez ajouter NEXT_PUBLIC_SUPABASE_ANON_KEY dans votre fichier .env (ou dans Vercel).";
    alert(errorMsg);
    return { data: null, error: new Error(errorMsg) };
  }

  if (typeof window !== "undefined") {
    localStorage.setItem("profyspace_oauth_role", role);
  }

  const origin = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
  const redirectTo = `${origin}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });

  if (error) {
    console.error("Supabase Google OAuth Error:", error, "Redirect URL used:", redirectTo);
    return { data, error };
  }

  if (data?.url) {
    window.location.href = data.url;
  }

  return { data, error: null };
}
