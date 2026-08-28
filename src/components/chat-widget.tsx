/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { IconMessageSquare, IconSend, IconX } from "@/components/icons";
import { SupportTicketsPanel } from "@/components/support-tickets-panel";

type GuestTicket = { id: string; email: string };
type TicketMessage = { id: string; senderId: string; senderName: string; senderRole: string; text: string; createdAt: string };

const GUEST_TICKET_KEY = "profyspace_guest_ticket";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" });
}

function GuestChat() {
  const [guestTicket, setGuestTicket] = useState<GuestTicket | null>(null);
  const [checkedStorage, setCheckedStorage] = useState(false);

  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [subject, setSubject] = useState("");
  const [loadingThread, setLoadingThread] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(GUEST_TICKET_KEY);
      if (stored) setGuestTicket(JSON.parse(stored));
    } catch {}
    setCheckedStorage(true);
  }, []);

  function loadThread(id: string) {
    setLoadingThread(true);
    fetch(`/api/support/tickets/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ticket) {
          setMessages(data.ticket.messages);
          setSubject(data.ticket.subject);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingThread(false));
  }

  useEffect(() => {
    if (guestTicket) loadThread(guestTicket.id);
  }, [guestTicket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function startConversation(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim() || !text.trim()) {
      setError("Nom, email et message sont requis.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "Question depuis le site",
          message: text.trim(),
          guestName: name.trim(),
          guestEmail: email.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Impossible d'envoyer votre message.");
        return;
      }
      const stored: GuestTicket = { id: data.ticket.id, email: email.trim() };
      localStorage.setItem(GUEST_TICKET_KEY, JSON.stringify(stored));
      setGuestTicket(stored);
      setText("");
    } catch {
      setError("Erreur de connexion.");
    } finally {
      setSending(false);
    }
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !guestTicket) return;
    setSending(true);
    try {
      const res = await fetch(`/api/support/tickets/${guestTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setText("");
      }
    } finally {
      setSending(false);
    }
  }

  if (!checkedStorage) return null;

  if (!guestTicket) {
    return (
      <form onSubmit={startConversation} className="flex h-full flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <p className="text-xs text-slate-500">
            Laissez-nous vos coordonnées et votre question, un membre de l&apos;équipe ProfySpace vous répond par email.
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Votre nom"
            className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Votre email"
            className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Votre question..."
            className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
          />
          {error && <p className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-semibold text-rose-700">{error}</p>}
        </div>
        <div className="border-t border-slate-100 p-3">
          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-2xl bg-[#0d8d78] py-3 text-sm font-bold text-white transition hover:bg-[#0b7866] disabled:opacity-50"
          >
            {sending ? "Envoi..." : "Envoyer →"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {loadingThread ? (
          <p className="text-center text-xs text-slate-400">Chargement...</p>
        ) : (
          <>
            {subject && <p className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">{subject}</p>}
            {messages.map((m) => {
              const isMe = m.senderRole === "GUEST";
              return (
                <div key={m.id} className={isMe ? "text-right" : "text-left"}>
                  <p className="mb-0.5 text-[10px] text-slate-400">
                    {isMe ? "Vous" : "Support ProfySpace"} · {formatTime(m.createdAt)}
                  </p>
                  <div className={`inline-block max-w-[85%] rounded-2xl p-3 text-left text-xs leading-relaxed ${isMe ? "bg-[#0d8d78] text-white" : "bg-slate-100 text-slate-700"}`}>
                    {m.text}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>
      <form onSubmit={sendReply} className="flex items-center gap-2 border-t border-slate-100 p-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Écrire un message..."
          className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-[#0d8d78] focus:ring-2 focus:ring-[#d9f1e9]"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="rounded-xl bg-[#0d8d78] p-2.5 text-white transition hover:bg-[#0b7866] disabled:opacity-50"
        >
          <IconSend className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUserId(data?.user?.id || null))
      .catch(() => {})
      .finally(() => setCheckedAuth(true));
  }, []);

  // A floating "chat with us" bubble doesn't belong on top of the video
  // call UI, or duplicated inside the admin console, which already has
  // its own dedicated ticket management screens.
  if (pathname?.startsWith("/classroom") || pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[520px] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-[#0d8d78] px-5 py-4 text-white">
            <div>
              <p className="text-sm font-bold">Des questions ? Discutez avec nous</p>
              <p className="text-[11px] text-white/80">Réponse par notre équipe sous 24h</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-1.5 transition hover:bg-white/15"
              aria-label="Fermer"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {!checkedAuth ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#0d8d78] border-t-transparent" />
              </div>
            ) : userId ? (
              <div className="h-full overflow-y-auto p-3">
                <SupportTicketsPanel currentUserId={userId} />
              </div>
            ) : (
              <GuestChat />
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0d8d78] text-white shadow-xl transition hover:bg-[#0b7866] hover:scale-105"
        aria-label={open ? "Fermer le chat" : "Ouvrir le chat"}
      >
        {open ? <IconX className="h-6 w-6" /> : <IconMessageSquare className="h-6 w-6" />}
      </button>
    </div>
  );
}
