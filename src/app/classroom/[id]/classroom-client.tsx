"use client";

import { useEffect, useState } from "react";
import { WebRTCRoom } from "./webrtc-room";

type Message = {
  sender: string;
  text: string;
  time: string;
};

export function ClassroomClient({ id }: { id: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { sender: "Système", text: "Bienvenue dans la classe virtuelle Profy.tn. Activez votre micro et caméra pour commencer.", time: "Direct" },
  ]);
  const [message, setMessage] = useState("");
  const [userName, setUserName] = useState("Vous");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUserName(`${data.user.firstName} ${data.user.lastName}`);
        }
      })
      .catch(() => {});
  }, []);

  function send(event: React.FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    const nowTime = new Date().toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [
      ...prev,
      { sender: userName, text: message.trim(), time: nowTime },
    ]);
    setMessage("");
  }

  return (
    <main className="min-h-screen bg-[#101b2d] text-white flex flex-col">
      {/* Room Header */}
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6 bg-[#0c1626]">
        <div className="flex items-center gap-4">
          <a
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/20"
          >
            ← Quitter
          </a>
          <div>
            <h1 className="font-bold text-sm sm:text-base">Classe Virtuelle Profy</h1>
            <p className="text-[11px] text-slate-400">Session #{id.slice(-6).toUpperCase()}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            En direct
          </span>
        </div>
      </header>

      {/* Main Grid: WebRTC Video + Interactive Chat */}
      <div className="flex-1 mx-auto w-full max-w-7xl grid gap-4 p-4 sm:p-6 lg:grid-cols-[1fr_360px]">
        {/* Video & Room Area */}
        <section className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[.03] p-4 sm:p-6 shadow-2xl">
          <WebRTCRoom roomId={id} />

          <div className="mt-4 border-t border-white/10 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <span>Classe sécurisée de bout en bout (P2P WebRTC)</span>
            <a
              href="/dashboard"
              className="rounded-xl bg-rose-500/20 border border-rose-500/40 px-4 py-2 font-bold text-rose-300 transition hover:bg-rose-500/30"
            >
              Terminer la séance
            </a>
          </div>
        </section>

        {/* Live Chat */}
        <aside className="flex flex-col rounded-3xl border border-white/10 bg-white/[.04] p-4 sm:p-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="font-bold text-sm">Chat interactif du cours</h2>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">Direct</span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto py-4 text-xs max-h-[480px]">
            {messages.map((item, index) => {
              const isMe = item.sender === userName;
              return (
                <div key={index} className={isMe ? "text-right" : "text-left"}>
                  <p className="text-[10px] text-slate-400 mb-0.5">
                    {item.sender} · {item.time}
                  </p>
                  <p
                    className={`inline-block rounded-2xl px-3.5 py-2.5 max-w-[85%] text-left ${
                      isMe
                        ? "bg-[#0d8d78] text-white font-medium"
                        : item.sender === "Système"
                        ? "bg-white/5 border border-white/10 text-slate-300 italic"
                        : "bg-white/10 text-white"
                    }`}
                  >
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>

          <form onSubmit={send} className="mt-auto border-t border-white/10 pt-3 flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Posez une question ou partagez une formule..."
              className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-xs text-white placeholder-slate-400 outline-none focus:border-[#72d6bf]"
            />
            <button
              type="submit"
              className="rounded-xl bg-[#72d6bf] px-4 py-2.5 text-xs font-bold text-[#101b2d] transition hover:bg-[#5ec4ad]"
            >
              Envoyer
            </button>
          </form>
        </aside>
      </div>
    </main>
  );
}
