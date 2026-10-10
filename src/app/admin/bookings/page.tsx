"use client";

import { useEffect, useState } from "react";
import { formatTunisiaDate, formatTunisiaTime } from "@/lib/timezone";

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

type EditingModal = {
  booking: BookingItem;
  newDate: string;
  newTime: string;
  newDuration: number;
  submitting: boolean;
  error: string;
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [actionMessage, setActionMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [editingModal, setEditingModal] = useState<EditingModal | null>(null);

  function loadBookings() {
    return fetch("/api/admin/bookings")
      .then((res) => (res.ok ? res.json() : { bookings: [] }))
      .then((data) => setBookings(data.bookings || []))
      .catch(() => setFetchError("Impossible de charger les réservations."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    void loadBookings();
  }, []);

  async function refundBooking(b: BookingItem) {
    const ok = window.confirm(
      `Rembourser ${b.amountTnd} DT à ${b.studentName} ?\n\nLe montant sera recrédité à son portefeuille immédiatement` +
        (b.status !== "PENDING" ? ", et retiré du gain du professeur." : ".")
    );
    if (!ok) return;
    setRefundingId(b.id);
    setActionMessage(null);
    const res = await fetch(`/api/admin/bookings/${b.id}/refund`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setRefundingId(null);
    setActionMessage({ text: res.ok ? "Réservation remboursée." : data.error || "Remboursement impossible.", ok: res.ok });
    if (res.ok) await loadBookings();
  }

  function openEditModal(b: BookingItem) {
    const date = new Date(b.startsAt);
    // Format date as YYYY-MM-DD for input
    const dateStr = date.toISOString().split("T")[0];
    // Format time as HH:MM
    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    const timeStr = `${hours}:${minutes}`;

    setEditingModal({
      booking: b,
      newDate: dateStr,
      newTime: timeStr,
      newDuration: b.durationMinutes,
      submitting: false,
      error: "",
    });
  }

  async function submitEditModal() {
    if (!editingModal) return;

    // Validate inputs
    if (!editingModal.newDate || !editingModal.newTime || editingModal.newDuration <= 0) {
      setEditingModal((prev) => ({ ...prev!, error: "Veuillez remplir tous les champs correctement." }));
      return;
    }

    setEditingModal((prev) => ({ ...prev!, submitting: true, error: "" }));

    try {
      // Combine date and time into ISO string
      const [hours, minutes] = editingModal.newTime.split(":");
      const newStartsAt = new Date(`${editingModal.newDate}T${hours}:${minutes}:00Z`).toISOString();

      const res = await fetch(`/api/admin/bookings/${editingModal.booking.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startsAt: newStartsAt,
          durationMinutes: editingModal.newDuration,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setActionMessage({ text: "Réservation reschedulée avec succès.", ok: true });
        setEditingModal(null);
        await loadBookings();
      } else {
        setEditingModal((prev) => ({
          ...prev!,
          error: data.error || "Erreur lors de la modification.",
          submitting: false,
        }));
      }
    } catch (err) {
      setEditingModal((prev) => ({
        ...prev!,
        error: "Erreur de connexion au serveur.",
        submitting: false,
      }));
    }
  }

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

        {actionMessage && (
          <div
            className={`mt-6 rounded-2xl border p-4 text-sm ${
              actionMessage.ok ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300" : "border-rose-400/30 bg-rose-500/10 text-rose-300"
            }`}
          >
            {actionMessage.text}
          </div>
        )}

        {fetchError && !loading && (
          <div className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-300">
            {fetchError}
          </div>
        )}

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
                  <th className="px-4 py-3">Elève</th>
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
                      <div>
                        {formatTunisiaDate(b.startsAt)} à {formatTunisiaTime(b.startsAt)}
                      </div>
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
                      <span
                        className={
                          b.paymentStatus === "PAID"
                            ? "font-bold text-emerald-300"
                            : b.paymentStatus === "REFUNDED"
                            ? "font-bold text-slate-400"
                            : "text-amber-300"
                        }
                      >
                        {b.paymentStatus === "PAID" ? "✓ Payé" : b.paymentStatus === "REFUNDED" ? "Remboursé" : "En attente"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(b)}
                          className="rounded-xl bg-blue-500/20 px-3 py-1.5 text-xs font-bold text-blue-200 transition hover:bg-blue-500/30"
                        >
                          ✎ Modifier
                        </button>
                        {b.paymentStatus === "PAID" && (
                          <button
                            type="button"
                            onClick={() => void refundBooking(b)}
                            disabled={refundingId === b.id}
                            className="rounded-xl bg-rose-500/20 px-3 py-1.5 text-xs font-bold text-rose-200 transition hover:bg-rose-500/30 disabled:opacity-50"
                          >
                            {refundingId === b.id ? "..." : "Rembourser"}
                          </button>
                        )}
                        <a
                          href={`/classroom/${b.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl bg-[#72d6bf] px-3 py-1.5 text-xs font-bold text-[#101b2d] transition hover:bg-[#5ec4ad]"
                        >
                          Classe ↗
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#101b2d] p-6 sm:p-8 shadow-2xl space-y-4 border border-white/10">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Modifier la réservation</h3>
                <p className="text-xs text-slate-400 mt-1">{editingModal.booking.studentName} - {editingModal.booking.subject}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingModal(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {editingModal.error && (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">
                {editingModal.error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Date (Tunisie)
                </label>
                <input
                  type="date"
                  value={editingModal.newDate}
                  onChange={(e) =>
                    setEditingModal((prev) => ({
                      ...prev!,
                      newDate: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white outline-none focus:border-[#72d6bf]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Heure de début (UTC)
                </label>
                <input
                  type="time"
                  value={editingModal.newTime}
                  onChange={(e) =>
                    setEditingModal((prev) => ({
                      ...prev!,
                      newTime: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white outline-none focus:border-[#72d6bf]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Durée (minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={editingModal.newDuration}
                  onChange={(e) =>
                    setEditingModal((prev) => ({
                      ...prev!,
                      newDuration: parseInt(e.target.value, 10),
                    }))
                  }
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white outline-none focus:border-[#72d6bf]"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setEditingModal(null)}
                disabled={editingModal.submitting}
                className="rounded-xl border border-white/20 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/5 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => submitEditModal()}
                disabled={editingModal.submitting}
                className="rounded-xl bg-[#72d6bf] px-5 py-2.5 text-xs font-bold text-[#101b2d] transition hover:bg-[#5ec4ad] disabled:opacity-50"
              >
                {editingModal.submitting ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
