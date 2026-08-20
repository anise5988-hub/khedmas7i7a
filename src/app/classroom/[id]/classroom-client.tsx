/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { WebRTCRoom } from "./webrtc-room";
import {
  IconPaperclip,
  IconSend,
  IconFileText,
  IconImage,
  IconDownload,
} from "@/components/icons";

type Attachment = {
  type: "image" | "file";
  name: string;
  size: string;
  url: string;
};

type Message = {
  id: string;
  sender: string;
  text: string;
  time: string;
  attachment?: Attachment;
};

export function ClassroomClient({ id }: { id: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "Système",
      text: "Bienvenue dans la classe virtuelle Profy.tn. Vous pouvez échanger des messages, envoyer des exercices, des documents PDF et des photos en direct.",
      time: "Direct",
    },
  ]);
  const [message, setMessage] = useState("");
  const [userName, setUserName] = useState("Vous");
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImg = file.type.startsWith("image/");
    const sizeKb = (file.size / 1024).toFixed(0) + " KB";
    const url = URL.createObjectURL(file);

    setSelectedAttachment({
      type: isImg ? "image" : "file",
      name: file.name,
      size: sizeKb,
      url,
    });
  }

  function send(event: React.FormEvent) {
    event.preventDefault();
    if (!message.trim() && !selectedAttachment) return;

    const nowTime = new Date().toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" });
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: userName,
      text: message.trim(),
      time: nowTime,
      attachment: selectedAttachment || undefined,
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessage("");
    setSelectedAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <main className="min-h-screen bg-[#101b2d] text-white flex flex-col">
      {/* Header */}
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

      {/* Main Classroom Workspace */}
      <div className="flex-1 mx-auto w-full max-w-7xl grid gap-4 p-4 sm:p-6 lg:grid-cols-[1fr_360px]">
        {/* WebRTC Video Stream Area */}
        <section className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[.03] p-4 sm:p-6 shadow-2xl">
          <WebRTCRoom roomId={id} />

          <div className="mt-4 border-t border-white/10 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <span>Classe sécurisée de bout en bout (P2P WebRTC HD)</span>
            <a
              href="/dashboard"
              className="rounded-xl bg-rose-500/20 border border-rose-500/40 px-4 py-2 font-bold text-rose-300 transition hover:bg-rose-500/30"
            >
              Terminer la séance
            </a>
          </div>
        </section>

        {/* Live Chat with Attachments */}
        <aside className="flex flex-col rounded-3xl border border-white/10 bg-white/[.04] p-4 sm:p-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="font-bold text-sm">Chat & Fichiers du cours</h2>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">Direct</span>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 space-y-3.5 overflow-y-auto py-4 text-xs max-h-[500px]">
            {messages.map((item) => {
              const isMe = item.sender === userName;
              return (
                <div key={item.id} className={isMe ? "text-right" : "text-left"}>
                  <p className="text-[10px] text-slate-400 mb-0.5">
                    {item.sender} · {item.time}
                  </p>

                  <div
                    className={`inline-block rounded-2xl p-3.5 max-w-[90%] text-left ${
                      isMe
                        ? "bg-[#0d8d78] text-white font-medium"
                        : item.sender === "Système"
                        ? "bg-white/5 border border-white/10 text-slate-300 italic"
                        : "bg-white/10 text-white"
                    }`}
                  >
                    {item.text && <p className="leading-relaxed">{item.text}</p>}

                    {/* Image Attachment Preview */}
                    {item.attachment?.type === "image" && (
                      <div className="mt-2">
                        <img
                          src={item.attachment.url}
                          alt={item.attachment.name}
                          onClick={() => setPreviewImage(item.attachment?.url || null)}
                          className="rounded-xl max-h-48 object-cover cursor-pointer border border-white/20 transition hover:opacity-90"
                        />
                        <span className="block mt-1 text-[10px] opacity-75">
                          {item.attachment.name} ({item.attachment.size}) · Cliquer pour agrandir
                        </span>
                      </div>
                    )}

                    {/* Document / PDF Attachment Chip */}
                    {item.attachment?.type === "file" && (
                      <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-black/30 border border-white/20 p-2.5">
                        <div className="flex items-center gap-2 truncate">
                          <IconFileText className="h-4 w-4 shrink-0 text-[#72d6bf]" />
                          <div className="truncate">
                            <p className="font-bold truncate text-[11px]">{item.attachment.name}</p>
                            <p className="text-[9px] text-slate-400">{item.attachment.size}</p>
                          </div>
                        </div>
                        <a
                          href={item.attachment.url}
                          download={item.attachment.name}
                          className="rounded-lg bg-white/20 p-1.5 hover:bg-white/30 text-white"
                          title="Télécharger"
                        >
                          <IconDownload className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pending Attachment Indicator */}
          {selectedAttachment && (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-white/10 border border-white/20 p-2 text-xs">
              <div className="flex items-center gap-2 truncate">
                {selectedAttachment.type === "image" ? (
                  <IconImage className="h-4 w-4 text-[#72d6bf]" />
                ) : (
                  <IconFileText className="h-4 w-4 text-[#72d6bf]" />
                )}
                <span className="truncate font-semibold">{selectedAttachment.name}</span>
                <span className="text-[10px] text-slate-400">({selectedAttachment.size})</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedAttachment(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-xs font-bold text-rose-300 hover:text-rose-100 px-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Chat Input & File Picker */}
          <form onSubmit={send} className="mt-auto border-t border-white/10 pt-3 flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.txt"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Joindre une photo ou un document"
              className="rounded-xl bg-white/10 p-2.5 text-slate-300 transition hover:bg-white/20 hover:text-white"
            >
              <IconPaperclip className="h-4 w-4" />
            </button>

            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Écrire un message ou partager un exercice..."
              className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-xs text-white placeholder-slate-400 outline-none focus:border-[#72d6bf]"
            />

            <button
              type="submit"
              className="rounded-xl bg-[#72d6bf] p-2.5 text-[#101b2d] transition hover:bg-[#5ec4ad]"
              title="Envoyer"
            >
              <IconSend className="h-4 w-4" />
            </button>
          </form>
        </aside>
      </div>

      {/* Fullscreen Image Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={previewImage} alt="Preview" className="rounded-2xl max-h-[85vh] object-contain shadow-2xl" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 rounded-full bg-black/60 px-3 py-1.5 text-xs font-bold text-white hover:bg-black"
            >
              Fermer ✕
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
