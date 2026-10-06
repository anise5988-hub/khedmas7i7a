/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { IconVideo, IconClock } from "@/components/icons";
import { RecordingPlayerModal } from "@/components/recording-player-modal";

type LiveSessionRow = {
  sessionId: string;
  bookingId: string;
  status: string;
  phase: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  endedAt: string | null;
  studentName: string;
  teacherName: string;
  subject: string;
  paymentStatus: string;
  bookingStatus: string;
  recordingStatus: string;
  recordingUrl: string | null;
  locked: boolean;
  waitingRoomEnabled: boolean;
  totalAttendanceSeconds: number;
  teacherAttendance: { joinedAt: string; leftAt: string | null; durationSeconds: number | null; reconnectCount: number; leaveReason: string | null }[];
  studentAttendance: { joinedAt: string; leftAt: string | null; durationSeconds: number | null; reconnectCount: number; leaveReason: string | null }[];
};

function fmtDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
}

const STATUS_STYLES: Record<string, string> = {
  LIVE: "bg-rose-500/20 text-rose-300",
  ENDING_SOON: "bg-amber-500/20 text-amber-300",
  STARTING: "bg-emerald-500/20 text-emerald-300",
  COMPLETED: "bg-blue-500/20 text-blue-300",
  CANCELLED: "bg-rose-500/25 text-rose-200",
};

export default function AdminClassroomsPage() {
  const [sessions, setSessions] = useState<LiveSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [loadingPlayerId, setLoadingPlayerId] = useState<string | null>(null);
  const [playError, setPlayError] = useState("");

  // The signed Daily URL in the list is short-lived — always mint a fresh
  // one through the recording endpoint right before playing, same as the
  // student/teacher replays pages do.
  async function openReplay(bookingId: string) {
    setPlayError("");
    setLoadingPlayerId(bookingId);
    try {
      const res = await fetch(`/api/classroom/${bookingId}/recording`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.recordingUrl) {
        setPlayerUrl(data.recordingUrl);
      } else {
        setPlayError("Impossible de charger l'enregistrement pour le moment.");
      }
    } catch {
      setPlayError("Erreur de connexion au serveur.");
    } finally {
      setLoadingPlayerId(null);
    }
  }

  function load() {
    setLoading(true);
    setFetchError("");
    fetch(`/api/admin/classrooms?limit=100&status=${statusFilter}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("unauthorized"))))
      .then((data) => setSessions(data.sessions || []))
      .catch(() => setFetchError("Impossible de charger les sessions. Vérifiez que vous êtes connecté en tant qu'administrateur."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  return (
    <main className="min-h-screen bg-[#101b2d] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mt-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#72d6bf]">Classes virtuelles</p>
            <h1 className="mt-1 text-3xl font-bold">Sessions de classe ({sessions.length})</h1>
            <p className="mt-1 text-sm text-slate-400">
              Métadonnées opérationnelles uniquement — le contenu des leçons reste privé entre l&apos;enseignant et l&apos;élève.
            </p>
          </div>
          <div className="flex gap-2">
            {["ALL", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition ${statusFilter === s ? "bg-[#0d8d78] text-white" : "bg-white/10 text-slate-300 hover:bg-white/20"}`}
              >
                {s === "ALL" ? "Toutes" : s === "IN_PROGRESS" ? "En cours" : s === "COMPLETED" ? "Terminées" : "Annulées"}
              </button>
            ))}
          </div>
        </div>

        {fetchError && !loading && (
          <div className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-300">{fetchError}</div>
        )}

        <div className="mt-8 overflow-x-auto rounded-3xl border border-white/10 bg-white/[.04] p-2 shadow-xl">
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-[#72d6bf] border-t-transparent" />
              Chargement des sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <IconVideo className="h-6 w-6" />
              </div>
              <p className="text-base font-bold text-white">Aucune session trouvée</p>
              <p className="mt-1 text-xs text-slate-400">Les sessions apparaîtront dès la première connexion à une classe.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-white/10 text-xs font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3.5">Cours</th>
                  <th className="px-4 py-3.5">Enseignant / Élève</th>
                  <th className="px-4 py-3.5">Créneau</th>
                  <th className="px-4 py-3.5">Statut</th>
                  <th className="px-4 py-3.5">Paiement</th>
                  <th className="px-4 py-3.5">Présence</th>
                  <th className="px-4 py-3.5">Technique</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sessions.map((s) => (
                  <tr key={s.sessionId} className="transition hover:bg-white/[.03]">
                    <td className="px-4 py-4">
                      <p className="max-w-xs truncate font-bold text-white">{s.subject}</p>
                      <p className="text-[10px] text-slate-500">Réservation {s.bookingId.slice(0, 10)}…</p>
                    </td>
                    <td className="px-4 py-4 text-xs">
                      <p className="font-semibold text-[#72d6bf]">{s.teacherName}</p>
                      <p className="text-slate-400">{s.studentName}</p>
                    </td>
                    <td className="px-4 py-4 text-xs">
                      <p className="flex items-center gap-1">
                        <IconClock className="h-3 w-3 text-slate-500" />
                        {new Date(s.scheduledStart).toLocaleString("fr-TN", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                      <p className="text-[10px] text-slate-500">{Math.round((new Date(s.scheduledEnd).getTime() - new Date(s.scheduledStart).getTime()) / 60000)} min prévues</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES[s.phase] ?? "bg-white/10 text-slate-300"}`}>
                        {s.phase}
                      </span>
                      {s.locked && <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">🔒</span>}
                    </td>
                    <td className="px-4 py-4 text-xs">
                      <span className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold ${s.paymentStatus === "PAID" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                        {s.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[10px]">
                      <p>Prof : {s.teacherAttendance.length > 0 ? `${fmtDuration(s.teacherAttendance.reduce((a, r) => a + (r.durationSeconds ?? 0), 0))}${s.teacherAttendance[0].reconnectCount > 0 ? ` · ${s.teacherAttendance[0].reconnectCount} reco` : ""}` : "—"}</p>
                      <p>Élève : {s.studentAttendance.length > 0 ? `${fmtDuration(s.studentAttendance.reduce((a, r) => a + (r.durationSeconds ?? 0), 0))}${s.studentAttendance[0].reconnectCount > 0 ? ` · ${s.studentAttendance[0].reconnectCount} reco` : ""}` : "—"}</p>
                    </td>
                    <td className="px-4 py-4 text-[10px]">
                      <p>Vidéo : {s.recordingStatus === "NOT_AVAILABLE" ? "—" : s.recordingStatus}</p>
                      <p>Salle d&apos;attente : {s.waitingRoomEnabled ? "oui" : "non"}</p>
                      {s.recordingUrl && (
                        <button
                          type="button"
                          onClick={() => openReplay(s.bookingId)}
                          disabled={loadingPlayerId === s.bookingId}
                          className="mt-1 flex items-center gap-1 rounded-lg bg-[#0d8d78] px-2 py-1 text-[10px] font-bold text-white transition hover:bg-[#0b7866] disabled:opacity-50"
                        >
                          <IconVideo className="h-3 w-3" />
                          {loadingPlayerId === s.bookingId ? "Chargement..." : "Voir l'enregistrement"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {playerUrl && <RecordingPlayerModal url={playerUrl} onClose={() => setPlayerUrl(null)} />}
    </main>
  );
}
