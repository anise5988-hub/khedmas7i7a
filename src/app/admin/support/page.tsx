/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconSend } from "@/components/icons";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category: string | null;
  createdAt: string;
  updatedAt: string;
  user: { firstName: string; lastName: string; email: string; role: string } | null;
  guestName: string | null;
  guestEmail: string | null;
  messages: { text: string; createdAt: string }[];
};

function ticketAuthorLabel(t: Pick<Ticket, "user" | "guestName" | "guestEmail">) {
  if (t.user) return `${t.user.firstName} ${t.user.lastName} · ${t.user.role === "TEACHER" ? "Prof" : "Élève"}`;
  return `${t.guestName || "Visiteur"} (invité) · ${t.guestEmail || ""}`;
}

type TicketMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  createdAt: string;
};

const STATUS_LABELS: Record<string, string> = { OPEN: "Ouvert", IN_PROGRESS: "En cours", RESOLVED: "Résolu", CLOSED: "Fermé" };
const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-amber-500/20 text-amber-300",
  IN_PROGRESS: "bg-blue-500/20 text-blue-300",
  RESOLVED: "bg-emerald-500/20 text-emerald-300",
  CLOSED: "bg-slate-500/20 text-slate-400",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-TN", { dateStyle: "short", timeStyle: "short" });
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [activeMessages, setActiveMessages] = useState<TicketMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  function loadTickets() {
    setLoading(true);
    const params = statusFilter ? `?status=${statusFilter}` : "";
    fetch(`/api/support/tickets${params}`)
      .then((res) => (res.ok ? res.json() : { tickets: [] }))
      .then((data) => setTickets(data.tickets || []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function openTicket(id: string) {
    setActiveId(id);
    const res = await fetch(`/api/support/tickets/${id}`);
    if (res.ok) {
      const data = await res.json();
      setActiveTicket(data.ticket);
      setActiveMessages(data.ticket.messages);
    }
  }

  async function changeStatus(status: string) {
    if (!activeId) return;
    await fetch(`/api/support/tickets/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setActiveTicket((prev) => (prev ? { ...prev, status } : prev));
    loadTickets();
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim() || !activeId) return;
    setSending(true);
    try {
      const res = await fetch(`/api/support/tickets/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: replyText.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveMessages((prev) => [...prev, data.message]);
        setReplyText("");
        loadTickets();
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#101b2d] px-4 py-8 sm:px-6 sm:py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h1 className="text-3xl font-bold">Support</h1>
            <p className="mt-1 text-sm text-slate-400">Tickets d&apos;assistance des élèves et professeurs.</p>
          </div>
          <Link href="/admin" className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10">
            ← Retour Dashboard
          </Link>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[360px_1fr]">
          {/* Ticket list */}
          <div className="rounded-3xl border border-white/10 bg-white/[.03] overflow-hidden">
            <div className="border-b border-white/10 p-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white outline-none"
              >
                <option value="">Tous les statuts</option>
                <option value="OPEN">Ouvert</option>
                <option value="IN_PROGRESS">En cours</option>
                <option value="RESOLVED">Résolu</option>
                <option value="CLOSED">Fermé</option>
              </select>
            </div>
            <div className="max-h-[600px] overflow-y-auto divide-y divide-white/5">
              {loading ? (
                <p className="p-6 text-center text-xs text-slate-400">Chargement...</p>
              ) : tickets.length === 0 ? (
                <p className="p-6 text-center text-xs text-slate-400">Aucun ticket.</p>
              ) : (
                tickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => openTicket(t.id)}
                    className={`flex w-full flex-col gap-1 p-4 text-left transition hover:bg-white/[.04] ${activeId === t.id ? "bg-white/[.06]" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold">{t.subject}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[t.status]}`}>
                        {STATUS_LABELS[t.status]}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{ticketAuthorLabel(t)}</p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Detail */}
          <div className="rounded-3xl border border-white/10 bg-white/[.03] overflow-hidden">
            {!activeTicket ? (
              <div className="flex h-full min-h-[400px] items-center justify-center text-sm text-slate-400">
                Sélectionnez un ticket pour voir la conversation.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
                  <div>
                    <h2 className="text-base font-bold">{activeTicket.subject}</h2>
                    <p className="text-xs text-slate-400">
                      {activeTicket.user
                        ? `${activeTicket.user.firstName} ${activeTicket.user.lastName} (${activeTicket.user.email})`
                        : `${activeTicket.guestName || "Visiteur"} (invité, ${activeTicket.guestEmail || "email inconnu"})`}
                    </p>
                  </div>
                  <select
                    value={activeTicket.status}
                    onChange={(e) => changeStatus(e.target.value)}
                    className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white outline-none"
                  >
                    <option value="OPEN">Ouvert</option>
                    <option value="IN_PROGRESS">En cours</option>
                    <option value="RESOLVED">Résolu</option>
                    <option value="CLOSED">Fermé</option>
                  </select>
                </div>

                <div className="max-h-[420px] space-y-4 overflow-y-auto p-4">
                  {activeMessages.map((m) => (
                    <div key={m.id} className={m.senderRole === "ADMIN" ? "text-right" : "text-left"}>
                      <p className="mb-0.5 text-[10px] text-slate-500">
                        {m.senderRole === "ADMIN" ? "Vous (support)" : m.senderName} · {formatDate(m.createdAt)}
                      </p>
                      <div
                        className={`inline-block max-w-[85%] rounded-2xl p-3.5 text-left text-xs leading-relaxed ${
                          m.senderRole === "ADMIN" ? "bg-[#0d8d78] text-white" : "bg-white/10 text-slate-200"
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={sendReply} className="flex items-center gap-2 border-t border-white/10 p-4">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Répondre au ticket..."
                    className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#72d6bf]"
                  />
                  <button
                    type="submit"
                    disabled={sending || !replyText.trim()}
                    className="rounded-xl bg-[#72d6bf] p-2.5 text-[#101b2d] transition hover:bg-[#5ec4ad] disabled:opacity-50"
                  >
                    <IconSend className="h-4 w-4" />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
