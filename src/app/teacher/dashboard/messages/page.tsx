/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState, useRef } from "react";
import { SiteNavbar } from "@/components/site-navbar";
import { Conversation } from "@/lib/server/chat-store";
import {
  IconMessageSquare,
  IconSearch,
  IconDollarSign,
} from "@/components/icons";

export default function TeacherMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setPending] = useState(false);
  const [currentUserId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("profyspace_user");
        if (stored) {
          const u = JSON.parse(stored);
          if (u?.id) return u.id;
        }
      } catch {}
    }
    return "";
  });

  // Offer Modal State
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerSubject, setOfferSubject] = useState("Mathématiques - Séance de révision");
  const [offerStartsAt, setOfferStartsAt] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(16, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  });
  const [offerDuration, setOfferDuration] = useState(60);
  const [offerAmountTnd, setOfferAmountTnd] = useState(30);
  const [offerPending, setOfferPending] = useState(false);
  const [offerError, setOfferError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  function getAuthHeaders(): Record<string, string> {
    const userId = typeof window !== "undefined" ? localStorage.getItem("profyspace_user_id") || "" : "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (userId) headers["x-user-id"] = userId;
    return headers;
  }

  async function fetchConversations(isSilent = false) {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch("/api/chat/conversations", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const convs = data.conversations || [];
        setConversations(convs);
        if (convs.length > 0 && !activeConv && !isSilent) {
          setActiveConv(convs[0]);
        } else if (activeConv) {
          const updated = convs.find((c: Conversation) => c.id === activeConv.id);
          if (updated) setActiveConv(updated);
        }
      }
    } catch {} finally {
      if (!isSilent) setLoading(false);
    }
  }

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(() => {
      fetchConversations(true);
    }, 2500);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!text.trim() || !activeConv) return;

    const messageText = text.trim();
    setText("");
    setPending(true);

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          conversationId: activeConv.id,
          text: messageText,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setActiveConv((prev) => (prev ? { ...prev, messages: [...prev.messages, data.message] } : null));
        }
      }
    } catch {} finally {
      setPending(false);
    }
  }

  async function handleSendOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!activeConv) return;
    setOfferError("");
    setOfferPending(true);

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          conversationId: activeConv.id,
          text: `Nouvelle offre de cours proposée : ${offerSubject} (${offerAmountTnd} DT)`,
          offer: {
            subject: offerSubject,
            startsAt: offerStartsAt,
            durationMinutes: offerDuration,
            amountTnd: offerAmountTnd,
          },
        }),
      });

      const data = await res.json();
      setOfferPending(false);

      if (!res.ok) {
        setOfferError(data.error || "Erreur lors de l'envoi de l'offre.");
        return;
      }

      if (data.message) {
        setActiveConv((prev) => (prev ? { ...prev, messages: [...prev.messages, data.message] } : null));
        setShowOfferModal(false);
      }
    } catch {
      setOfferPending(false);
      setOfferError("Erreur de connexion.");
    }
  }

  const filteredConversations = conversations.filter((c) =>
    c.studentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <SiteNavbar dark={false} />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 border border-slate-200 shadow-sm">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0d8d78]">
              Messagerie & Négociations
            </span>
            <h1 className="mt-1 text-2xl font-bold text-[#11233f]">
              Discussions & Offres avec les Élèves
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Échangez en direct avec vos élèves et envoyez des offres sur-mesure (en Dinars Tunisiens).
            </p>
          </div>

          {activeConv && (
            <button
              onClick={() => setShowOfferModal(true)}
              className="flex items-center gap-2 rounded-2xl bg-[#0d8d78] px-5 py-3 text-xs font-bold text-white shadow-md transition hover:bg-[#0b7866]"
            >
              <IconDollarSign className="h-4 w-4" />
              <span>+ Proposer une offre de cours (DT)</span>
            </button>
          )}
        </div>

        {/* Dual Pane Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[580px]">
          {/* Left: Conversations List */}
          <div className="md:col-span-4 rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-sm flex flex-col">
            <div className="relative">
              <IconSearch className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un élève..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs outline-none focus:bg-white focus:border-[#0d8d78]"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0d8d78] border-t-transparent mx-auto mb-2" />
                  Chargement des messages...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-6 text-center space-y-2 text-slate-500">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <IconMessageSquare className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold">Aucune conversation trouvée.</p>
                  <p className="text-[11px] text-slate-400">
                    Les messages des élèves intéressés par vos cours apparaîtront ici.
                  </p>
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const isActive = activeConv?.id === c.id;
                  const lastMsg = c.messages[c.messages.length - 1];
                  return (
                    <div
                      key={c.id}
                      onClick={() => setActiveConv(c)}
                      className={`flex items-center gap-3 rounded-2xl p-3 cursor-pointer transition ${
                        isActive ? "bg-[#11233f] text-white shadow-md" : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-bold text-sm ${
                          isActive ? "bg-[#0d8d78] text-white" : "bg-[#e5f7f2] text-[#0d8d78]"
                        }`}
                      >
                        {c.studentName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold truncate">{c.studentName}</p>
                          {lastMsg && (
                            <span className={`text-[9px] font-mono ${isActive ? "text-slate-300" : "text-slate-400"}`}>
                              {new Date(lastMsg.createdAt).toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] truncate mt-0.5 ${isActive ? "text-slate-300" : "text-slate-400"}`}>
                          {lastMsg ? lastMsg.text : "Nouvelle discussion"}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Active Chat Area */}
          <div className="md:col-span-8 rounded-3xl bg-white border border-slate-200 p-5 flex flex-col justify-between shadow-sm">
            {activeConv ? (
              <>
                {/* Chat Header */}
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e5f7f2] text-[#0d8d78] font-bold">
                      {activeConv.studentName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#11233f]">{activeConv.studentName}</h3>
                      <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5 mt-0.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Élève en ligne · Discussion sécurisée
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowOfferModal(true)}
                    className="rounded-xl border border-[#0d8d78] bg-[#e5f7f2] px-3.5 py-1.5 text-xs font-bold text-[#0d8d78] transition hover:bg-[#d4f2e9]"
                  >
                    + Créer Offre (DT)
                  </button>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto py-4 space-y-4 max-h-[440px] pr-2">
                  {activeConv.messages.map((m) => {
                    const isMe = m.senderId === currentUserId || m.senderRole === "TEACHER";
                    const isSystem = m.senderRole === "ADMIN";

                    if (isSystem) {
                      return (
                        <div key={m.id} className="text-center py-2">
                          <span className="inline-block rounded-full bg-slate-100 px-4 py-1.5 text-[11px] font-semibold text-slate-500">
                            {m.text}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        <span className="text-[10px] font-bold text-slate-400 mb-1 px-1">
                          {isMe ? "Vous (Professeur)" : m.senderName}
                        </span>
                        <div
                          className={`max-w-[85%] rounded-3xl p-4 text-xs leading-relaxed ${
                            isMe
                              ? "bg-[#11233f] text-white rounded-br-xs shadow-sm"
                              : "bg-slate-100 text-slate-800 rounded-bl-xs"
                          }`}
                        >
                          <p>{m.text}</p>

                          {/* Custom Offer Box */}
                          {m.offer && (
                            <div className="mt-3 rounded-2xl bg-white p-4 border border-slate-200 text-slate-800 shadow-md space-y-2.5">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-[#0d8d78]">
                                  Offre Sur-Mesure Envoyée
                                </span>
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                                    m.offer.status === "ACCEPTED"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : m.offer.status === "REJECTED"
                                      ? "bg-rose-100 text-rose-700"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {m.offer.status === "ACCEPTED"
                                    ? "✓ Acceptée par l'élève"
                                    : m.offer.status === "REJECTED"
                                    ? "✕ Refusée"
                                    : "En attente de réponse"}
                                </span>
                              </div>

                              <div>
                                <p className="font-bold text-sm text-[#11233f]">{m.offer.subject}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-3 text-slate-500 text-[11px]">
                                  <span>Durée : {m.offer.durationMinutes} min</span>
                                  <span>
                                    Date :{" "}
                                    {new Date(m.offer.startsAt).toLocaleDateString("fr-TN", {
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                <span className="text-xs text-slate-500">Tarif proposé :</span>
                                <span className="text-base font-extrabold text-[#0d8d78]">
                                  {m.offer.amountTnd} DT
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400 mt-1 px-1 font-mono">
                          {new Date(m.createdAt).toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Form */}
                <form onSubmit={handleSendMessage} className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Écrivez votre message à l'élève..."
                    className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-800 outline-none focus:border-[#0d8d78] focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOfferModal(true)}
                    className="rounded-2xl border border-[#0d8d78] bg-[#e5f7f2] px-3.5 py-3 text-xs font-bold text-[#0d8d78] transition hover:bg-[#d4f2e9] shrink-0"
                  >
                    + Offre (DT)
                  </button>
                  <button
                    type="submit"
                    disabled={sending || !text.trim()}
                    className="rounded-2xl bg-[#0d8d78] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#0b7866] disabled:opacity-50 shrink-0"
                  >
                    Envoyer →
                  </button>
                </form>
              </>
            ) : (
              <div className="py-24 text-center text-slate-400 text-xs space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <IconMessageSquare className="h-6 w-6" />
                </div>
                <p className="font-bold text-slate-600 text-sm">Sélectionnez une discussion</p>
                <p>Choisissez un échange avec un élève à gauche pour lire et répondre aux messages.</p>
              </div>
            )}
          </div>
        </div>

        {/* Offer Creation Modal */}
        {showOfferModal && activeConv && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-[#11233f]">
                  Créer une Offre Sur-Mesure pour {activeConv.studentName}
                </h3>
                <button onClick={() => setShowOfferModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSendOffer} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Matière / Intitulé de la séance</label>
                  <input
                    type="text"
                    required
                    value={offerSubject}
                    onChange={(e) => setOfferSubject(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#0d8d78]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Date et heure</label>
                    <input
                      type="datetime-local"
                      required
                      value={offerStartsAt}
                      onChange={(e) => setOfferStartsAt(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#0d8d78]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Durée (minutes)</label>
                    <select
                      value={offerDuration}
                      onChange={(e) => setOfferDuration(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#0d8d78]"
                    >
                      <option value={60}>60 min (1h)</option>
                      <option value={90}>90 min (1h30)</option>
                      <option value={120}>120 min (2h)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">Tarif proposé (DT)</label>
                  <input
                    type="number"
                    min={10}
                    step={5}
                    required
                    value={offerAmountTnd}
                    onChange={(e) => setOfferAmountTnd(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm font-bold text-[#0d8d78] outline-none focus:border-[#0d8d78]"
                  />
                </div>

                {offerError && (
                  <p className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-rose-700 font-bold">
                    {offerError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={offerPending}
                  className="w-full rounded-2xl bg-[#0d8d78] py-3.5 text-center font-bold text-white shadow-md transition hover:bg-[#0b7866] disabled:opacity-50"
                >
                  {offerPending ? "Envoi en cours..." : "Envoyer l'offre à l'élève →"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}