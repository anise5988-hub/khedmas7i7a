/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { WebRTCRoom } from "./webrtc-room";
import { InteractiveWhiteboard } from "./interactive-whiteboard";
import {
  IconPaperclip,
  IconSend,
  IconFileText,
  IconImage,
  IconDownload,
  IconVideo,
  IconMicrophone,
  IconMicrophoneOff,
  IconClock,
  IconUsers,
  IconMessageSquare,
  IconCheck,
  IconX,
  IconChevronDown,
  IconCamera,
  IconCameraOff,
  IconFullscreen,
  IconFullscreenExit,
  IconStar,
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

type Note = {
  id: string;
  text: string;
  time: string;
};

type Participant = {
  id: string;
  name: string;
  role: "tutor" | "student";
  muted: boolean;
  videoOn: boolean;
};

type DeviceCheck = {
  camera: boolean;
  microphone: boolean;
  speaker: boolean;
  connection: boolean;
};

type Reaction = "👍" | "❤️" | "👏" | "💡" | "🎉";

const MOCK_PARTICIPANTS: Participant[] = [
  { id: "tutor-1", name: "Ahmed Ben Ali", role: "tutor", muted: false, videoOn: true },
  { id: "student-1", name: "Vous", role: "student", muted: false, videoOn: true },
];

export function ClassroomClient({ id }: { id: string }) {
  const [activeTab, setActiveTab] = useState<"video" | "whiteboard">("video");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "Système",
      text: "Bienvenue dans la classe virtuelle ProfySpace.tn. Vous pouvez suivre la vidéo en direct, utiliser le tableau blanc interactif et échanger des documents en temps réel.",
      time: "Direct",
    },
  ]);
  const [message, setMessage] = useState("");
  const [userName, setUserName] = useState("Vous");
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [activeSideTab, setActiveSideTab] = useState<"chat" | "notes" | "participants">("chat");
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteText, setNoteText] = useState("");
  const [participants] = useState<Participant[]>(MOCK_PARTICIPANTS);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showReactions, setShowReactions] = useState(false);
  const [deviceCheck, setDeviceCheck] = useState<DeviceCheck | null>(null);
  const [isCheckingDevices, setIsCheckingDevices] = useState(false);
  const [hasEnteredRoom, setHasEnteredRoom] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mainStageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUserName(`${data.user.firstName} ${data.user.lastName}`);
        }
      })
      .catch(() => {});

    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setReactions((prev) => prev.filter((_, i) => i > 0));
    }, 3000);
    return () => clearTimeout(timeout);
  }, [reactions]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const hours = Math.floor(mins / 60);
    const displayMins = mins % 60;
    return `${hours > 0 ? String(hours).padStart(2, "0") + ":" : ""}${String(displayMins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const checkDevices = useCallback(async () => {
    setIsCheckingDevices(true);
    const check: DeviceCheck = { camera: false, microphone: false, speaker: false, connection: false };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      check.camera = true;
      check.microphone = true;
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      check.camera = false;
      check.microphone = false;
    }

    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const analyser = audioCtx.createAnalyser();
      oscillator.connect(analyser);
      analyser.connect(audioCtx.destination);
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
        check.speaker = true;
      }, 100);
    } catch {
      check.speaker = true;
    }

    if (navigator.onLine) check.connection = true;

    setTimeout(() => {
      setDeviceCheck(check);
      setIsCheckingDevices(false);
    }, 2000);
  }, []);

  const enterRoom = () => {
    setHasEnteredRoom(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const send = (event: React.FormEvent) => {
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
  };

  const addNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    const nowTime = new Date().toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" });
    setNotes((prev) => [...prev, { id: `note-${Date.now()}`, text: noteText.trim(), time: nowTime }]);
    setNoteText("");
  };

  const addReaction = (emoji: Reaction) => {
    setReactions((prev) => [...prev, emoji]);
    setShowReactions(false);
  };

  const toggleFullscreen = () => {
    if (!mainStageRef.current) return;
    if (!document.fullscreenElement) {
      mainStageRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleScreenShare = () => {
    setIsScreenSharing((prev) => !prev);
  };

  if (!hasEnteredRoom) {
    return (
      <main className="min-h-screen bg-[#101b2d] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[.04] p-6 sm:p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold mb-2">Préparation de la classe</h1>
            <p className="text-slate-400 text-sm">Vérifiez votre équipement avant de rejoindre</p>
          </div>

          <div className="space-y-4 mb-8">
            {isCheckingDevices ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="h-12 w-12 border-4 border-[#72d6bf] border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-sm text-slate-300">Vérification des périphériques...</p>
              </div>
            ) : deviceCheck ? (
              <>
                {[
                  { label: "Caméra", key: "camera" as const, icon: IconVideo },
                  { label: "Microphone", key: "microphone" as const, icon: isMuted ? IconMicrophoneOff : IconMicrophone },
                  { label: "Haut-parleurs", key: "speaker" as const, icon: IconCamera },
                  { label: "Connexion Internet", key: "connection" as const, icon: IconVideo },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/10 p-4">
                    <div className="flex items-center gap-3">
                      <item.icon className={`h-5 w-5 ${deviceCheck[item.key] ? "text-[#72d6bf]" : "text-rose-400"}`} />
                      <span className="font-semibold text-sm">{item.label}</span>
                    </div>
                    <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${deviceCheck[item.key] ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
                      {deviceCheck[item.key] ? <IconCheck className="h-3.5 w-3.5" /> : <IconX className="h-3.5 w-3.5" />}
                      {deviceCheck[item.key] ? "OK" : "Problème"}
                    </span>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm mb-4">Cliquez pour vérifier votre équipement</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {!deviceCheck && !isCheckingDevices && (
              <button onClick={checkDevices} className="w-full rounded-2xl bg-[#0d8d78] px-6 py-3.5 font-bold text-white transition hover:bg-[#0a7a68]">
                Vérifier les périphériques
              </button>
            )}
            <button
              onClick={enterRoom}
              disabled={!deviceCheck || !deviceCheck.camera || !deviceCheck.microphone}
              className="w-full rounded-2xl bg-[#72d6bf] px-6 py-3.5 font-bold text-[#101b2d] transition hover:bg-[#5ec4ad] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Rejoindre la classe
            </button>
            <Link href="/dashboard" className="block text-center text-xs text-slate-400 hover:text-white transition">
              Retour au tableau de bord
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const timerDisplay = formatTimer(secondsElapsed);

  return (
    <main className="min-h-screen bg-[#101b2d] text-white flex flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6 bg-[#0c1626] z-20">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/20"
          >
            ← Quitter
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm sm:text-base">Classe Virtuelle ProfySpace</span>
            <span className="rounded-md bg-[#0d8d78] px-1.5 py-0.5 text-[11px] font-extrabold text-white">.tn</span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">#{id.slice(-6).toUpperCase()}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1 text-xs font-mono font-bold text-slate-200 border border-white/10">
            <IconClock className="h-3.5 w-3.5 text-[#72d6bf]" />
            <span>{timerDisplay}</span>
          </div>

          <div className="hidden sm:flex rounded-xl bg-black/40 p-1 border border-white/10 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab("video")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 transition ${
                activeTab === "video" ? "bg-[#0d8d78] text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <IconVideo className="h-3.5 w-3.5" />
              <span>Vidéo</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("whiteboard")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 transition ${
                activeTab === "whiteboard" ? "bg-[#0d8d78] text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <span>🎨</span>
              <span>Tableau</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 mx-auto w-full max-w-7xl grid gap-4 p-4 sm:p-6 lg:grid-cols-[1fr_360px]">
        <section className="flex flex-col rounded-3xl border border-white/10 bg-white/[.03] shadow-2xl overflow-hidden" ref={mainStageRef}>
          {activeTab === "video" ? (
            <WebRTCRoom roomId={id} />
          ) : (
            <InteractiveWhiteboard />
          )}

          <div className="border-t border-white/10 bg-[#0c1626]/80 p-2 sm:p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMuted((prev) => !prev)}
                className={`rounded-xl p-3 transition ${isMuted ? "bg-rose-500/20 text-rose-300" : "bg-white/10 text-white hover:bg-white/20"}`}
                title={isMuted ? "Activer le micro" : "Couper le micro"}
              >
                {isMuted ? <IconMicrophoneOff className="h-5 w-5" /> : <IconMicrophone className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={() => setIsVideoOff((prev) => !prev)}
                className={`rounded-xl p-3 transition ${isVideoOff ? "bg-rose-500/20 text-rose-300" : "bg-white/10 text-white hover:bg-white/20"}`}
                title={isVideoOff ? "Activer la vidéo" : "Couper la vidéo"}
              >
                {isVideoOff ? <IconCameraOff className="h-5 w-5" /> : <IconVideo className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={toggleScreenShare}
                className={`rounded-xl p-3 transition ${isScreenSharing ? "bg-[#0d8d78] text-white" : "bg-white/10 text-white hover:bg-white/20"}`}
                title="Partage d'écran"
              >
                <IconCameraOff className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="rounded-xl bg-white/10 p-3 text-white transition hover:bg-white/20 hidden sm:flex"
                title="Plein écran"
              >
                {isFullscreen ? <IconFullscreenExit className="h-5 w-5" /> : <IconFullscreen className="h-5 w-5" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowReactions((prev) => !prev)}
                  className="rounded-xl bg-white/10 p-3 text-white transition hover:bg-white/20"
                  title="Réactions"
                >
                  <IconStar className="h-5 w-5" />
                </button>
                {showReactions && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 rounded-2xl bg-[#1a2d47] border border-white/10 p-2 shadow-2xl flex gap-1.5 z-30">
                    {(["👍", "❤️", "👏", "💡", "🎉"] as Reaction[]).map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => addReaction(emoji)}
                        className="text-2xl p-1.5 rounded-xl hover:bg-white/10 transition"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Link
                href="/dashboard"
                className="rounded-xl bg-rose-500/20 border border-rose-500/40 px-4 py-2.5 font-bold text-rose-300 transition hover:bg-rose-500/30 text-sm"
              >
                Terminer
              </Link>
            </div>
          </div>
        </section>

        <aside className="flex flex-col rounded-3xl border border-white/10 bg-white/[.04] shadow-2xl overflow-hidden">
          <div className="flex border-b border-white/10">
            <button
              type="button"
              onClick={() => setActiveSideTab("chat")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition ${activeSideTab === "chat" ? "text-white border-b-2 border-[#72d6bf]" : "text-slate-400 hover:text-white"}`}
            >
              <IconMessageSquare className="h-4 w-4" />
              Chat
            </button>
            <button
              type="button"
              onClick={() => setActiveSideTab("notes")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition ${activeSideTab === "notes" ? "text-white border-b-2 border-[#72d6bf]" : "text-slate-400 hover:text-white"}`}
            >
              <IconFileText className="h-4 w-4" />
              Notes
            </button>
            <button
              type="button"
              onClick={() => setActiveSideTab("participants")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition ${activeSideTab === "participants" ? "text-white border-b-2 border-[#72d6bf]" : "text-slate-400 hover:text-white"}`}
            >
              <IconUsers className="h-4 w-4" />
              <span className="hidden sm:inline">Participants</span>
              <span className="sm:hidden">{participants.length}</span>
            </button>
          </div>

          {activeSideTab === "chat" && (
            <>
              <div className="flex-1 space-y-3.5 overflow-y-auto py-4 text-xs max-h-[500px] px-4">
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
                        {item.attachment?.type === "image" && (
                          <div className="mt-2">
                            <img
                              src={item.attachment.url}
                              alt={item.attachment.name}
                              onClick={() => setPreviewImage(item.attachment?.url || null)}
                              className="rounded-xl max-h-48 object-cover cursor-pointer border border-white/20 transition hover:opacity-90"
                            />
                            <span className="block mt-1 text-[10px] opacity-75">
                              {item.attachment.name} ({item.attachment.size})
                            </span>
                          </div>
                        )}
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

              {selectedAttachment && (
                <div className="px-4 mb-2 flex items-center justify-between gap-2 rounded-xl bg-white/10 border border-white/20 p-2 text-xs">
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

              <form onSubmit={send} className="border-t border-white/10 p-3 flex items-center gap-2">
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx,.txt" className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Joindre un fichier"
                  className="rounded-xl bg-white/10 p-2.5 text-slate-300 transition hover:bg-white/20 hover:text-white"
                >
                  <IconPaperclip className="h-4 w-4" />
                </button>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Écrire un message..."
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
            </>
          )}

          {activeSideTab === "notes" && (
            <div className="flex-1 flex flex-col px-4 py-4">
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px]">
                {notes.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">Aucune note pour le moment</p>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="rounded-2xl bg-white/5 border border-white/10 p-3">
                      <p className="text-xs text-white leading-relaxed">{note.text}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{note.time}</p>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={addNote} className="border-t border-white/10 pt-3 mt-3 flex items-center gap-2">
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Ajouter une note..."
                  className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-xs text-white placeholder-slate-400 outline-none focus:border-[#72d6bf]"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-[#72d6bf] p-2.5 text-[#101b2d] transition hover:bg-[#5ec4ad]"
                  title="Ajouter"
                >
                  <IconSend className="h-4 w-4" />
                </button>
              </form>
            </div>
          )}

          {activeSideTab === "participants" && (
            <div className="flex-1 overflow-y-auto max-h-[500px] px-4 py-4">
              <div className="space-y-2.5">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/10 p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-[#0d8d78] flex items-center justify-center text-sm font-bold text-white">
                        {participant.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold">{participant.name}</p>
                        <span className="text-[10px] text-slate-400">{participant.role === "tutor" ? "Tuteur" : "Étudiant"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {participant.muted ? (
                        <span className="rounded-lg bg-rose-500/20 p-1.5 text-rose-300" title="Micro coupé">
                          <IconMicrophoneOff className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span className="rounded-lg bg-emerald-500/20 p-1.5 text-emerald-300" title="Micro actif">
                          <IconMicrophone className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {participant.videoOn ? (
                        <span className="rounded-lg bg-emerald-500/20 p-1.5 text-emerald-300" title="Vidéo active">
                          <IconVideo className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span className="rounded-lg bg-rose-500/20 p-1.5 text-rose-300" title="Vidéo coupée">
                          <IconCameraOff className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {reactions.length > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 flex gap-2 z-40 pointer-events-none">
          {reactions.map((emoji, i) => (
            <span key={`${emoji}-${i}`} className="text-3xl animate-bounce">{emoji}</span>
          ))}
        </div>
      )}

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

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-[#0c1626] border-t border-white/10 p-3 flex justify-around">
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === "video" ? "whiteboard" : "video")}
          className="flex flex-col items-center gap-1 text-xs text-slate-300"
        >
          <IconVideo className="h-5 w-5" />
          {activeTab === "video" ? "Vidéo" : "Tableau"}
        </button>
        <button
          type="button"
          onClick={() => setActiveSideTab(activeSideTab === "chat" ? "notes" : activeSideTab === "notes" ? "participants" : "chat")}
          className="flex flex-col items-center gap-1 text-xs text-slate-300"
        >
          {activeSideTab === "chat" ? <IconMessageSquare className="h-5 w-5" /> : activeSideTab === "notes" ? <IconFileText className="h-5 w-5" /> : <IconUsers className="h-5 w-5" />}
          {activeSideTab === "chat" ? "Chat" : activeSideTab === "notes" ? "Notes" : "Participants"}
        </button>
        <button
          type="button"
          onClick={() => setIsMuted((prev) => !prev)}
          className={`flex flex-col items-center gap-1 text-xs ${isMuted ? "text-rose-300" : "text-slate-300"}`}
        >
          {isMuted ? <IconMicrophoneOff className="h-5 w-5" /> : <IconMicrophone className="h-5 w-5" />}
        </button>
      </div>
    </main>
  );
}
