/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { IconMessageSquare, IconSend, IconPlus } from "@/components/icons";

type Ticket = {
  id: string;
  subject: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: string;
  category: string | null;
  createdAt: string;
  updatedAt: string;
  messages: { text: string; createdAt: string }[];
  _count: { messages: number };
};

type TicketMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  createdAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Ouvert",
  IN_PROGRESS: "En cours",
  RESOLVED: "Résolu",
  CLOSED: "Fermé",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  RESOLVED: "bg-emerald-100 text-emerald-800",
  CLOSED: "bg-slate-100 text-slate-600",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-TN", { dateStyle: "short", timeStyle: "short" });
}

export function SupportTicketsPanel({ currentUserId }: { currentUserId: string }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<TicketMessage[]>([]);
  const [activeSubject, setActiveSubject] = useState("");
  const [activeStatus, setActiveStatus] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  function loadTickets() {
    setLoading(true);
    fetch("/api/support/tickets")
      .then((res) => (res.ok ? res.json() : { tickets: [] }))
      .then((data) => setTickets(data.tickets || []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadTickets();
  }, []);

  async function openTicket(id: string) {
    setActiveTicketId(id);
    setView("detail");
    const res = await fetch(`/api/support/tickets/${id}`);
    if (res.ok) {
      const data = await res.json();
      setActiveMessages(data.ticket.messages);
      setActiveSubject(data.ticket.subject);
      setActiveStatus(data.ticket.status);
    }
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim() || !activeTicketId) return;
    setSending(true);
    try {
      const res = await fetch(`/api/support/tickets/${activeTicketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: replyText.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveMessages((prev) => [...prev, data.message]);
        setReplyText("");
      }
    } finally {
      setSending(false);
    }
  }

  async function createTicket(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: newSubject.trim(), message: newMessage.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewSubject("");
        setNewMessage("");
        setView("list");
        loadTickets();
      } else {
        setCreateError(data.error || "Erreur lors de la création du ticket.");
      }
    } catch {
      setCreateError("Erreur de connexion.");
    } finally {
      setCreating(false);
    }
  }

  if (view === "detail" && activeTicketId) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <button onClick={() => setView("list")} className="text-xs font-bold text-slate-400 hover:text-slate-600">
              ← Tous les tickets
            </button>
            <h2 className="mt-1 text-base font-bold text-[#11233f]">{activeSubject}</h2>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_COLORS[activeStatus] || "bg-slate-100 text-slate-600"}`}>
            {STATUS_LABELS[activeStatus] || activeStatus}
          </span>
        </div>

        <div className="max-h-[420px] space-y-4 overflow-y-auto p-5">
          {activeMessages.map((m) => {
            const isMe = m.senderId === currentUserId;
            return (
              <div key={m.id} className={isMe ? "text-right" : "text-left"}>
                <p className="mb-0.5 text-[10px] text-slate-400">
                  {isMe ? "Vous" : m.senderRole === "ADMIN" ? "Support ProfySpace" : m.senderName} · {formatDate(m.createdAt)}
                </p>
                <div className={`inline-block max-w-[85%] rounded-2xl p-3.5 text-left text-xs leading-relaxed ${isMe ? "bg-[#0d8d78] text-white" : "bg-slate-100 text-slate-700"}`}>
                  {m.text}
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={sendReply} className="flex items-center gap-2 border-t border-slate-100 p-4">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Écrire une réponse..."
            className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
          />
          <button
            type="submit"
            disabled={sending || !replyText.trim()}
            className="rounded-xl bg-[#0d8d78] p-2.5 text-white transition hover:bg-[#0b7866] disabled:opacity-50"
          >
            <IconSend className="h-4 w-4" />
          </button>
        </form>
      </div>
    );
  }

  if (view === "create") {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <button onClick={() => setView("list")} className="text-xs font-bold text-slate-400 hover:text-slate-600">
          ← Annuler
        </button>
        <h2 className="mt-2 text-base font-bold text-[#11233f]">Nouveau ticket de support</h2>

        {createError && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{createError}</div>
        )}

        <form onSubmit={createTicket} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Sujet</label>
            <input
              type="text"
              required
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="Ex: Problème de recharge portefeuille"
              className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Message</label>
            <textarea
              required
              rows={4}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Décrivez votre problème en détail..."
              className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="w-full rounded-2xl bg-[#0d8d78] py-3 text-sm font-bold text-white transition hover:bg-[#0b7866] disabled:opacity-50"
          >
            {creating ? "Envoi..." : "Envoyer le ticket"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 p-5">
        <div>
          <h2 className="text-base font-bold text-[#11233f]">Mes tickets de support</h2>
          <p className="text-xs text-slate-500">Suivez vos demandes d&apos;assistance auprès de l&apos;équipe ProfySpace.</p>
        </div>
        <button
          onClick={() => setView("create")}
          className="flex items-center gap-1.5 rounded-xl bg-[#0d8d78] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#0b7866]"
        >
          <IconPlus className="h-3.5 w-3.5" />
          Nouveau ticket
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {loading ? (
          <p className="p-8 text-center text-xs text-slate-400">Chargement...</p>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <IconMessageSquare className="h-8 w-8 text-slate-300" />
            <p className="text-xs text-slate-400">Aucun ticket pour le moment.</p>
          </div>
        ) : (
          tickets.map((t) => (
            <button
              key={t.id}
              onClick={() => openTicket(t.id)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-slate-50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#11233f]">{t.subject}</p>
                {t.messages[0] && <p className="truncate text-xs text-slate-500">{t.messages[0].text}</p>}
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_COLORS[t.status] || "bg-slate-100 text-slate-600"}`}>
                {STATUS_LABELS[t.status] || t.status}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
