/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AuditLogEntry = {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorRole: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

const ACTION_LABELS: Record<string, string> = {
  USER_ROLE_CHANGED: "Rôle utilisateur modifié",
  TEACHER_VERIFICATION_CHANGED: "Vérification professeur",
  WITHDRAWAL_STATUS_CHANGED: "Statut de retrait",
  DEPOSIT_STATUS_CHANGED: "Statut de dépôt",
  PLATFORM_SETTINGS_UPDATED: "Paramètres plateforme",
  COUPON_CREATED: "Coupon créé",
  COUPON_UPDATED: "Coupon modifié",
  COUPON_DELETED: "Coupon supprimé",
  SUPPORT_TICKET_STATUS_CHANGED: "Statut ticket support",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-TN", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [filterAction, setFilterAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  function load(reset: boolean) {
    if (reset) setLoading(true);
    const params = new URLSearchParams();
    if (filterAction) params.set("action", filterAction);
    if (!reset && nextCursor) params.set("cursor", nextCursor);

    fetch(`/api/admin/audit-logs?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : { logs: [], actions: [], nextCursor: null }))
      .then((data) => {
        setLogs((prev) => (reset ? data.logs : [...prev, ...data.logs]));
        setActions(data.actions || []);
        setNextCursor(data.nextCursor);
      })
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  }

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterAction]);

  return (
    <main className="min-h-screen bg-[#101b2d] px-4 py-8 sm:px-6 sm:py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h1 className="text-3xl font-bold">Journal d&apos;activité</h1>
            <p className="mt-1 text-sm text-slate-400">
              Historique des actions administratives sensibles (rôles, vérifications, paiements, paramètres).
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
          >
            ← Retour Dashboard
          </Link>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white outline-none"
          >
            <option value="">Toutes les actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a] || a}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 space-y-2">
          {loading ? (
            <p className="text-sm text-slate-400 py-8 text-center">Chargement...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Aucune action enregistrée pour le moment.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-[#72d6bf]/15 px-2.5 py-1 text-[11px] font-bold text-[#72d6bf]">
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                    <span className="text-xs text-slate-400">
                      par <strong className="text-slate-200">{log.actorName || "Système"}</strong>
                      {log.actorRole ? ` (${log.actorRole})` : ""}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">{formatDate(log.createdAt)}</span>
                </div>
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <pre className="mt-2 overflow-x-auto rounded-xl bg-black/30 p-2.5 text-[11px] text-slate-400">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>

        {nextCursor && !loading && (
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setLoadingMore(true);
                load(false);
              }}
              disabled={loadingMore}
              className="rounded-xl border border-white/20 px-5 py-2 text-xs font-bold text-white hover:bg-white/10 disabled:opacity-50"
            >
              {loadingMore ? "Chargement..." : "Charger plus"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
