"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteNavbar } from "@/components/site-navbar";
import { Conversation, CustomOffer } from "@/lib/server/chat-store";
import { IconPaperclip, IconFileText } from "@/components/icons";
import { MessageBubble } from "@/components/message-bubble";

type SessionContext = {
  id: string;
  startsAt: string;
  durationMinutes: number;
  status: string;
  subject: string;
  teacherName?: string;
};

/** Résumé léger d'une conversation renvoyé par /api/chat/poll (sans messages). */
type ConversationSummary = {
  id: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  teacherSlug?: string;
  lastMessageAt: string;
  messageCount: number;
};

const SESSION_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
};

/**
 * Intervalle de sondage adaptatif.
 *
 * Un fil actif est interrogé souvent (l'utilisateur attend une réponse),
 * mais dès que l'onglet passe en arrière-plan ou que la fenêtre perd le
 * focus, on arrête complètement : plus aucune requête ni travail de rendu
 * tant que l'utilisateur ne regarde pas la page. C'est ce qui évite de faire
 * chauffer un téléphone d'entrée de gamme resté ouvert sur la messagerie.
 */
const POLL_INTERVAL_MS = 2500;

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [text, setText] = useState("");
  const [attachedFile, setAttachedFile] = useState<{ url: string; name: string } | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setPending] = useState(false);
  /** Fil ouvert, pour l'affichage. `activeIdRef` sert au sondage. */
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  /** Séance ouverte depuis « Discuter de cette séance » (bouton des réservations). */
  const [sessionContext, setSessionContext] = useState<SessionContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Références : évitent de relancer la boucle de sondage à chaque rendu
  // (dépendances stables) tout en lisant toujours l'état le plus récent.
  const activeIdRef = useRef<string | null>(null);
  const lastSyncRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

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
  const shouldAutoScrollRef = useRef(true);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const userId = typeof window !== "undefined" ? localStorage.getItem("profyspace_user_id") || "" : "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (userId) headers["x-user-id"] = userId;
    return headers;
  }, []);

  /**
   * Ouvre une conversation : charge son historique une seule fois, puis
   * mémorise son identifiant pour le sondage différentiel.
   */
  const openConversation = useCallback(
    async (summary: ConversationSummary) => {
      activeIdRef.current = summary.id;
      setActiveConvId(summary.id);
      shouldAutoScrollRef.current = true;

      // Affichage immédiat de l'en-tête (nom, rôle) sans attendre le réseau :
      // le clic donne une impression d'instantanéité.
      setActiveConv({
        id: summary.id,
        studentId: summary.studentId,
        studentName: summary.studentName,
        teacherId: summary.teacherId,
        teacherName: summary.teacherName,
        teacherSlug: summary.teacherSlug,
        lastMessageAt: summary.lastMessageAt as unknown as Date,
        messages: [],
      });

      try {
        const res = await fetch(
          `/api/chat/messages?conversationId=${encodeURIComponent(summary.id)}`,
          { headers: getAuthHeaders() },
        );
        if (!res.ok) return;
        const data = await res.json();
        setActiveConv((prev) =>
          prev && prev.id === summary.id
            ? {
                ...prev,
                messages: data.messages || [],
                lastMessageAt: (data.lastMessageAt || prev.lastMessageAt) as unknown as Date,
              }
            : prev,
        );
        lastSyncRef.current = new Date().toISOString();
      } catch {}
    },
    [getAuthHeaders],
  );

  /**
   * Une passe de synchronisation : un seul aller-retour qui rapporte la liste
   * des conversations ET, s'il y a du nouveau, l'historique du fil ouvert.
   */
  const syncChat = useCallback(
    async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const params =
          typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
        const query = new URLSearchParams();
        if (activeIdRef.current) query.set("active", activeIdRef.current);
        if (lastSyncRef.current) query.set("since", lastSyncRef.current);
        const bookingId = params.get("bookingId");
        if (bookingId) query.set("bookingId", bookingId);

        const res = await fetch(`/api/chat/poll?${query.toString()}`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();

        setConversations(data.conversations || []);
        if (data.booking) setSessionContext(data.booking);
        if (data.serverTime) lastSyncRef.current = data.serverTime;

        const activeId: string | null = data.activeConversationId || null;
        const summaries: ConversationSummary[] = data.conversations || [];

        // Premier chargement (ou changement de fil décidé par le serveur) :
        // on ouvre la conversation demandée par l'URL, sinon la plus récente.
        if (!activeIdRef.current && activeId) {
          const requestedId = params.get("conversationId");
          const target =
            (requestedId && summaries.find((s) => s.id === requestedId)) ||
            summaries.find((s) => s.id === activeId) ||
            summaries[0];
          if (target) await openConversation(target);
          return;
        }

        // Rafraîchissement : on ne touche à l'état que si le contenu a
        // réellement changé, sinon React re-rend tout l'arbre pour rien.
        if (data.messagesChanged && activeId && activeIdRef.current === activeId) {
          const incoming = data.messages || [];
          setActiveConv((prev) => {
            if (!prev || prev.id !== activeId) return prev;
            const last = prev.messages[prev.messages.length - 1];
            const incomingLast = incoming[incoming.length - 1];
            if (last && incomingLast && last.id === incomingLast.id && prev.messages.length === incoming.length) {
              return prev;
            }
            return { ...prev, messages: incoming };
          });
        }
      } catch {} finally {
        inFlightRef.current = false;
      }
    },
    [getAuthHeaders, openConversation],
  );

  useEffect(() => {
    // Identité locale et paramètres d'URL lus une seule fois, hors du corps
    // synchrone de l'effet pour ne pas provoquer de rendu en cascade.
    const boot = setTimeout(() => {
      try {
        const stored = localStorage.getItem("profyspace_user");
        if (stored) {
          const u = JSON.parse(stored);
          if (u?.id) setCurrentUserId(u.id);
          if (u?.role) setUserRole(u.role);
        }
      } catch {}
    }, 0);

    const params = new URLSearchParams(window.location.search);
    const teacherId = params.get("teacherId");

    (async () => {
      // Ouverture directe d'un fil depuis la fiche d'un professeur : on passe
      // par l'endpoint dédié qui crée la conversation si besoin.
      if (teacherId) {
        try {
          const res = await fetch(`/api/chat/conversations?teacherId=${encodeURIComponent(teacherId)}`, {
            headers: getAuthHeaders(),
          });
          const data = await res.json();
          const target = (data.activeConversation as Conversation | null) || null;
          if (target) {
            activeIdRef.current = target.id;
            setActiveConv(target);
            lastSyncRef.current = new Date().toISOString();
          }
        } catch {}
      }
      await syncChat();
      setLoading(false);
    })();

    // Sondage adaptatif : coupé net quand l'onglet est masqué ou la fenêtre
    // en arrière-plan, relancé immédiatement au retour. Aucune requête ne
    // part pendant que l'utilisateur ne regarde pas la page.
    let timer: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (timer) return;
      timer = setInterval(() => {
        if (document.visibilityState === "visible") syncChat();
      }, POLL_INTERVAL_MS);
    };
    const stopPolling = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        syncChat();
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (document.visibilityState === "visible") startPolling();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(boot);
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [getAuthHeaders, syncChat]);

  // Défilement automatique uniquement si l'utilisateur est déjà en bas du fil :
  // sinon on lui arrachait sa position de lecture toutes les 2 secondes.
  const messageCount = activeConv?.messages.length ?? 0;
  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [messageCount]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", file.type.startsWith("image/") ? "image" : "pdf");

      const userId = typeof window !== "undefined" ? localStorage.getItem("profyspace_user_id") || "" : "";
      const res = await fetch("/api/uploads/video", {
        method: "POST",
        headers: userId ? { "x-user-id": userId } : undefined,
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setAttachedFile({ url: data.url, name: file.name });
      }
    } catch {} finally {
      setUploadingFile(false);
    }
  }

  /**
   * Envoi optimiste : le message apparaît immédiatement dans le fil, puis on
   * réconcilie avec la réponse serveur. Le champ est vidé dans le même clic,
   * donc l'interface répond sans attendre le réseau.
   */
  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if ((!text.trim() && !attachedFile) || !activeConv) return;

    const conversationId = activeConv.id;
    const messageText = text.trim()
      ? attachedFile
        ? `${text.trim()}\n📎 ${attachedFile.name}: ${attachedFile.url}`
        : text.trim()
      : `📎 ${attachedFile?.name}: ${attachedFile?.url}`;

    const tempId = `pending-${Date.now()}`;
    const optimistic = {
      id: tempId,
      conversationId,
      senderId: currentUserId,
      senderName: "Vous",
      senderRole: (userRole === "TEACHER" ? "TEACHER" : "STUDENT") as "TEACHER" | "STUDENT",
      text: messageText,
      createdAt: new Date(),
    };

    setText("");
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    shouldAutoScrollRef.current = true;
    setActiveConv((prev) => (prev ? { ...prev, messages: [...prev.messages, optimistic] } : null));
    setPending(true);

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ conversationId, text: messageText }),
      });

      if (res.ok) {
        const data = await res.json();
        // Remplace le message temporaire par le message confirmé du serveur.
        setActiveConv((prev) => {
          if (!prev || prev.id !== conversationId) return prev;
          const withoutTemp = prev.messages.filter((m) => m.id !== tempId);
          return data.message ? { ...prev, messages: [...withoutTemp, data.message] } : { ...prev, messages: withoutTemp };
        });
        lastSyncRef.current = new Date().toISOString();
        syncChat();
      } else {
        // Échec : on retire le message fantôme plutôt que de laisser croire
        // qu'il a été envoyé.
        setActiveConv((prev) =>
          prev && prev.id === conversationId
            ? { ...prev, messages: prev.messages.filter((m) => m.id !== tempId) }
            : prev,
        );
        setText(messageText);
      }
    } catch {
      setActiveConv((prev) =>
        prev && prev.id === conversationId
          ? { ...prev, messages: prev.messages.filter((m) => m.id !== tempId) }
          : prev,
      );
      setText(messageText);
    } finally {
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
        lastSyncRef.current = new Date().toISOString();
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
      lastSyncRef.current = null;
      syncChat();
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
        lastSyncRef.current = null;
        syncChat();
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
              // Comparaison sur l'état React, jamais sur la ref : lire une ref
              // pendant le rendu donne un affichage qui peut ne pas se mettre à
              // jour (et React l'interdit). La ref reste réservée à la boucle
              // de sondage, qui n'a pas besoin de re-rendre.
              const isActive = activeConvId === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => openConversation(c)}
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
                      {c.messageCount > 0 ? `${c.messageCount} message${c.messageCount > 1 ? "s" : ""}` : "Nouvelle discussion"}
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
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center justify-between">
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

                {/* Encart de séance : discussions ouvertes depuis une réservation */}
                {sessionContext && (
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-[#0d8d78]/25 bg-[#e5f7f2] px-3.5 py-2.5 text-[11px] font-semibold text-[#0d8d78]">
                    <span className="font-extrabold uppercase tracking-wider">Séance réservée</span>
                    <span className="text-slate-600">{sessionContext.subject}</span>
                    <span className="text-slate-600">
                      {new Date(sessionContext.startsAt).toLocaleDateString("fr-TN", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}{" "}
                      à {new Date(sessionContext.startsAt).toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })}{" "}
                      ({sessionContext.durationMinutes} min)
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-0.5 font-extrabold">
                      {SESSION_STATUS_LABELS[sessionContext.status] || sessionContext.status}
                    </span>
                    <a
                      href={`/classroom/${sessionContext.id}`}
                      className="ml-auto rounded-xl bg-[#0d8d78] px-3 py-1.5 font-bold text-white transition hover:bg-[#0b7866]"
                    >
                      Entrer dans la classe →
                    </a>
                  </div>
                )}
              </div>

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto overscroll-contain py-4 space-y-4 max-h-[420px] pr-2">
                {activeConv.messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    isMe={m.senderId === currentUserId}
                    isSystem={m.senderRole === "ADMIN"}
                    canRespondToOffer={userRole === "STUDENT"}
                    onAcceptOffer={handleAcceptOffer}
                    onRejectOffer={handleRejectOffer}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Attached file preview */}
              {attachedFile && (
                <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200 p-2 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <IconFileText className="h-4 w-4 text-[#0d8d78]" />
                    <span className="font-semibold truncate">{attachedFile.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-xs font-bold text-rose-500 hover:text-rose-700 px-1"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="application/pdf,image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  title="Joindre un fichier (PDF ou Image)"
                  className="rounded-2xl border border-slate-200 p-3 text-slate-500 hover:bg-slate-50 hover:text-[#0d8d78] transition shrink-0 disabled:opacity-50"
                >
                  <IconPaperclip className="h-4 w-4" />
                </button>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={uploadingFile ? "Envoi du fichier..." : "Écrivez votre message..."}
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
