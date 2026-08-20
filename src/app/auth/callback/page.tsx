"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/client/supabase";

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError("Supabase non configuré sur le client.");
      return;
    }

    let isHandled = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function processUserSession(session: any) {
      if (isHandled || !session?.user) return;
      isHandled = true;

      const user = session.user;
      const email = user.email;
      if (!email) {
        setError("Email non fourni par Google.");
        return;
      }

      const meta = user.user_metadata || {};
      const fullName = meta.full_name || meta.name || "";
      const nameParts = fullName.trim().split(" ");
      const firstName = meta.given_name || nameParts[0] || "Utilisateur";
      const lastName = meta.family_name || nameParts.slice(1).join(" ") || "Google";

      const roleFromStorage = typeof window !== "undefined" ? localStorage.getItem("profyspace_oauth_role") : null;
      const params = new URLSearchParams(window.location.search);
      const roleParam = params.get("role") || roleFromStorage || "STUDENT";

      if (typeof window !== "undefined") {
        localStorage.removeItem("profyspace_oauth_role");
      }

      try {
        const res = await fetch("/api/auth/google-callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            firstName,
            lastName,
            role: roleParam,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || "Erreur lors de la synchronisation du compte.");
          return;
        }

        if (data.user?.id) {
          localStorage.setItem("profyspace_user_id", data.user.id);
          localStorage.setItem("profyspace_user", JSON.stringify(data.user));
        }

        const targetUrl = data.role === "TEACHER" ? "/teacher/dashboard" : "/dashboard";
        window.location.replace(targetUrl);
      } catch (err) {
        console.error("Callback error:", err);
        setError("Erreur de connexion au serveur.");
      }
    }

    // 1. Try exchangeCodeForSession if PKCE code is in search params
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error: exchangeError }) => {
        if (exchangeError) {
          console.error("PKCE exchange error:", exchangeError);
        } else if (data?.session) {
          processUserSession(data.session);
        }
      });
    }

    // 2. Fallback to current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        processUserSession(session);
      }
    });

    // 3. Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        processUserSession(session);
      }
    });

    // Timeout after 8 seconds if session wasn't retrieved
    const timer = setTimeout(() => {
      if (!isHandled) {
        setError("Impossible de récupérer la session Google. Vérifiez votre connexion ou réessayez.");
      }
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#11233f] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
        {!error ? (
          <div className="space-y-4">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#0d8d78] border-t-transparent" />
            <h1 className="text-xl font-bold text-[#11233f]">Connexion Google en cours...</h1>
            <p className="text-xs text-slate-500">Veuillez patienter pendant que nous vous redirigeons.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 font-bold text-lg">
              ✕
            </div>
            <h1 className="text-xl font-bold text-[#11233f]">Échec de la connexion</h1>
            <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100">{error}</p>
            <a
              href="/login"
              className="inline-block w-full rounded-2xl bg-[#0d8d78] py-3 text-sm font-bold text-white transition hover:bg-[#0b7866]"
            >
              Retour à la page de connexion
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
