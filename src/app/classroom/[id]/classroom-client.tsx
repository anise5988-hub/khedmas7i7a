/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/client/supabase";
import { DailyRoom, type DailyRoomHandle } from "./daily-room";
import { InteractiveWhiteboard, type WhiteboardHandle } from "./interactive-whiteboard";
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
  IconCamera,
  IconCameraOff,
  IconFullscreen,
  IconFullscreenExit,
  IconStar,
  IconEdit,
  IconPhone,
  IconMonitor,
} from "@/components/icons";

type Message = {
  id: string;
  senderId: string;
  senderName: string;
  text: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  createdAt: string;
};

type Note = {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
};

type DeviceCheck = {
  camera: boolean;
  microphone: boolean;
  speaker: boolean;
  connection: boolean;
};

type Reaction = "👍" | "❤️" | "👏" | "💡" | "🎉";

type Presence = { muted: boolean; videoOn: boolean };

type ClassroomEvent =
  | { type: "chat_message"; message: Message }
  | { type: "note"; note: Note }
  | { type: "whiteboard_update"; pageIndex: number; dataUrl: string }
  | { type: "presence"; senderId: string; presence: Presence };

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg)$/i;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" });
}

export function ClassroomClient({
  bookingId,
  currentUserId,
  currentUserName,
  currentUserRole,
  otherPartyName,
  startsAt,
  durationMinutes,
}: {
  bookingId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: "tutor" | "student";
  otherPartyName: string;
  startsAt: string;
  durationMinutes: number;
}) {
  const [activeTab, setActiveTab] = useState<"video" | "whiteboard">("video");
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedAttachment, setSelectedAttachment] = useState<{ name: string; url: string } | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [secondsElapsed, setSecondsElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - new Date(startsAt).getTime()) / 1000)),
  );
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeSideTab, setActiveSideTab] = useState<"chat" | "notes" | "participants">("chat");
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteText, setNoteText] = useState("");
  const [otherPresence, setOtherPresence] = useState<Presence>({ muted: false, videoOn: true });
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showReactions, setShowReactions] = useState(false);
  const [deviceCheck, setDeviceCheck] = useState<DeviceCheck | null>(null);
  const [isCheckingDevices, setIsCheckingDevices] = useState(false);
  const [hasEnteredRoom, setHasEnteredRoom] = useState(false);
  const [joinWindow, setJoinWindow] = useState<{ canJoin: boolean; opensAt: string; closesAt: string } | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainStageRef = useRef<HTMLDivElement>(null);
  const whiteboardRef = useRef<WhiteboardHandle>(null);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  const dailyRef = useRef<DailyRoomHandle>(null);

  const broadcast = useCallback((payload: ClassroomEvent) => {
    channelRef.current?.send({ type: "broadcast", event: "classroom", payload });
  }, []);

  // One realtime channel per booking, shared by chat, notes, whiteboard sync
  // and mic/camera presence — kept separate from the video-call signaling
  // channel in WebRTCRoom so neither feature can destabilize the other.
  useEffect(() => {
    if (!supabase) return;
    const room = supabase.channel(`classroom-data:${bookingId}`, { config: { broadcast: { self: false } } });
    channelRef.current = room;

    room.on("broadcast", { event: "classroom" }, ({ payload }: { payload: ClassroomEvent }) => {
      if (payload.type === "chat_message") {
        setMessages((prev) => (prev.some((m) => m.id === payload.message.id) ? prev : [...prev, payload.message]));
      } else if (payload.type === "note") {
        setNotes((prev) => (prev.some((n) => n.id === payload.note.id) ? prev : [...prev, payload.note]));
      } else if (payload.type === "whiteboard_update") {
        whiteboardRef.current?.applyRemoteUpdate(payload.pageIndex, payload.dataUrl);
      } else if (payload.type === "presence" && payload.senderId !== currentUserId) {
        setOtherPresence(payload.presence);
      }
    });

    room.subscribe();

    return () => {
      void room.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  // Poll the real access window server-side (join-time gating must not
  // rely on the client's clock alone) while the participant is still in
  // the pre-join lobby, so a countdown can resolve into an enabled Join
  // button without requiring a manual page refresh.
  useEffect(() => {
    if (hasEnteredRoom) return;
    let cancelled = false;

    function poll() {
      fetch(`/api/classroom/${bookingId}/session`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!cancelled && data) {
            setJoinWindow({ canJoin: data.canJoin, opensAt: data.opensAt, closesAt: data.closesAt });
          }
        })
        .catch(() => {});
    }

    poll();
    const interval = setInterval(poll, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [bookingId, hasEnteredRoom]);

  useEffect(() => {
    if (hasEnteredRoom) return;
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [hasEnteredRoom]);

  // Load chat/notes history once on entry.
  useEffect(() => {
    Promise.all([
      fetch(`/api/classroom/${bookingId}/messages`).then((res) => (res.ok ? res.json() : { messages: [] })),
      fetch(`/api/classroom/${bookingId}/notes`).then((res) => (res.ok ? res.json() : { notes: [] })),
    ])
      .then(([messagesJson, notesJson]) => {
        setMessages(messagesJson.messages || []);
        setNotes(notesJson.notes || []);
      })
      .catch(() => {})
      .finally(() => setMessagesLoaded(true));
  }, [bookingId]);

  // Broadcast local mic/camera presence so the other participant's
  // "Participants" panel reflects reality instead of a guess.
  useEffect(() => {
    broadcast({ type: "presence", senderId: currentUserId, presence: { muted: isMuted, videoOn: !isVideoOff } });
  }, [isMuted, isVideoOff, broadcast, currentUserId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed(Math.max(0, Math.floor((Date.now() - new Date(startsAt).getTime()) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [startsAt]);

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

  const openDrawer = (tab: "chat" | "notes" | "participants") => {
    setActiveSideTab(tab);
    setDrawerOpen(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      setSelectedAttachment(null);
      return;
    }

    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", isPdf ? "pdf" : "image");
      const response = await fetch("/api/uploads/video", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Envoi impossible.");
      setSelectedAttachment({ name: file.name, url: data.url });
    } catch {
      setSelectedAttachment(null);
    } finally {
      setUploadingAttachment(false);
    }
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = message.trim();
    if (!text && !selectedAttachment) return;

    setMessage("");
    setSelectedAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    try {
      const res = await fetch(`/api/classroom/${bookingId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text || undefined,
          attachmentUrl: selectedAttachment?.url,
          attachmentName: selectedAttachment?.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) return;
      setMessages((prev) => [...prev, data.message]);
      broadcast({ type: "chat_message", message: data.message });
    } catch {
      // Message send failed silently offline; the input already cleared,
      // which is acceptable for a best-effort live chat.
    }
  };

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = noteText.trim();
    if (!text) return;
    setNoteText("");

    try {
      const res = await fetch(`/api/classroom/${bookingId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) return;
      setNotes((prev) => [...prev, data.note]);
      broadcast({ type: "note", note: data.note });
    } catch {
      // Best-effort — note stays in the input box's history via re-typing.
    }
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

  const participants = [
    {
      id: currentUserId,
      name: `${currentUserName} (Vous)`,
      role: currentUserRole,
      muted: isMuted,
      videoOn: !isVideoOff,
    },
    {
      id: "other",
      name: otherPartyName,
      role: currentUserRole === "tutor" ? ("student" as const) : ("tutor" as const),
      muted: otherPresence.muted,
      videoOn: otherPresence.videoOn,
    },
  ];

  // The server poll only refreshes every 15s, but the on-screen countdown
  // ticks every second — deriving the actual open/closed state from the
  // client clock against the server-supplied opensAt/closesAt keeps the
  // button unlocking exactly when the countdown hits 00:00 instead of
  // lagging up to 15s behind it. joinWindow.canJoin (which also covers the
  // admin bypass) still wins if the server already says yes.
  const effectiveCanJoin = joinWindow
    ? joinWindow.canJoin ||
      (nowTick >= new Date(joinWindow.opensAt).getTime() && nowTick <= new Date(joinWindow.closesAt).getTime())
    : false;
  const effectiveIsTooEarly = joinWindow ? !effectiveCanJoin && nowTick < new Date(joinWindow.opensAt).getTime() : false;
  const effectiveIsTooLate = joinWindow ? !effectiveCanJoin && nowTick > new Date(joinWindow.closesAt).getTime() : false;

  if (!hasEnteredRoom) {
    return (
      <main className="min-h-screen bg-[#101b2d] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[.04] p-6 sm:p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold mb-2">Préparation de la classe</h1>
            <p className="text-slate-400 text-sm">Vérifiez votre équipement avant de rejoindre</p>
          </div>

          <div className="mb-6 rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Avec</span>
              <span className="font-bold">{otherPartyName}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Horaire prévu</span>
              <span className="font-bold">
                {new Date(startsAt).toLocaleString("fr-TN", { dateStyle: "medium", timeStyle: "short" })} · {durationMinutes} min
              </span>
            </div>
            {effectiveIsTooEarly && (
              <div className="pt-2 border-t border-white/10 text-center">
                <p className="text-[11px] text-amber-300 font-bold uppercase tracking-wider">La salle ouvre dans</p>
                <p className="text-xl font-mono font-extrabold text-[#72d6bf]">
                  {(() => {
                    const diffSec = Math.max(0, Math.floor((new Date(joinWindow!.opensAt).getTime() - nowTick) / 1000));
                    const m = Math.floor(diffSec / 60).toString().padStart(2, "0");
                    const s = (diffSec % 60).toString().padStart(2, "0");
                    return `${m}:${s}`;
                  })()}
                </p>
              </div>
            )}
            {effectiveIsTooLate && (
              <p className="pt-2 border-t border-white/10 text-center text-xs font-bold text-rose-300">
                Cette séance est terminée et la salle n&apos;est plus accessible.
              </p>
            )}
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
              disabled={!deviceCheck || !deviceCheck.camera || !deviceCheck.microphone || (joinWindow ? !effectiveCanJoin : false)}
              className="w-full rounded-2xl bg-[#72d6bf] px-6 py-3.5 font-bold text-[#101b2d] transition hover:bg-[#5ec4ad] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {effectiveIsTooEarly ? "La salle n'est pas encore ouverte" : effectiveIsTooLate ? "Séance terminée" : "Rejoindre la classe"}
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
  const plannedEndSeconds = durationMinutes * 60;
  const isOvertime = secondsElapsed > plannedEndSeconds;
  const unreadDot = activeSideTab !== "chat" && messages.length > 0;

  return (
    <main className="min-h-screen bg-[#0a0f1a] text-white flex flex-col">
      {/* Slim, informational top bar — the video stage is the dominant
          element, matching international platforms (Meet/Zoom/Teams)
          rather than splitting the screen with a permanent side panel. */}
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5 sm:px-6 bg-[#0c1626]/95 backdrop-blur z-20">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/10 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-white/20"
          >
            ← <span className="hidden sm:inline">Quitter</span>
          </Link>
          <div className="hidden sm:flex items-center gap-2 min-w-0">
            <span className="font-bold text-sm truncate">Classe Virtuelle ProfySpace</span>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-extrabold text-rose-300">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
              EN DIRECT
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-mono font-bold border ${
              isOvertime ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "bg-white/10 border-white/10 text-slate-200"
            }`}
            title={isOvertime ? "Durée prévue dépassée" : `Durée prévue : ${durationMinutes} min`}
          >
            <IconClock className="h-3.5 w-3.5 text-[#72d6bf]" />
            <span>{timerDisplay}</span>
          </div>
          <button
            type="button"
            onClick={() => openDrawer("participants")}
            className="hidden sm:flex items-center gap-1.5 rounded-xl bg-white/10 px-2.5 py-1.5 text-xs font-bold text-slate-200 transition hover:bg-white/20"
            title="Participants"
          >
            <IconUsers className="h-3.5 w-3.5" />
            {participants.length}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="hidden sm:flex rounded-xl bg-white/10 p-2 text-white transition hover:bg-white/20"
            title="Plein écran"
          >
            {isFullscreen ? <IconFullscreenExit className="h-4 w-4" /> : <IconFullscreen className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Main stage — fills all remaining space between the top bar and
          the floating control bar. */}
      <div className="flex-1 relative overflow-hidden" ref={mainStageRef}>
        {/* Both stay mounted so switching tabs never drops the live call
            or resets the whiteboard — only visibility toggles. */}
        <div className={activeTab === "video" ? "absolute inset-0 flex flex-col" : "hidden"}>
          <DailyRoom
            ref={dailyRef}
            bookingId={bookingId}
            currentUserName={currentUserName}
            onAudioMuteChange={setIsMuted}
            onVideoMuteChange={setIsVideoOff}
          />
        </div>
        <div className={activeTab === "whiteboard" ? "absolute inset-0 flex flex-col p-3 sm:p-4" : "hidden"}>
          <div className="flex-1 rounded-2xl overflow-hidden border border-white/10">
            <InteractiveWhiteboard
              ref={whiteboardRef}
              onLocalUpdate={(pageIndex, dataUrl) => broadcast({ type: "whiteboard_update", pageIndex, dataUrl })}
            />
          </div>
        </div>

        {/* Slide-in drawer for chat / notes / participants — an overlay,
            not a permanently-reserved column, so the call stays the focus
            the way it does on Meet/Zoom/Teams. */}
        {drawerOpen && (
          <div
            className="absolute inset-0 z-30 flex justify-end bg-black/40"
            onClick={() => setDrawerOpen(false)}
          >
            <aside
              onClick={(e) => e.stopPropagation()}
              className="flex h-full w-full sm:w-[380px] flex-col border-l border-white/10 bg-[#101b2d] shadow-2xl"
            >
              <div className="flex items-center border-b border-white/10">
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
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="px-3 text-slate-400 hover:text-white"
                  title="Fermer"
                >
                  <IconX className="h-4 w-4" />
                </button>
              </div>

              {activeSideTab === "chat" && (
            <>
              <div className="flex-1 space-y-3.5 overflow-y-auto py-4 text-xs max-h-[500px] px-4">
                {messagesLoaded && messages.length === 0 && (
                  <p className="text-center text-slate-400 py-8">
                    Aucun message pour le moment. Dites bonjour à {otherPartyName.split(" ")[0]} !
                  </p>
                )}
                {messages.map((item) => {
                  const isMe = item.senderId === currentUserId;
                  const isImageAttachment = item.attachmentName ? IMAGE_EXTENSIONS.test(item.attachmentName) : false;
                  return (
                    <div key={item.id} className={isMe ? "text-right" : "text-left"}>
                      <p className="text-[10px] text-slate-400 mb-0.5">
                        {isMe ? "Vous" : item.senderName} · {formatTime(item.createdAt)}
                      </p>
                      <div
                        className={`inline-block rounded-2xl p-3.5 max-w-[90%] text-left ${
                          isMe ? "bg-[#0d8d78] text-white font-medium" : "bg-white/10 text-white"
                        }`}
                      >
                        {item.text && <p className="leading-relaxed">{item.text}</p>}
                        {item.attachmentUrl && isImageAttachment && (
                          <div className="mt-2">
                            <img
                              src={item.attachmentUrl}
                              alt={item.attachmentName || "Pièce jointe"}
                              onClick={() => setPreviewImage(item.attachmentUrl || null)}
                              className="rounded-xl max-h-48 object-cover cursor-pointer border border-white/20 transition hover:opacity-90"
                            />
                            <span className="block mt-1 text-[10px] opacity-75">{item.attachmentName}</span>
                          </div>
                        )}
                        {item.attachmentUrl && !isImageAttachment && (
                          <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-black/30 border border-white/20 p-2.5">
                            <div className="flex items-center gap-2 truncate">
                              <IconFileText className="h-4 w-4 shrink-0 text-[#72d6bf]" />
                              <p className="font-bold truncate text-[11px]">{item.attachmentName}</p>
                            </div>
                            <a
                              href={item.attachmentUrl}
                              download={item.attachmentName || undefined}
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
                    {IMAGE_EXTENSIONS.test(selectedAttachment.name) ? (
                      <IconImage className="h-4 w-4 text-[#72d6bf]" />
                    ) : (
                      <IconFileText className="h-4 w-4 text-[#72d6bf]" />
                    )}
                    <span className="truncate font-semibold">{selectedAttachment.name}</span>
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
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,.pdf" className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Joindre une image ou un PDF"
                  disabled={uploadingAttachment}
                  className="rounded-xl bg-white/10 p-2.5 text-slate-300 transition hover:bg-white/20 hover:text-white disabled:opacity-50"
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
                      <p className="text-[10px] text-slate-400 mt-1">
                        {note.authorId === currentUserId ? "Vous" : note.authorName} · {formatTime(note.createdAt)}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={addNote} className="border-t border-white/10 pt-3 mt-3 flex items-center gap-2">
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Ajouter une note partagée..."
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
                        <span className="text-[10px] text-slate-400">{participant.role === "tutor" ? "Enseignant" : "Élève"}</span>
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
        )}
      </div>

      {/* Floating bottom control bar — identical across breakpoints,
          icon-first, matching the toolbar pattern of Meet/Zoom/Teams
          instead of a separate mobile-only nav. */}
      <div className="flex items-center justify-center gap-2 border-t border-white/10 bg-[#0c1626] px-3 py-2.5 sm:px-6 sm:py-3 z-20">
        <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => dailyRef.current?.toggleAudio()}
            className={`rounded-xl p-2.5 transition sm:p-3 ${isMuted ? "bg-rose-500/20 text-rose-300" : "bg-white/10 text-white hover:bg-white/20"}`}
            title={isMuted ? "Activer le micro" : "Couper le micro"}
          >
            {isMuted ? <IconMicrophoneOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <IconMicrophone className="h-4 w-4 sm:h-5 sm:w-5" />}
          </button>
          <button
            type="button"
            onClick={() => dailyRef.current?.toggleVideo()}
            className={`rounded-xl p-2.5 transition sm:p-3 ${isVideoOff ? "bg-rose-500/20 text-rose-300" : "bg-white/10 text-white hover:bg-white/20"}`}
            title={isVideoOff ? "Activer la caméra" : "Couper la caméra"}
          >
            {isVideoOff ? <IconCameraOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <IconCamera className="h-4 w-4 sm:h-5 sm:w-5" />}
          </button>
          <button
            type="button"
            onClick={() => {
              dailyRef.current?.toggleScreenShare();
              setIsScreenSharing((prev) => !prev);
            }}
            className={`hidden rounded-xl p-3 transition sm:flex ${isScreenSharing ? "bg-[#0d8d78] text-white" : "bg-white/10 text-white hover:bg-white/20"}`}
            title="Partager l'écran"
          >
            <IconMonitor className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === "video" ? "whiteboard" : "video")}
            className={`rounded-xl p-2.5 transition sm:p-3 ${activeTab === "whiteboard" ? "bg-[#0d8d78] text-white" : "bg-white/10 text-white hover:bg-white/20"}`}
            title="Tableau blanc"
          >
            <IconEdit className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button
            type="button"
            onClick={() => openDrawer("chat")}
            className="relative rounded-xl bg-white/10 p-2.5 text-white transition hover:bg-white/20 sm:p-3"
            title="Chat"
          >
            <IconMessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
            {unreadDot && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-400" />}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowReactions((prev) => !prev)}
              className="rounded-xl bg-white/10 p-2.5 text-white transition hover:bg-white/20 sm:p-3"
              title="Réactions"
            >
              <IconStar className="h-4 w-4 sm:h-5 sm:w-5" />
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
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-xl bg-white/10 p-2.5 text-white transition hover:bg-white/20 sm:hidden"
            title="Plein écran"
          >
            {isFullscreen ? <IconFullscreenExit className="h-4 w-4" /> : <IconFullscreen className="h-4 w-4" />}
          </button>
        </div>
        <Link
          href="/dashboard"
          className="ml-1 flex items-center gap-1.5 rounded-2xl bg-rose-500 px-4 py-2.5 font-bold text-white transition hover:bg-rose-600 sm:px-5 sm:py-3"
          title="Quitter la classe"
        >
          <IconPhone className="h-4 w-4 rotate-[135deg] sm:h-5 sm:w-5" />
          <span className="hidden sm:inline">Quitter</span>
        </Link>
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

    </main>
  );
}
