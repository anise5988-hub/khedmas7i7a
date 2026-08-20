 
"use client";

import { useEffect, useState } from "react";


type BookingItem = {
  id: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  teacherName: string;
  teacherSlug: string;
  subject: string;
  startsAt: string;
  durationMinutes: number;
  amountTnd: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    fetch("/api/admin/bookings")
      .then((res) => (res.ok ? res.json() : { bookings: [] }))
      .then((data) => setBookings(data.bookings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = bookings.filter((b) => {
    const matchesSearch =
      b.studentName.toLowerCase().includes(search.toLowerCase()) ||
      b.teacherName.toLowerCase().includes(search.toLowerCase()) ||
      b.subject.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <main className="min-h-screen bg-[#101b2d] px-4 py-8 sm:px-6 sm:py-10 text-white">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-4">
            <a href="/admin" className="font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-[-.06em]">
              profy<span className="text-[#72d6bf]">.admin</span>
            </a>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">
              Réservations & Cours
            </span>
          </div>

          <a
            href="/admin"
            className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
          >
            ← Retour Dashboard
          </a>
        </div>

        {/* Title & Filters */}
        <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Toutes les réservations ({bookings.length})</h1>
            <p className="mt-1 text-sm text-slate-400">Historique et suivi des cours particuliers en direct.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher élève, prof, matière..."
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-[#72d6bf]"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-white/20 bg-[#17253b] px-3 py-2 text-xs text-white outline-none"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="CONFIRMED">Confirmés</option>
              <option value="PENDING">En attente</option>
              <option value="COMPLETED">Terminés</option>
              <option value="CANCELLED">Annulés</option>
            </select>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="mt-6 overflow-x-auto rounded-3xl border border-white/10 bg-white/[.04] p-2">
          {loading ? (
            <div className="py-20 text-center text-slate-400">Chargement des séances...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">Aucune séance trouvée.</div>
          ) : (
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-white/10 text-xs font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Élève</th>
                  <th className="px-4 py-3">Professeur & Matière</th>
                  <th className="px-4 py-3">Date & Durée</th>
                  <th className="px-4 py-3">Montant</th>
                  <th className="px-4 py-3">Statut séance</th>
                  <th className="px-4 py-3">Paiement</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((b) => (
                  <tr key={b.id} className="transition hover:bg-white/[.03]">
                    <td className="px-4 py-4">
                      <div className="font-bold text-white">{b.studentName}</div>
                      <div className="text-xs text-slate-400">{b.studentEmail}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-white">{b.teacherName}</div>
                      <div className="text-xs text-[#72d6bf]">{b.subject}</div>
                    </td>
                    <td className="px-4 py-4 text-xs">
                      <div>{new Date(b.startsAt).toLocaleDateString("fr-TN")} à {new Date(b.startsAt).toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })}</div>
                      <div className="text-slate-400">{b.durationMinutes} minutes</div>
                    </td>
                    <td className="px-4 py-4 font-bold text-white">{b.amountTnd} DT</td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          b.status === "CONFIRMED"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : b.status === "PENDING"
                            ? "bg-amber-500/20 text-amber-300"
                            : b.status === "COMPLETED"
                            ? "bg-blue-500/20 text-blue-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs">
                      <span className={b.paymentStatus === "PAID" ? "text-emerald-300 font-bold" : "text-amber-300"}>
                        {b.paymentStatus === "PAID" ? "✓ Payé" : "En attente"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <a
                        href={`/classroom/${b.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-[#72d6bf] px-3 py-1.5 text-xs font-bold text-[#101b2d] transition hover:bg-[#5ec4ad]"
                      >
                        Classe ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
