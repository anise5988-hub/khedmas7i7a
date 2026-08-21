"use client";

import { useEffect, useState } from "react";
import { SiteNavbar } from "@/components/site-navbar";
import { formatTndFromMillimes } from "@/lib/finance/withdrawal";


type TeacherProfile = {
  hourlyRateTnd: number;
  bookings: {
    id: string;
    startsAt: string;
    durationMinutes: number;
    amountMillimes: number;
    status: string;
    student: { firstName: string; lastName: string };
  }[];
  withdrawals: {
    id: string;
    requestedMillimes: number;
    feeMillimes: number;
    payoutMillimes: number;
    status: string;
    createdAt: string;
  }[];
};

export default function TeacherEarningsPage() {
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/teacher/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.teacher) setTeacher(data.teacher);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalEarnedMillimes =
    teacher?.bookings
      .filter((b) => b.status === "CONFIRMED" || b.status === "COMPLETED")
      .reduce((sum, b) => sum + b.amountMillimes, 0) ?? 0;

  const totalWithdrawnMillimes =
    teacher?.withdrawals
      .filter((w) => w.status === "PAID" || w.status === "APPROVED")
      .reduce((sum, w) => sum + w.requestedMillimes, 0) ?? 0;

  const availableBalanceMillimes = Math.max(0, totalEarnedMillimes - totalWithdrawnMillimes);

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <SiteNavbar dark={false} />

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.18em] text-[#0d8d78]">Espace professeur</p>
            <h1 className="mt-1 text-4xl font-bold tracking-tight">Revenus & Retraits</h1>
            <p className="mt-1 text-sm text-slate-500">Suivez les gains de vos séances de cours et vos demandes de virement.</p>
          </div>

          <a
            href="/teacher/dashboard/withdrawals"
            className="rounded-2xl bg-[#0d8d78] px-5 py-3 font-bold text-white shadow-lg shadow-[#0d8d78]/20 transition hover:bg-[#0b7866]"
          >
            Demander un retrait →
          </a>
        </div>

        {/* Metrics Grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Solde disponible</span>
            <p className="mt-2 text-3xl font-bold text-[#0d8d78]">
              {formatTndFromMillimes(availableBalanceMillimes)}
            </p>
            <p className="mt-1 text-xs text-slate-400">Prêt pour virement bancaire / D17</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total cumulé gagné</span>
            <p className="mt-2 text-3xl font-bold text-[#11233f]">
              {formatTndFromMillimes(totalEarnedMillimes)}
            </p>
            <p className="mt-1 text-xs text-slate-400">Depuis vos premières séances</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total déjà retiré</span>
            <p className="mt-2 text-3xl font-bold text-slate-700">
              {formatTndFromMillimes(totalWithdrawnMillimes)}
            </p>
            <p className="mt-1 text-xs text-slate-400">Virements effectués</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          {/* Earnings from Bookings */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold">Séances rémunérées</h2>
            <p className="text-xs text-slate-400">Gains générés par élève</p>

            {loading ? (
              <div className="py-12 text-center text-slate-400">Chargement...</div>
            ) : !teacher?.bookings || teacher.bookings.length === 0 ? (
              <div className="py-12 text-center text-slate-400">Aucune séance rémunérée pour le moment.</div>
            ) : (
              <div className="mt-4 divide-y divide-slate-100">
                {teacher.bookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between py-4 text-sm">
                    <div>
                      <p className="font-bold">{b.student.firstName} {b.student.lastName}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(b.startsAt).toLocaleDateString("fr-TN")} ({b.durationMinutes} min)
                      </p>
                    </div>
                    <span className="font-bold text-[#0d8d78]">
                      + {formatTndFromMillimes(b.amountMillimes)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Info Box */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-[#e7f5f1] p-6 sm:p-8">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0d8d78]">Transparence financière</span>
              <h3 className="mt-2 font-bold text-lg">Comment fonctionnent vos gains ?</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Vous fixez librement votre tarif horaire. Dès qu'une séance est réservée et confirmée, le montant est crédité sur votre compte professeur. Vous pouvez demander un virement dès 10 DT.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
