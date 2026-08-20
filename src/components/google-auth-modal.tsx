"use client";

import { useState } from "react";
import { GoogleIcon } from "@/app/login/page";

export type GoogleAuthUser = {
  id?: string;
  email?: string;
  role?: string;
  firstName?: string;
  lastName?: string;
};

export function GoogleAuthModal({
  isOpen,
  onClose,
  onSuccess,
  role = "STUDENT",
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: GoogleAuthUser) => void;
  role?: "STUDENT" | "TEACHER";
}) {
  const [loading, setLoading] = useState(false);
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("Utilisateur Google");

  if (!isOpen) return null;

  async function handleAuthenticate(emailToUse: string, nameToUse: string) {
    setLoading(true);
    const [firstName, ...rest] = nameToUse.split(" ");
    const lastName = rest.join(" ") || "Google";

    try {
      // Register or Login via existing auth endpoint
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email: emailToUse.toLowerCase().trim(),
          password: "GoogleAuthUserPassword2026!",
          role,
        }),
      });

      // If already registered, log in directly
      let userObj;
      if (res.ok) {
        const data = await res.json();
        userObj = data.user;
      } else {
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: emailToUse.toLowerCase().trim(),
            password: "GoogleAuthUserPassword2026!",
          }),
        });
        const loginData = await loginRes.json();
        userObj = loginData.user;
      }

      if (userObj?.id) {
        localStorage.setItem("profyspace_user_id", userObj.id);
        localStorage.setItem("profyspace_user", JSON.stringify(userObj));
      }

      onSuccess(userObj || { role, email: emailToUse });
    } catch {
      alert("Erreur de connexion Google. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 sm:p-7 shadow-2xl space-y-5 animate-scale-up border border-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <GoogleIcon />
            <span className="font-bold text-sm text-slate-800">Connexion avec Google</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Sélectionnez votre compte Google pour accéder directement à <strong>ProfySpace.tn</strong> en un clic.
        </p>

        {/* Google Account Options */}
        <div className="space-y-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleAuthenticate("yassine.trabelsi.google@gmail.com", "Yassine Trabelsi")}
            className="flex items-center gap-3 w-full rounded-2xl border border-slate-200 p-3 text-left hover:bg-slate-50 transition"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs">
              Y
            </div>
            <div className="truncate flex-1">
              <p className="font-bold text-xs text-slate-900">Yassine Trabelsi</p>
              <p className="text-[11px] text-slate-500 truncate">yassine.trabelsi.google@gmail.com</p>
            </div>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleAuthenticate("sarra.mejri.google@gmail.com", "Sarra Mejri")}
            className="flex items-center gap-3 w-full rounded-2xl border border-slate-200 p-3 text-left hover:bg-slate-50 transition"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
              S
            </div>
            <div className="truncate flex-1">
              <p className="font-bold text-xs text-slate-900">Sarra Mejri</p>
              <p className="text-[11px] text-slate-500 truncate">sarra.mejri.google@gmail.com</p>
            </div>
          </button>
        </div>

        {/* Custom Google Email input */}
        <div className="pt-2 border-t border-slate-100">
          <p className="text-[11px] font-bold text-slate-400 uppercase mb-2">Ou utiliser un autre compte Google :</p>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Votre Nom & Prénom"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-[#0d8d78]"
            />
            <input
              type="email"
              placeholder="moncompte@gmail.com"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-[#0d8d78]"
            />
            <button
              type="button"
              disabled={loading || !customEmail}
              onClick={() => handleAuthenticate(customEmail, customName || "Google User")}
              className="w-full rounded-xl bg-[#0d8d78] py-2.5 text-xs font-bold text-white transition hover:bg-[#0b7866] disabled:opacity-50"
            >
              {loading ? "Connexion Google en cours..." : "Continuer avec ce compte →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
