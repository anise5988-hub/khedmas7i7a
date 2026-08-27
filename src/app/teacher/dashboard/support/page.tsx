"use client";

import { useEffect, useState } from "react";
import { SiteNavbar } from "@/components/site-navbar";
import { SupportTicketsPanel } from "@/components/support-tickets-panel";

export default function TeacherSupportPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.id) setUserId(data.user.id);
      })
      .catch(() => {});
  }, []);

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <SiteNavbar dark={false} />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 space-y-6">
        <div className="border-b border-slate-200 pb-5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0d8d78]">Support Enseignant</span>
          <h1 className="mt-1 text-3xl font-bold">Centre d&apos;Aide</h1>
          <p className="mt-1 text-sm text-slate-500">
            Une question sur vos paiements, votre profil ou vos cours ? Ouvrez un ticket, l&apos;équipe ProfySpace vous répond directement ici.
          </p>
        </div>

        {userId && <SupportTicketsPanel currentUserId={userId} />}
      </div>
    </main>
  );
}
