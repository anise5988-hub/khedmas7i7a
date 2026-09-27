/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { SiteNavbar } from "@/components/site-navbar";
import { Conversation } from "@/lib/server/chat-store";
import {
  IconMessageSquare,
  IconSearch,
  IconDollarSign,
  IconPaperclip,
  IconFileText,
} from "@/components/icons";
import { MessageBubble } from "@/components/message-bubble";

type SessionContext = {
  id: string;
  startsAt: string;
  durationMinutes: number;
  status: string;
  subject: string;
  studentName?: string;
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

/**
 * Intervalle de sondage. La boucle s'arrête complètement quand l'onglet est
 * masqué : plus aucune requête ni rendu tant que personne ne regarde.
 */
const POLL_INTERVAL_MS = 2500;

const SESSION_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
};

export default function TeacherMessagesPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [text, setText] = useState("");
  const [attachedFile, setAttachedFile] = useState<{ url: string; name: string } | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Séance ouverte depuis « Discuter de cette séance » (bouton des réservations). */
  const [sessionContext, setSessionContext] = useState<SessionContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setPending] = useState(false);
  /** Fil ouvert, pour l'affichage. `activeIdRef` sert à la boucle de sondage. */
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
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
  // Dépendances stables pour la boucle de sondage, état le plus récent lu via refs.
  const activeIdRef = useRef<string | null>(null);
  const lastSyncRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const shouldAutoScrollRef = useRef(true);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const userId = typeof window !== "undefined" ? localStorage.getItem("profyspace_user_id") || "" : "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (userId) headers["x-user-id"] = userId;
    return headers;
  }, []);

  /**
   * Ouvre un fil : historique chargé une fois, puis suivi par le sondage
   * différentiel. L'en-tête s'affiche immédiatement, sans attendre le réseau.
   */
  const openConversation = useCallback(
    async (summary: ConversationSummary) => {
      activeIdRef.current = summary.id;
      setActiveConvId(summary.id);
      shouldAutoScrollRef.current = true;
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
        const res = await fetch(`/api/chat/messages?conversationId=${encodeURIComponent(summary.id)}`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) return;
        const data = await res.json();
        setActiveConv((prev) =>
          prev && prev.id === summary.id ? { ...prev, messages: data.messages || [] } : prev,
        );
        lastSyncRef.current = new Date().toISOString();
      } catch {}
    },
    [getAuthHeaders],
  );

  /**
   * Une passe de synchronisation = un seul aller-retour : liste des
   * conversations + historique du fil ouvert uniquement s'il a changé.
   */
  const syncChat = useCallback(async () => {
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

      const summaries: ConversationSummary[] = data.conversations || [];
      setConversations(summaries);
      if (data.booking) setSessionContext(data.booking);
      if (data.serverTime) lastSyncRef.current = data.serverTime;

      const activeId: string | null = data.activeConversationId || null;

      // Premier chargement : on privilégie le fil ciblé par l'URL (séance ou
      // lien direct), sinon la conversation la plus récente.
      if (!activeIdRef.current && activeId) {
        const requestedId = params.get("conversationId");
        const target =
          (requestedId && summaries.find((s) => s.id === requestedId)) ||
          summaries.find((s) => s.id === activeId) ||
          summaries[0];
        if (target) await openConversation(target);
        return;
      }

      // Rafraîchissement : on ne met à jour que si le contenu a bougé.
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
  }, [getAuthHeaders, openConversation]);

  useEffect(() => {
    syncChat().finally(() => setLoading(false));

    // Sondage adaptatif : aucune requête quand l'onglet est masqué ou la
    // fenêtre en arrière-plan, reprise immédiate au retour.
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
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [syncChat]);

  // Défilement automatique seulement si l'utilisateur est déjà en bas.
  const messageCount = activeConv?.messages.length ?? 0;
  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [messageCount]);

  /**
   * Envoi optimiste : le message s'affiche immédiatement, le champ est vidé
   * dans le même clic, puis on réconcilie avec la réponse du serveur.
   */
  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if ((!text.trim() && !attachedFile) || !activeConv) return;

    const conversationId = activeConv.id;

    // Le fil est un chat texte côté serveur : on transmet la pièce jointe
    // comme un lien cliquable, comme le fait déjà l'espace élève.
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
      senderRole: "TEACHER" as const,
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
        setActiveConv((prev) => {
          if (!prev || prev.id !== conversationId) return prev;
          const withoutTemp = prev.messages.filter((m) => m.id !== tempId);
          return data.message
            ? { ...prev, messages: [...withoutTemp, data.message] }
            : { ...prev, messages: withoutTemp };
        });
        lastSyncRef.current = new Date().toISOString();
        syncChat();
      } else {
        // Échec : on retire le message fantôme et on rend le texte à l'utilisateur.
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

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", "attachment");

      const userId = typeof window !== "undefined" ? localStorage.getItem("profyspace_user_id") || "" : "";
      const res = await fetch("/api/uploads/video", {
        method: "POST",
        headers: userId ? { "x-user-id": userId } : undefined,
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        setAttachedFile({ url: data.url, name: file.name });
      }
    } catch {} finally {
      setUploadingFile(false);
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
          lastSyncRef.current = new Date().toISOString();
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
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f] dark:bg-[#0c1626] dark:text-white">
      <SiteNavbar dark={false} />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 border border-slate-200 shadow-sm dark:bg-white/[.05] dark:border-white/10 dark:shadow-xl">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0d8d78] dark:text-[#72d6bf]">
              Messagerie & Négociations
            </span>
            <h1 className="mt-1 text-2xl font-bold text-[#11233f] dark:text-white">
              Discussions & Offres avec les Élèves
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
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
          <div className="md:col-span-4 rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-sm flex flex-col dark:bg-white/[.05] dark:border-white/10 dark:shadow-xl">
            <div className="relative">
              <IconSearch className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un élève..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs outline-none focus:bg-white focus:border-[#0d8d78] dark:border-white/15 dark:bg-white/[.05] dark:text-white dark:focus:bg-white/10"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0d8d78] border-t-transparent mx-auto mb-2" />
                  Chargement des messages...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-6 text-center space-y-2 text-slate-500 dark:text-slate-400">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/10 dark:text-slate-400">
                    <IconMessageSquare className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold">Aucune conversation trouvée.</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Les messages des élèves intéressés par vos cours apparaîtront ici.
                  </p>
                </div>
              ) : (
                filteredConversations.map((c) => {
                  // Comparaison sur l'état React, jamais sur la ref : lire une
                  // ref pendant le rendu peut laisser un surlignage périmé.
                  const isActive = activeConvId === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => openConversation(c)}
                      className={`flex items-center gap-3 rounded-2xl p-3 cursor-pointer transition ${
                        isActive ? "bg-[#11233f] text-white shadow-md" : "hover:bg-slate-50 text-slate-700 dark:hover:bg-white/10 dark:text-slate-300"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-bold text-sm ${
                          isActive ? "bg-[#0d8d78] text-white" : "bg-[#e5f7f2] text-[#0d8d78] dark:bg-[#72d6bf]/15 dark:text-[#72d6bf]"
                        }`}
                      >
                        {c.studentName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold truncate">{c.studentName}</p>
                          <span className={`text-[9px] font-mono ${isActive ? "text-slate-300" : "text-slate-400 dark:text-slate-500"}`}>
                            {new Date(c.lastMessageAt).toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className={`text-[11px] truncate mt-0.5 ${isActive ? "text-slate-300" : "text-slate-400 dark:text-slate-500"}`}>
                          {c.messageCount > 0
                            ? `${c.messageCount} message${c.messageCount > 1 ? "s" : ""}`
                            : "Nouvelle discussion"}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Active Chat Area */}
          <div className="md:col-span-8 rounded-3xl bg-white border border-slate-200 p-5 flex flex-col justify-between shadow-sm dark:bg-white/[.05] dark:border-white/10 dark:shadow-xl">
            {activeConv ? (
              <>
                {/* Chat Header */}
                <div className="border-b border-slate-100 pb-3 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e5f7f2] text-[#0d8d78] font-bold dark:bg-[#72d6bf]/15 dark:text-[#72d6bf]">
                        {activeConv.studentName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#11233f] dark:text-white">{activeConv.studentName}</h3>
                        <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5 mt-0.5 dark:text-emerald-400">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          Élève en ligne · Discussion sécurisée
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowOfferModal(true)}
                      className="rounded-xl border border-[#0d8d78] bg-[#e5f7f2] px-3.5 py-1.5 text-xs font-bold text-[#0d8d78] transition hover:bg-[#d4f2e9] dark:border-[#72d6bf]/40 dark:bg-[#72d6bf]/15 dark:text-[#72d6bf] dark:hover:bg-[#72d6bf]/25"
                    >
                      + Créer Offre (DT)
                    </button>
                  </div>

                  {/* Encart de séance : affiché quand la discussion a été
                      ouverte depuis une réservation. */}
                  {sessionContext && (
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-[#0d8d78]/25 bg-[#e5f7f2] px-3.5 py-2.5 text-[11px] font-semibold text-[#0d8d78] dark:border-[#72d6bf]/30 dark:bg-[#72d6bf]/10 dark:text-[#72d6bf]">
                      <span className="font-extrabold uppercase tracking-wider">Séance réservée</span>
                      <span className="text-slate-600 dark:text-slate-300">{sessionContext.subject}</span>
                      <span className="text-slate-600 dark:text-slate-300">
                        {new Date(sessionContext.startsAt).toLocaleDateString("fr-TN", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}{" "}
                        à {new Date(sessionContext.startsAt).toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })}{" "}
                        ({sessionContext.durationMinutes} min)
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-0.5 font-extrabold dark:bg-[#11233f] dark:text-white">
                        {SESSION_STATUS_LABELS[sessionContext.status] || sessionContext.status}
                      </span>
                      <a
                        href={`/classroom/${sessionContext.id}`}
                        className="ml-auto rounded-xl bg-[#0d8d78] px-3 py-1.5 font-bold text-white transition hover:bg-[#0b7866]"
                      >
                        Ouvrir la classe →
                      </a>
                    </div>
                  )}
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto overscroll-contain py-4 space-y-4 max-h-[440px] pr-2">
                  {activeConv.messages.map((m) => (
                    <MessageBubble
                      key={m.id}
                      message={m}
                      isMe={m.senderId === currentUserId || m.senderRole === "TEACHER"}
                      isSystem={m.senderRole === "ADMIN"}
                      canRespondToOffer={false}
                      onAcceptOffer={() => {}}
                      onRejectOffer={() => {}}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Form */}
                {attachedFile && (
                  <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs dark:border-white/15 dark:bg-white/[.05]">
                    <div className="flex min-w-0 items-center gap-2">
                      <IconFileText className="h-4 w-4 text-[#0d8d78] dark:text-[#72d6bf]" />
                      <span className="truncate font-semibold">{attachedFile.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="px-1 text-xs font-bold text-rose-500 hover:text-rose-700"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-white/10">
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
                    title="Joindre un fichier (PDF ou image)"
                    className="shrink-0 rounded-2xl border border-slate-200 p-3 text-slate-500 transition hover:bg-slate-50 hover:text-[#0d8d78] disabled:opacity-50 dark:border-white/15 dark:text-slate-400"
                  >
                    <IconPaperclip className="h-4 w-4" />
                  </button>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={uploadingFile ? "Envoi du fichier..." : "Écrivez votre message à l'élève..."}
                    className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-800 outline-none focus:border-[#0d8d78] focus:bg-white transition dark:border-white/15 dark:bg-white/[.05] dark:text-white dark:focus:bg-white/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOfferModal(true)}
                    className="rounded-2xl border border-[#0d8d78] bg-[#e5f7f2] px-3.5 py-3 text-xs font-bold text-[#0d8d78] transition hover:bg-[#d4f2e9] shrink-0 dark:border-[#72d6bf]/40 dark:bg-[#72d6bf]/15 dark:text-[#72d6bf] dark:hover:bg-[#72d6bf]/25"
                  >
                    + Offre (DT)
                  </button>
                  <button
                    type="submit"
                    disabled={sending || (!text.trim() && !attachedFile)}
                    className="rounded-2xl bg-[#0d8d78] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#0b7866] disabled:opacity-50 shrink-0"
                  >
                    Envoyer →
                  </button>
                </form>
              </>
            ) : (
              <div className="py-24 text-center text-slate-400 text-xs space-y-2 dark:text-slate-500">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/10 dark:text-slate-400">
                  <IconMessageSquare className="h-6 w-6" />
                </div>
                <p className="font-bold text-slate-600 text-sm dark:text-slate-300">Sélectionnez une discussion</p>
                <p>Choisissez un échange avec un élève à gauche pour lire et répondre aux messages.</p>
              </div>
            )}
          </div>
        </div>

        {/* Offer Creation Modal */}
        {showOfferModal && activeConv && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-slate-800 dark:bg-[#101b2d] dark:text-slate-200 dark:shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/10">
                <h3 className="text-base font-bold text-[#11233f] dark:text-white">
                  Créer une Offre Sur-Mesure pour {activeConv.studentName}
                </h3>
                <button onClick={() => setShowOfferModal(false)} className="text-slate-400 hover:text-slate-600 font-bold dark:text-slate-500 dark:hover:text-slate-300">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSendOffer} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-600 mb-1 dark:text-slate-300">Matière / Intitulé de la séance</label>
                  <input
                    type="text"
                    required
                    value={offerSubject}
                    onChange={(e) => setOfferSubject(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#0d8d78] dark:border-white/15 dark:bg-white/[.05] dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1 dark:text-slate-300">Date et heure</label>
                    <input
                      type="datetime-local"
                      required
                      value={offerStartsAt}
                      onChange={(e) => setOfferStartsAt(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#0d8d78] dark:border-white/15 dark:bg-white/[.05] dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 mb-1 dark:text-slate-300">Durée (minutes)</label>
                    <select
                      value={offerDuration}
                      onChange={(e) => setOfferDuration(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#0d8d78] dark:border-white/15 dark:bg-[#162844] dark:text-white"
                    >
                      <option value={60} className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">60 min (1h)</option>
                      <option value={90} className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">90 min (1h30)</option>
                      <option value={120} className="bg-white text-[#11233f] dark:bg-[#11233f] dark:text-white">120 min (2h)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1 dark:text-slate-300">Tarif proposé (DT)</label>
                  <input
                    type="number"
                    min={10}
                    step={5}
                    required
                    value={offerAmountTnd}
                    onChange={(e) => setOfferAmountTnd(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm font-bold text-[#0d8d78] outline-none focus:border-[#0d8d78] dark:border-white/15 dark:bg-white/[.05] dark:text-[#72d6bf]"
                  />
                </div>

                {offerError && (
                  <p className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-rose-700 font-bold dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300">
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