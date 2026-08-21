"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteNavbar } from "@/components/site-navbar";
import { Conversation, CustomOffer } from "@/lib/server/chat-store";

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setPending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
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
  const [userRole, setUserRole] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("profyspace_user");
        if (stored) {
          const u = JSON.parse(stored);
          if (u?.role) return u.role;
        }
      } catch {}
    }
    return "STUDENT";
  });

  // Offer Modal State
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerSubject, setOfferSubject] = useState("Mathématiques - Séance de soutien");
  const [offerStartsAt, setOfferStartsAt] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
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

  useEffect(() => {
    try {
      const stored = localStorage.getItem("profyspace_user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u?.id) Promise.resolve().then(() => setCurrentUserId(u.id));
        if (u?.role) Promise.resolve().then(() => setUserRole(u.role));
      }
    } catch {}

    const params = new URLSearchParams(window.location.search);
    const teacherId = params.get("teacherId");
    fetchConversations(teacherId);

    // Fast polling every 2 seconds for instant messaging responsiveness
    const interval = setInterval(() => {
      fetchConversations(null, true);
    }, 2000);

    // Set default offer date to tomorrow 14:00 if not set
    Promise.resolve().then(() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0);
      setOfferStartsAt(tomorrow.toISOString().slice(0, 16));
    });

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages]);

  async function fetchConversations(teacherId?: string | null, isSilent = false) {
    if (!isSilent) setLoading(true);
    try {
      const url = teacherId ? `/api/chat/conversations?teacherId=${teacherId}` : "/api/chat/conversations";
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
        if (data.activeConversation && !isSilent) {
          setActiveConv(data.activeConversation);
        } else if (data.conversations && data.conversations.length > 0 && !activeConv) {
          setActiveConv(data.conversations[0]);
        } else if (activeConv) {
          // Update active conversation in place without clearing history
          const updated = (data.conversations || []).find((c: Conversation) => c.id === activeConv.id);
          if (updated) setActiveConv(updated);
        }
      }
    } catch {} finally {
      if (!isSilent) setLoading(false);
    }
  }

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
          setActiveConv((prev) => prev ? { ...prev, messages: [...prev.messages, data.message] } : null);
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
          text: `Nouvelle offre de cours : ${offerSubject} (${offerAmountTnd} DT)`,
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
        setActiveConv((prev) => prev ? { ...prev, messages: [...prev.messages, data.message] } : null);
        setShowOfferModal(false);
      }
    } catch {
      setOfferPending(false);
      setOfferError("Erreur de connexion.");
    }
  }

  async function handleAcceptOffer(offer: CustomOffer) {
    try {
      const res = await fetch(`/api/chat/offers/${offer.id}/accept`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || "Impossible d'accepter l'offre.");
        if (data.insufficientBalance) {
          router.push("/dashboard/wallet");
        }
        return;
      }

      alert("Offre acceptée et séance réservée avec succès ! Le montant a été prélevé de votre portefeuille.");
      fetchConversations(null, true);
    } catch {
      alert("Erreur de connexion.");
    }
  }

  async function handleRejectOffer(offer: CustomOffer) {
    try {
      const res = await fetch(`/api/chat/offers/${offer.id}/reject`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        fetchConversations(null, true);
      }
    } catch {}
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <SiteNavbar dark={false} />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 border border-slate-200 shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#0d8d78]">
            Messagerie Directe ProfySpace
          </span>
          <h1 className="mt-1 text-2xl font-bold text-[#11233f]">
            Conversations & Offres Sur-Mesure
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Discutez directement avec votre professeur/élève et convenez d'une offre adaptée.
          </p>
        </div>

        {userRole === "TEACHER" && activeConv && (
          <button
            onClick={() => setShowOfferModal(true)}
            className="rounded-2xl bg-[#0d8d78] px-5 py-3 text-xs font-bold text-white shadow-md transition hover:bg-[#0b7866]"
          >
            + Envoyer une offre de cours (DT)
          </button>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[550px]">
        {/* Conversations List */}
        <div className="md:col-span-4 rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2">
            Vos Conversations
          </h2>

          {loading ? (
            <p className="text-xs text-slate-400 p-4">Chargement des conversations...</p>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center space-y-3">
              <p className="text-xs text-slate-500">
                {userRole === "TEACHER"
                  ? "Aucun message reçu pour le moment. Vos élèves pourront vous contacter directement ici."
                  : "Aucune conversation pour le moment."}
              </p>
              {userRole === "STUDENT" ? (
                <Link
                  href="/teachers"
                  className="inline-block rounded-xl bg-[#0d8d78] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0b7866]"
                >
                  Trouver un professeur →
                </Link>
              ) : (
                <Link
                  href="/teachers"
                  className="inline-block rounded-xl bg-[#0d8d78] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0b7866]"
                >
                  Voir ma fiche publique ↗
                </Link>
              )}
            </div>
          ) : (
            conversations.map((c) => {
              const otherName = userRole === "TEACHER" ? c.studentName : c.teacherName;
              const isActive = activeConv?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setActiveConv(c)}
                  className={`flex items-center gap-3 rounded-2xl p-3.5 cursor-pointer transition ${
                    isActive ? "bg-[#11233f] text-white shadow-md" : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-bold text-sm ${
                      isActive ? "bg-[#0d8d78] text-white" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {otherName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{otherName}</p>
                    <p className={`text-[11px] truncate mt-0.5 ${isActive ? "text-slate-300" : "text-slate-400"}`}>
                      {c.messages.length > 0 ? c.messages[c.messages.length - 1].text : "Nouvelle discussion"}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Chat Thread */}
        <div className="md:col-span-8 rounded-3xl bg-white border border-slate-200 p-5 flex flex-col justify-between shadow-sm">
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#11233f]">
                    {userRole === "TEACHER" ? activeConv.studentName : activeConv.teacherName}
                  </h3>
                  <span className="text-[11px] font-semibold flex items-center gap-1.5 mt-0.5 text-emerald-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    En ligne • Discussion sécurisée ProfySpace
                  </span>
                </div>

                {userRole === "TEACHER" && (
                  <button
                    onClick={() => setShowOfferModal(true)}
                    className="rounded-xl border border-[#0d8d78] bg-[#e5f7f2] px-3.5 py-1.5 text-xs font-bold text-[#0d8d78] transition hover:bg-[#d4f2e9]"
                  >
                    + Créer Offre (DT)
                  </button>
                )}
              </div>

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 max-h-[420px] pr-2">
                {activeConv.messages.map((m) => {
                  const isMe = m.senderId === currentUserId;
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
                        {m.senderName}
                      </span>
                      <div
                        className={`max-w-[85%] rounded-3xl p-4 text-xs leading-relaxed ${
                          isMe
                            ? "bg-[#11233f] text-white rounded-br-xs shadow-sm"
                            : "bg-slate-100 text-slate-800 rounded-bl-xs"
                        }`}
                      >
                        <p>{m.text}</p>

                        {/* Custom Offer Card in Chat (Permanently Saved in History) */}
                        {m.offer && (
                          <div className="mt-3 rounded-2xl bg-white p-4 border border-slate-200 text-slate-800 shadow-md space-y-2.5">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0d8d78]">
                                Offre Sur-Mesure
                              </span>
                              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                                m.offer.status === "ACCEPTED"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : m.offer.status === "REJECTED"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-amber-100 text-amber-800"
                              }`}>
                                {m.offer.status === "ACCEPTED" ? "✓ Acceptée" : m.offer.status === "REJECTED" ? "✕ Refusée" : "En attente"}
                              </span>
                            </div>

                            <div>
                              <p className="font-bold text-sm text-[#11233f]">{m.offer.subject}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-3 text-slate-500 text-[11px]">
                                <span>Durée : {m.offer.durationMinutes} min</span>
                                <span>Date : {new Date(m.offer.startsAt).toLocaleDateString("fr-TN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                              <span className="text-xs text-slate-500">Tarif proposé :</span>
                              <span className="text-base font-extrabold text-[#0d8d78]">
                                {m.offer.amountTnd} DT
                              </span>
                            </div>

                            {/* Action Buttons for Student */}
                            {userRole === "STUDENT" && m.offer.status === "PENDING" && (
                              <div className="pt-2 flex gap-2">
                                <button
                                  onClick={() => handleAcceptOffer(m.offer!)}
                                  className="flex-1 rounded-xl bg-[#0d8d78] py-2 text-center text-xs font-bold text-white transition hover:bg-[#0b7866]"
                                >
                                  Accepter l'offre ({m.offer.amountTnd} DT) →
                                </button>
                                <button
                                  onClick={() => handleRejectOffer(m.offer!)}
                                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                                >
                                  Refuser
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1 px-1">
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
                  placeholder="Écrivez votre message..."
                  className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-800 outline-none focus:border-[#0d8d78] focus:bg-white transition"
                />
                {userRole === "TEACHER" && (
                  <button
                    type="button"
                    onClick={() => setShowOfferModal(true)}
                    className="rounded-2xl border border-[#0d8d78] bg-[#e5f7f2] px-3.5 py-3 text-xs font-bold text-[#0d8d78] transition hover:bg-[#d4f2e9] shrink-0"
                  >
                    + Offre (DT)
                  </button>
                )}
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
            <div className="py-20 text-center text-slate-400 text-xs space-y-2">
              <p className="font-bold text-slate-600 text-sm">Sélectionnez une conversation</p>
              <p>Choisissez un échange dans la liste de gauche pour afficher vos messages.</p>
            </div>
          )}
        </div>
      </div>

      {/* Offer Modal */}
      {showOfferModal && activeConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#11233f]">Créer une Offre Sur-Mesure</h3>
              <button onClick={() => setShowOfferModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
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
                <p className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-rose-700 font-bold">{offerError}</p>
              )}

              <button
                type="submit"
                disabled={offerPending}
                className="w-full rounded-2xl bg-[#0d8d78] py-3.5 text-center font-bold text-white shadow-md transition hover:bg-[#0b7866] disabled:opacity-50"
              >
                {offerPending ? "Envoi en cours..." : "Envoyer l'offre de cours à l'élève →"}
              </button>
            </form>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}
