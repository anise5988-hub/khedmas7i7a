/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { IconSparkles, IconX, IconStar, IconSend, IconMonitor, IconUser, IconRefresh } from "@/components/icons";
import type { ParsedIntent } from "@/lib/server/teacher-match";

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
  if (score >= 75) return "text-[#0d8d78] dark:text-[#72d6bf] bg-[#e5f7f2] dark:bg-[#72d6bf]/15 border-[#0d8d78]/20 dark:border-[#72d6bf]/30";
  if (score >= 50) return "text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-400/15 border-amber-500/20 dark:border-amber-400/30";
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
            <img src={teacher.avatarUrl} alt={teacher.name} className="h-full w-full object-cover" />
          ) : (
            <span>{teacher.initials}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1">
            <h4 className="truncate text-xs font-bold text-[#11233f] dark:text-white">{teacher.name}</h4>
            {teacher.verificationStatus === "APPROVED" && (
              <span className="rounded-full bg-[#e5f7f2] px-1 py-0.5 text-[8px] font-bold text-[#0d8d78] dark:bg-[#72d6bf]/15 dark:text-[#72d6bf]">✓</span>
            )}
          </div>
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{teacher.subject}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-0.5">
              <IconStar className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
              {teacher.rating.toFixed(1)}
            </span>
            <span>📍 {teacher.city}</span>
            {teacher.online && (
              <span className="inline-flex items-center gap-0.5">
                <IconMonitor className="h-2.5 w-2.5" /> Ligne
              </span>
            )}
            {teacher.inPerson && (
              <span className="inline-flex items-center gap-0.5">
                <IconUser className="h-2.5 w-2.5" /> Présentiel
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-black ${scoreColor(teacher.matchScore)}`}>
            {teacher.matchScore}%
          </span>
          <span className="text-xs font-bold text-[#0d8d78] dark:text-[#72d6bf]">{teacher.rate} DT/h</span>
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5">
        <Link
          href={`/teachers/${teacher.slug}`}
          onClick={onNavigate}
          className="flex-1 rounded-lg border border-slate-200 py-1.5 text-center text-[10px] font-bold text-[#11233f] transition hover:bg-slate-50 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
        >
          Voir le profil
        </Link>
        <Link
          href={`/teachers/${teacher.slug}#booking-section`}
          onClick={onNavigate}
          className="flex-1 rounded-lg bg-[#0d8d78] py-1.5 text-center text-[10px] font-bold text-white transition hover:bg-[#0b7866]"
        >
          Réserver →
        </Link>
      </div>
    </div>
  );
}

export function AiTeacherFinder() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [intent, setIntent] = useState<ParsedIntent | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // The button used to sit at a fixed bottom offset and collide with the
  // stats row directly under the hero on the homepage. Revealing it only
  // once the user has scrolled past that zone keeps it from ever
  // overlapping real content, on any page.
  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 260);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Keep this student-facing discovery tool out of the video classroom,
  // the admin console, and the teacher's own dashboard — none of those
  // contexts are someone searching for a teacher to book.
  if (pathname?.startsWith("/classroom") || pathname?.startsWith("/admin") || pathname?.startsWith("/teacher")) {
    return null;
  }

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
    <>
      <button
        type="button"
        onClick={() => {
          setMessages((prev) => (prev.length === 0 ? [GREETING] : prev));
          setOpen(true);
        }}
        className={`fixed bottom-5 left-5 z-[59] flex items-center gap-2 rounded-full bg-gradient-to-r from-[#0d8d78] to-[#11233f] pl-4 pr-5 py-3.5 text-white shadow-2xl shadow-[#0d8d78]/30 ring-1 ring-white/10 transition-all duration-300 hover:scale-105 hover:shadow-[#0d8d78]/50 active:scale-95 ${
          visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-24 opacity-0"
        }`}
        aria-label="Trouver mon professeur avec l'IA"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15">
          <IconSparkles className="h-4 w-4 text-[#72d6bf]" />
        </span>
        <span className="hidden text-sm font-bold sm:inline">Trouver mon Prof avec IA</span>
        <span className="text-sm font-bold sm:hidden">IA Prof</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
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
                    onClick={() => setOpen(false)}
                    className="shrink-0 rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                    aria-label="Fermer"
                  >
                    <IconX className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
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
                          <TeacherResultCard key={teacher.id} teacher={teacher} onNavigate={() => setOpen(false)} />
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
      )}
    </>
  );
}
