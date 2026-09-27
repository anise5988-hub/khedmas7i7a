"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { IconSparkles, IconX, IconStar, IconSend, IconMonitor, IconUser, IconRefresh } from "@/components/icons";
import type { ParsedIntent } from "@/lib/server/teacher-match";

/**
 * Panneau de l'assistant IA, chargé À LA DEMANDE.
 *
 * Il était auparavant importé en dur depuis `ai-teacher-finder`, donc présent
 * dans le bundle de *chaque* page du site (y compris pour un visiteur qui ne
 * l'ouvre jamais). Ici il vit dans son propre module, tiré par `next/dynamic`
 * seulement au premier clic : le JS du panneau ne coûte rien tant que
 * l'utilisateur n'a pas demandé l'assistant.
 */

type MatchedTeacher = {
  id: string;
  slug: string;
  avatarUrl?: string | null;
  initials: string;
  name: string;
  subject: string;
  city: string;
  rate: number;
  rating: number;
  reviewsCount: number;
  online: boolean;
  inPerson: boolean;
  verificationStatus?: string;
  matchScore: number;
  matchReasons: string[];
};

type ChatMessage = {
  id: string;
  role: "bot" | "user";
  text: string;
  teachers?: MatchedTeacher[];
};

const GREETING: ChatMessage = {
  id: "greeting",
  role: "bot",
  text: "👋 Bonjour ! Décrivez ce que vous cherchez (matière, niveau, budget, ville, en ligne ou présentiel) et je vous trouve les meilleurs professeurs déjà vérifiés sur ProfySpace. Vous pouvez aussi me poser une question sur le fonctionnement du site.",
};

const STARTER_CHIPS = [
  "Prof de maths pour le Bac, budget 30 DT/h, en ligne le soir",
  "Cours d'anglais niveau collège à Sfax, présentiel le week-end",
  "Comment se déroule une réservation ?",
];

function scoreColor(score: number): string {
  if (score >= 75)
    return "text-[#0d8d78] dark:text-[#72d6bf] bg-[#e5f7f2] dark:bg-[#72d6bf]/15 border-[#0d8d78]/20 dark:border-[#72d6bf]/30";
  if (score >= 50)
    return "text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-400/15 border-amber-500/20 dark:border-amber-400/30";
  return "text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-white/10 border-slate-300/40 dark:border-white/15";
}

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function TeacherResultCard({ teacher, onNavigate }: { teacher: MatchedTeacher; onNavigate: () => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-[#0d8d78]/30 dark:border-white/10 dark:bg-[#0f1d32]">
      <div className="flex items-start gap-2.5">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#72d6bf] to-[#0d8d78] text-sm font-bold text-[#11233f]">
          {teacher.avatarUrl ? (
            <Image src={teacher.avatarUrl} alt={teacher.name} fill sizes="40px" className="object-cover" />
          ) : (
            <span>{teacher.initials}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1">
            <h4 className="truncate text-xs font-bold text-[#11233f] dark:text-white">{teacher.name}</h4>
            {teacher.verificationStatus === "APPROVED" && (
              <span className="rounded-full bg-[#e5f7f2] px-1 py-0.5 text-[8px] font-bold text-[#0d8d78] dark:bg-[#72d6bf]/15 dark:text-[#72d6bf]">
                ✓
              </span>
            )}
          </div>
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
            {teacher.subject} · {teacher.city}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
            <span className={`rounded-full border px-1.5 py-0.5 font-bold ${scoreColor(teacher.matchScore)}`}>
              {teacher.matchScore}% match
            </span>
            <span className="flex items-center gap-0.5 font-semibold text-amber-600 dark:text-amber-400">
              <IconStar className="h-2.5 w-2.5" />
              {teacher.rating}
            </span>
            <span className="font-bold text-[#0d8d78] dark:text-[#72d6bf]">{teacher.rate} DT/h</span>
            {teacher.online && (
              <span className="flex items-center gap-0.5 text-slate-400 dark:text-slate-500">
                <IconMonitor className="h-2.5 w-2.5" />
                En ligne
              </span>
            )}
            {teacher.inPerson && (
              <span className="flex items-center gap-0.5 text-slate-400 dark:text-slate-500">
                <IconUser className="h-2.5 w-2.5" />
                Présentiel
              </span>
            )}
          </div>
          {teacher.matchReasons.length > 0 && (
            <p className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
              {teacher.matchReasons.join(" · ")}
            </p>
          )}
        </div>
      </div>

      <Link
        href={`/teachers/${teacher.slug}`}
        onClick={onNavigate}
        className="mt-2.5 block rounded-xl bg-[#0d8d78] py-2 text-center text-[11px] font-bold text-white transition hover:bg-[#0b7866]"
      >
        Voir le profil & réserver →
      </Link>
    </div>
  );
}

export default function AiTeacherFinderPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [intent, setIntent] = useState<ParsedIntent | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setMessages((prev) => [...prev, { id: newId(), role: "user", text: trimmed }]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/ai/teacher-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, intent }),
      });
      const data = await res.json();
      if (res.ok) {
        setIntent(data.intent);
        setMessages((prev) => [...prev, { id: newId(), role: "bot", text: data.reply, teachers: data.results }]);
      } else {
        setMessages((prev) => [...prev, { id: newId(), role: "bot", text: data.error || "Une erreur est survenue." }]);
      }
    } catch {
      setMessages((prev) => [...prev, { id: newId(), role: "bot", text: "Erreur de connexion au serveur." }]);
    } finally {
      setSending(false);
    }
  }

  function resetConversation() {
    setMessages([GREETING]);
    setIntent(null);
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="profy-reveal flex h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-[#0f1d32] sm:h-[85vh] sm:rounded-3xl"
      >
        {/* Header */}
        <div className="relative shrink-0 overflow-hidden bg-[#11233f] px-5 py-4 text-white">
          <div className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-[#0d8d78]/40 blur-3xl" />
          <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-[#72d6bf]/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
                <IconSparkles className="h-4 w-4 text-[#72d6bf]" />
              </span>
              <div>
                <h2 className="font-[family-name:var(--font-dm-sans)] text-base font-bold sm:text-lg">
                  Assistant Prof IA
                </h2>
                <p className="text-[11px] text-slate-300">En ligne · répond instantanément</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={resetConversation}
                className="shrink-0 rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label="Nouvelle conversation"
                title="Nouvelle conversation"
              >
                <IconRefresh className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label="Fermer"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {messages.map((m) => (
            <div key={m.id} className={`flex items-end gap-2 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              {m.role === "bot" && (
                <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e5f7f2] text-[#0d8d78] dark:bg-[#72d6bf]/15 dark:text-[#72d6bf]">
                  <IconSparkles className="h-3.5 w-3.5" />
                </div>
              )}
              <div className={`max-w-[85%] space-y-2.5 ${m.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed sm:text-sm ${
                    m.role === "user"
                      ? "rounded-br-sm bg-[#0d8d78] text-white"
                      : "rounded-bl-sm bg-slate-100 text-[#11233f] dark:bg-white/10 dark:text-white"
                  }`}
                >
                  {m.text}
                </div>

                {m.teachers && m.teachers.length > 0 && (
                  <div className="w-full space-y-2">
                    {m.teachers.map((teacher) => (
                      <TeacherResultCard key={teacher.id} teacher={teacher} onNavigate={onClose} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex items-end gap-2">
              <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e5f7f2] text-[#0d8d78] dark:bg-[#72d6bf]/15 dark:text-[#72d6bf]">
                <IconSparkles className="h-3.5 w-3.5" />
              </div>
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3 dark:bg-white/10">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
              </div>
            </div>
          )}

          {messages.length <= 1 && !sending && (
            <div className="flex flex-wrap gap-2 pl-9">
              {STARTER_CHIPS.map((chip) => (
                <button
                  type="button"
                  key={chip}
                  onClick={() => sendMessage(chip)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:border-[#0d8d78]/40 hover:text-[#0d8d78] dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-[#72d6bf]"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex items-center gap-2 border-t border-slate-100 p-3 dark:border-white/10"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Écrivez votre demande ou votre question..."
            className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none transition focus:border-[#0d8d78] focus:ring-2 focus:ring-[#0d8d78]/15 dark:border-white/15 dark:bg-white/[.05] dark:text-white dark:placeholder:text-slate-400 sm:text-sm"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="shrink-0 rounded-xl bg-[#0d8d78] p-2.5 text-white transition hover:bg-[#0b7866] disabled:opacity-50"
            aria-label="Envoyer"
          >
            <IconSend className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}