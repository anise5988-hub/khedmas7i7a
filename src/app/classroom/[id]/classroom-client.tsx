"use client";

import { useState } from "react";
import { WebRTCRoom } from "./webrtc-room";

export function ClassroomClient({ id }: { id: string }) {
  const [messages, setMessages] = useState([{ sender: "Amine", text: "On commence par les fonctions." }]);
  const [message, setMessage] = useState("");

  function send(event: React.FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    setMessages([...messages, { sender: "Vous", text: message.trim() }]);
    setMessage("");
  }

  return <main className="min-h-screen bg-[#101b2d] text-white"><header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6"><a href="/dashboard" className="font-bold">← <span className="hidden sm:inline">Quitter la salle</span></a><span className="text-xs text-slate-400 sm:text-sm">Session #{id}</span><span className="rounded-full bg-[#d9f1e9] px-3 py-1 text-xs font-bold text-[#0d8d78]">En direct</span></header><div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:px-6 sm:py-6 lg:grid-cols-[1fr_340px]"><section><WebRTCRoom roomId={id} /><div className="mt-4 flex justify-center"><a href="/dashboard" className="rounded-full bg-red-500 px-4 py-2.5 text-sm font-bold">Quitter</a></div></section><aside className="flex min-h-[360px] flex-col rounded-2xl border border-white/10 bg-white/[.06] p-4 sm:p-5"><div className="flex items-center justify-between"><h2 className="font-bold">Chat du cours</h2><span className="text-xs text-slate-400">2 participants</span></div><div className="flex-1 space-y-3 overflow-y-auto py-5 text-sm">{messages.map((item, index) => <div key={`${item.sender}-${index}`} className={item.sender === "Vous" ? "text-right" : ""}><p className="text-xs text-slate-400">{item.sender}</p><p className={`mt-1 inline-block rounded-xl p-3 text-left ${item.sender === "Vous" ? "bg-[#0d8d78]" : "bg-white/10"}`}>{item.text}</p></div>)}</div><form onSubmit={send} className="flex gap-2"><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Écrire un message..." className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/10 p-3 text-sm outline-none" /><button className="rounded-xl bg-[#72d6bf] px-4 font-bold text-[#11233f]">→</button></form></aside></div></main>;
}
