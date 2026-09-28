/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/client/supabase";
import {
  DailyRoom,
  VideoTile,
  qualityColor,
  qualityLabel,
  type DailyRoomHandle,
  type DailyTile,
} from "./daily-room";
import { InteractiveWhiteboard, type WhiteboardHandle } from "./interactive-whiteboard";
import {
  phaseLabel as phaseLabelText,
  phaseColor,
  formatClock,
  formatMessageTime,
  IMAGE_EXTENSIONS,
  type ClassroomSessionData,
  type ClassroomMessageRow,
  type ClassroomNoteRow,
  type ClassroomResourceRow,
  type ClassroomParticipantRow,
  type HostControls,
  type LessonPhase,
  type ConnectionQuality,
  type RecordingStatus,
} from "./classroom-types";
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
  IconHand,
  IconSettings,
  IconShield,
  IconUpload,
  IconChevronLeft,
  IconChevronRight,
  IconWifi,
  IconPresentation,
} from "@/components/icons";

const REACTIONS = ["👍", "❤️", "👏", "💡", "🎉"] as const;
type Reaction = (typeof REACTIONS)[number];

type Presence = { muted: boolean; videoOn: boolean };

type ReactionEvent = { type: "reaction"; emoji: string; fromId: string; fromName: string };
void (null as unknown as ReactionEvent | null);
type PresenceEvent = { type: "presence"; senderId: string; presence: Presence };
void (null as unknown as PresenceEvent | null);

function formatTime(iso: string) {
  return formatMessageTime(iso);
}

function formatTimer(totalSecs: number) {
  return formatClock(Math.max(0, totalSecs));
}

function formatDurationLabel(seconds: number) {
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
}

/** Server-time offset so the countdown/timer uses the server's clock. */
function computeClockSkew(serverTime: string) {
  return Date.now() - new Date(serverTime).getTime();
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
  const isHost = currentUserRole === "tutor";
  const router = useRouter();

  // ── Session state (server is the source of truth) ──
  const [session, setSession] = useState<ClassroomSessionData | null>(null);
  const [sessionError, setSessionError] = useState<{ code: string; message: string } | null>(null);
  const [hasEnteredRoom, setHasEnteredRoom] = useState(false);
  // Captured once at entry so the poll loop refreshing `session` never
  // re-mounts the call object with a new token mid-lesson.
  const [joinInfo, setJoinInfo] = useState<{ roomUrl: string; token: string } | null>(null);
  const [clockSkew, setClockSkew] = useState(0);

  // ── Pre-join media preview ──
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamId, setSelectedCamId] = useState<string | null>(null);
  const [selectedMicId, setSelectedMicId] = useState<string | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);

  // ── In-meeting state ──
  const [messages, setMessages] = useState<ClassroomMessageRow[]>([]);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedAttachment, setSelectedAttachment] = useState<{ name: string; url: string } | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notes, setNotes] = useState<ClassroomNoteRow[]>([]);
  const [noteText, setNoteText] = useState("");
  const [resources, setResources] = useState<ClassroomResourceRow[]>([]);
  const [presentedResource, setPresentedResource] = useState<ClassroomResourceRow | null>(null);
  const [presentationPage, setPresentationPage] = useState(1);
  const [uploadingResource, setUploadingResource] = useState(false);
  const [participants, setParticipants] = useState<ClassroomParticipantRow[]>([]);
  const [attendances, setAttendances] = useState<
    { userId: string; displayName: string; role: string; joinedAt: string; leftAt: string | null; durationSeconds: number | null; reconnectCount: number; leaveReason: string | null }[]
  >([]);
  const [waitingQueue, setWaitingQueue] = useState<{ userId: string; displayName: string; role: string; createdAt: string }[]>([]);

  const [activeTab, setActiveTab] = useState<"video" | "whiteboard" | "presentation">("video");
  const [activeSideTab, setActiveSideTab] = useState<"chat" | "participants" | "notes" | "resources" | "settings">("chat");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>("UNKNOWN");
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "error" | "reconnecting">("connecting");
  const [tiles, setTiles] = useState<DailyTile[]>([]);
  const [localHandRaised, setLocalHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState<Record<string, { name: string; at: number }>>({});
  const [floatingReactions, setFloatingReactions] = useState<{ id: number; emoji: string; name: string }[]>([]);
  const [showReactionsPicker, setShowReactionsPicker] = useState(false);
  const [otherPresence, setOtherPresence] = useState<Presence>({ muted: false, videoOn: true });

  // ── Host panel state ──
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>("NOT_AVAILABLE");
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; confirmLabel: string; onConfirm: () => void } | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);

  const [now, setNow] = useState(() => Date.now());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resourceInputRef = useRef<HTMLInputElement>(null);
  const mainStageRef = useRef<HTMLDivElement>(null);
  const whiteboardRef = useRef<WhiteboardHandle>(null);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  const dailyRef = useRef<DailyRoomHandle>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const drawerOpenRef = useRef(false);
  useEffect(() => {
    drawerOpenRef.current = drawerOpen && activeSideTab === "chat";
  }, [drawerOpen, activeSideTab]);

  const showToast = useCallback((message: string, tone: "success" | "error" | "info" = "info") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Session fetch / poll — the single source of truth for access, phase,
  // waiting-room state and host controls. Runs before joining (fast, so the
  // pre-join screen reflects the teacher opening the room) and continues at
  // a slower cadence during the lesson so phase/permission changes propagate
  // without a refresh.
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function poll() {
      try {
        const res = await fetch(`/api/classroom/${bookingId}/session`, { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setSessionError({ code: data.code ?? "SERVER_ERROR", message: data.error ?? "Impossible de charger la séance." });
          return;
        }
        setSessionError(null);
        setSession(data as ClassroomSessionData);
        setClockSkew(computeClockSkew(data.serverTime));
        setRecordingStatus(data.recordingStatus ?? "NOT_AVAILABLE");
      } catch {
        if (!cancelled) setSessionError({ code: "NETWORK", message: "Connexion au serveur perdue. Nouvelle tentative..." });
      } finally {
        if (!cancelled) timer = window.setTimeout(poll, hasEnteredRoom ? 15000 : 6000);
      }
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [bookingId, hasEnteredRoom]);

  // ── Roster poll — participants, waiting queue, attendance (host) ──
  useEffect(() => {
    if (!hasEnteredRoom) return;
    let cancelled = false;
    let timer: number | undefined;

    async function poll() {
      try {
        const res = await fetch(`/api/classroom/${bookingId}/participants`, { cache: "no-store" });
        const data = await res.json();
        if (cancelled || !res.ok) return;
        setParticipants(data.participants ?? []);
        setAttendances(data.attendances ?? []);
        setWaitingQueue(data.waitingQueue ?? []);
      } catch {
        // transient — the next tick retries
      } finally {
        if (!cancelled) timer = window.setTimeout(poll, 10000);
      }
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [bookingId, hasEnteredRoom]);

  // ── Realtime channel: chat, notes, whiteboard, presence, reactions, hands ──
  useEffect(() => {
    if (!supabase) return;
    const room = supabase.channel(`classroom-data:${bookingId}`, { config: { broadcast: { self: false } } });
    channelRef.current = room;

    room.on("broadcast", { event: "classroom" }, ({ payload }: { payload: unknown }) => {
      const evt = payload as
        | { type: "chat_message"; message: ClassroomMessageRow }
        | { type: "note"; note: ClassroomNoteRow }
        | { type: "whiteboard_update"; pageIndex: number; dataUrl: string }
        | { type: "presence"; senderId: string; presence: Presence }
        | { type: "reaction"; senderId: string; senderName: string; emoji: string }
        | { type: "hand"; senderId: string; senderName: string; raised: boolean };
      if (!evt || typeof evt !== "object") return;

      if (evt.type === "chat_message") {
        setMessages((prev) => (prev.some((m) => m.id === evt.message.id) ? prev : [...prev, evt.message]));
        if (!drawerOpenRef.current) setUnreadCount((c) => c + 1);
      } else if (evt.type === "note") {
        setNotes((prev) => (prev.some((n) => n.id === evt.note.id) ? prev : [...prev, evt.note]));
      } else if (evt.type === "whiteboard_update") {
        whiteboardRef.current?.applyRemoteUpdate(evt.pageIndex, evt.dataUrl);
      } else if (evt.type === "presence" && evt.senderId !== currentUserId) {
        setOtherPresence(evt.presence);
      } else if (evt.type === "reaction" && evt.senderId !== currentUserId) {
        setFloatingReactions((prev) => [...prev.slice(-4), { id: Date.now() + Math.random(), emoji: evt.emoji, name: evt.senderName }]);
      } else if (evt.type === "hand") {
        setRaisedHands((prev) => {
          const next = { ...prev };
          if (evt.raised) next[evt.senderId] = { name: evt.senderName, at: Date.now() };
          else delete next[evt.senderId];
          return next;
        });
      }
    });

    room.subscribe();
    return () => {
      void room.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const broadcast = useCallback((payload: unknown) => {
    channelRef.current?.send({ type: "broadcast", event: "classroom", payload });
  }, []);

  // ── Chat / notes / resources history ──
  useEffect(() => {
    Promise.all([
      fetch(`/api/classroom/${bookingId}/messages`).then((res) => (res.ok ? res.json() : { messages: [] })),
      fetch(`/api/classroom/${bookingId}/notes`).then((res) => (res.ok ? res.json() : { notes: [] })),
      fetch(`/api/classroom/${bookingId}/resources`).then((res) => (res.ok ? res.json() : { resources: [] })),
    ])
      .then(([messagesJson, notesJson, resourcesJson]) => {
        setMessages(messagesJson.messages || []);
        setNotes(notesJson.notes || []);
        setResources(resourcesJson.resources || []);
        const presenting = (resourcesJson.resources || []).find((r: ClassroomResourceRow) => r.isPresenting);
        if (presenting) {
          setPresentedResource(presenting);
          setPresentationPage(presenting.page || 1);
        }
      })
      .catch(() => {})
      .finally(() => setMessagesLoaded(true));
  }, [bookingId]);

  // Broadcast local mic/camera presence so the other participant's
  // "Participants" panel reflects reality instead of a guess.
  useEffect(() => {
    broadcast({ type: "presence", senderId: currentUserId, presence: { muted: isMuted, videoOn: !isVideoOff } });
  }, [isMuted, isVideoOff, broadcast, currentUserId]);

  // ── Clock tick (driven by server time, not the client's clock) ──
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Floating reactions auto-expire ──
  useEffect(() => {
    if (floatingReactions.length === 0) return;
    const timeout = setTimeout(() => setFloatingReactions((prev) => prev.slice(1)), 2600);
    return () => clearTimeout(timeout);
  }, [floatingReactions]);

  // ── Fullscreen sync ──
  useEffect(() => {
    function onChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // ── Auto-scroll chat ──
  useEffect(() => {
    if (drawerOpenRef.current && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleFullscreen = useCallback(() => {
    if (!mainStageRef.current) return;
    if (!document.fullscreenElement) {
      void mainStageRef.current.requestFullscreen?.();
    } else {
      void document.exitFullscreen();
    }
  }, []);

  // ── Derived session values ──
  const serverNow = now - clockSkew;
  const scheduledStartMs = session ? new Date(session.scheduledStart).getTime() : new Date(startsAt).getTime();
  const scheduledEndMs = session ? new Date(session.scheduledEnd).getTime() : scheduledStartMs + durationMinutes * 60_000;
  const phase: LessonPhase = session?.phase ?? "SCHEDULED";
  const controls: HostControls | null = session?.controls ?? null;

  const elapsedSeconds = Math.max(0, Math.floor((serverNow - scheduledStartMs) / 1000));
  const remainingSeconds = Math.floor((scheduledEndMs - serverNow) / 1000);
  const secondsUntilStart = Math.floor((scheduledStartMs - serverNow) / 1000);
  const timerDisplay = phase === "LIVE" || phase === "ENDING_SOON" ? formatTimer(elapsedSeconds) : secondsUntilStart > 0 ? formatTimer(secondsUntilStart) : "00:00:00";

  const timerStatus = useMemo(() => {
    if (phase === "CANCELLED") return "Leçon annulée";
    if (phase === "COMPLETED") return "Leçon terminée";
    if (secondsUntilStart > 0) {
      const mins = Math.ceil(secondsUntilStart / 60);
      return `Leçon dans ${mins} min`;
    }
    if (phase === "ENDING_SOON") return `${formatDurationLabel(Math.max(0, remainingSeconds))} restantes`;
    if (phase === "LIVE") return "Leçon en cours";
    if (phase === "STARTING") return "Démarrage de la leçon";
    if (phase === "WAITING") return "En attente du démarrage";
    return "Programmée";
  }, [phase, secondsUntilStart, remainingSeconds]);

  // Local participant entry used by the control bar + participants panel.
  const localTile = tiles.find((t) => t.local);
  const remoteTiles = tiles.filter((t) => !t.local);
  const remoteScreenTile = remoteTiles.find((t) => t.screenOn && t.screenTrack);
  const localScreenTile = localTile?.screenOn && localTile.screenTrack ? localTile : undefined;
  const screenTile = remoteScreenTile ?? localScreenTile;
  const stageTile = screenTile ?? remoteTiles[0];

  const canToggleMic = isHost || (controls?.studentMicAllowed ?? true);
  const canToggleCam = isHost || (controls?.studentCameraAllowed ?? true);
  const canScreenShare = isHost || (controls?.studentScreenShareAllowed ?? false);
  const canUseWhiteboard = isHost || (controls?.studentWhiteboardAllowed ?? true);
  const canChat = isHost || (controls?.studentChatEnabled ?? true);
  const canReact = isHost || (controls?.studentReactionsEnabled ?? true);

  const headerPeerName = otherPartyName;
  const headerTitle = isHost ? `Votre leçon avec ${session?.studentName ?? headerPeerName}` : `Votre leçon avec ${session?.teacherName ?? headerPeerName}`;

  // ── Pre-join camera/mic preview + device enumeration ──
  const startPreview = useCallback(async () => {
    if (previewStreamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedCamId ? { deviceId: { exact: selectedCamId } } : true,
        audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
      });
      previewStreamRef.current = stream;
      setPreviewStream(stream);
      setPreviewError(null);
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      setMicEnabled(audioTrack?.enabled ?? true);
      setCamEnabled(videoTrack?.enabled ?? true);
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all);
      const cams = all.filter((d) => d.kind === "videoinput");
      const mics = all.filter((d) => d.kind === "audioinput");
      setSelectedCamId((prev) => prev ?? videoTrack?.getSettings().deviceId ?? cams[0]?.deviceId ?? null);
      setSelectedMicId((prev) => prev ?? audioTrack?.getSettings().deviceId ?? mics[0]?.deviceId ?? null);
    } catch (err) {
      const name = (err as DOMException)?.name;
      if (name === "NotAllowedError") {
        setPreviewError("Accès refusé : autorisez la caméra et le micro dans votre navigateur, puis réessayez.");
      } else if (name === "NotFoundError") {
        setPreviewError("Aucune caméra ou micro détecté sur cet appareil.");
      } else {
        setPreviewError("Impossible d'accéder à la caméra ou au micro.");
      }
    }
  }, [selectedCamId, selectedMicId]);

  useEffect(() => {
    if (hasEnteredRoom) return;
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled) void startPreview();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      // Preview stream is now stopped in DailyRoom after "joined-meeting" to avoid camera flash
      // Don't stop it here when transitioning to hasEnteredRoom=true
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasEnteredRoom]);

  // Cleanup preview stream on unmount (if user leaves without joining)
  useEffect(() => {
    return () => {
      previewStreamRef.current?.getTracks().forEach((t) => t.stop());
      previewStreamRef.current = null;
      setPreviewStream(null);
    };
  }, []);

  const togglePreviewMic = () => {
    const track = previewStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicEnabled(track.enabled);
  };

  const togglePreviewCam = () => {
    const track = previewStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamEnabled(track.enabled);
  };

  const switchPreviewDevice = async (kind: "videoinput" | "audioinput", deviceId: string) => {
    if (kind === "videoinput") setSelectedCamId(deviceId);
    else setSelectedMicId(deviceId);
    // Re-acquire the preview stream with the newly chosen device.
    previewStreamRef.current?.getTracks().forEach((t) => t.stop());
    previewStreamRef.current = null;
    setPreviewStream(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: kind === "videoinput" ? { deviceId: { exact: deviceId } } : camEnabled,
        audio: kind === "audioinput" ? { deviceId: { exact: deviceId } } : micEnabled,
      });
      previewStreamRef.current = stream;
      setPreviewStream(stream);
      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];
      if (audioTrack) audioTrack.enabled = micEnabled;
      if (videoTrack) videoTrack.enabled = camEnabled;
    } catch {
      setPreviewError("Impossible d'activer ce périphérique.");
    }
  };

  // ── Join: freeze the token and enter the room ──
  const enterRoom = () => {
    if (!session?.joinToken || !session?.roomUrl) return;
    setJoinInfo({ roomUrl: session.roomUrl, token: session.joinToken });
    setHasEnteredRoom(true);
    // Preview stream is now stopped in DailyRoom after "joined-meeting" to avoid camera flash
  };

  const openDrawer = (tab: "chat" | "participants" | "notes" | "resources" | "settings") => {
    setActiveSideTab(tab);
    setDrawerOpen(true);
    if (tab === "chat") setUnreadCount(0);
  };

  // ── Leave / quit ──
  const leaveRoom = useCallback(async (reason: "LEFT" | "ENDED" = "LEFT") => {
    try {
      await fetch(`/api/classroom/${bookingId}/session/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
        keepalive: true,
      });
    } catch {
      // best-effort — the sendBeacon in DailyRoom covers the unload case
    }
  }, [bookingId]);

  const quitClassroom = async () => {
    dailyRef.current?.leave();
    await leaveRoom("LEFT");
    router.push("/dashboard");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      showToast("Seules les images et les PDF peuvent être joints au tchat.", "error");
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
      showToast("L'envoi de la pièce jointe a échoué.", "error");
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
      if (!res.ok) {
        showToast(data.error || "Message non envoyé.", "error");
        return;
      }
      setMessages((prev) => [...prev, data.message]);
      broadcast({ type: "chat_message", message: data.message });
    } catch {
      showToast("Message non envoyé : vérifiez votre connexion.", "error");
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

  // ── Reactions & raise hand ──
  const sendReaction = (emoji: Reaction) => {
    if (!canReact) return;
    setShowReactionsPicker(false);
    setFloatingReactions((prev) => [...prev.slice(-4), { id: Date.now() + Math.random(), emoji, name: "Vous" }]);
    broadcast({ type: "reaction", senderId: currentUserId, senderName: currentUserName, emoji });
  };

  const toggleHand = () => {
    const next = !localHandRaised;
    setLocalHandRaised(next);
    broadcast({ type: "hand", senderId: currentUserId, senderName: currentUserName, raised: next });
    if (next) showToast("Main levée — l'enseignant est notifié.", "info");
  };

  // ── Host actions ──
  const hostAction = async (body: Record<string, unknown>, successMessage?: string) => {
    try {
      const res = await fetch(`/api/classroom/${bookingId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Action refusée.", "error");
        return false;
      }
      if (successMessage) showToast(successMessage, "success");
      return true;
    } catch {
      showToast("Action impossible : vérifiez votre connexion.", "error");
      return false;
    }
  };

  const updateControls = async (patch: Partial<HostControls>) => {
    try {
      const res = await fetch(`/api/classroom/${bookingId}/session`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Réglage refusé.", "error");
        return false;
      }
      return true;
    } catch {
      showToast("Réglage impossible : vérifiez votre connexion.", "error");
      return false;
    }
  };

  const endForEveryone = () => {
    setConfirmDialog({
      title: "Terminer la leçon pour tous",
      message: "La leçon sera marquée terminée et les participants seront invités à quitter. Cette action ferme la classe.",
      confirmLabel: "Terminer pour tous",
      onConfirm: async () => {
        setConfirmDialog(null);
        await hostAction({ action: "END_FOR_ALL" }, "Leçon terminée.");
        await leaveRoom("ENDED");
        router.push("/dashboard");
      },
    });
  };

  const toggleRecording = async () => {
    if (!session?.videoConfigured) {
      showToast("L'enregistrement n'est pas disponible : le service vidéo n'est pas configuré.", "error");
      return;
    }
    const action = recordingStatus === "RECORDING" ? "STOP" : "START";
    try {
      const res = await fetch(`/api/classroom/${bookingId}/recording`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Enregistrement impossible.", "error");
        return;
      }
      setRecordingStatus(data.recordingStatus ?? (action === "START" ? "RECORDING" : "PROCESSING"));
      showToast(action === "START" ? "Enregistrement démarré." : "Enregistrement arrêté.", "success");
    } catch {
      showToast("Enregistrement impossible : vérifiez votre connexion.", "error");
    }
  };

  // ── Presentation (teacher resources) ──
  const handleResourceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      showToast("Seuls les PDF et les images peuvent être présentés.", "error");
      return;
    }

    setUploadingResource(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", isPdf ? "pdf" : "image");
      const response = await fetch("/api/uploads/video", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Envoi impossible.");

      const res = await fetch(`/api/classroom/${bookingId}/resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: data.url, fileName: file.name, mimeType: file.type, sizeBytes: file.size, pageCount: 1 }),
      });
      const created = await res.json();
      if (!res.ok) throw new Error(created.error || "Partage impossible.");
      setResources((prev) => [created.resource, ...prev.map((r) => ({ ...r, isPresenting: false }))]);
      setPresentedResource(created.resource);
      setPresentationPage(1);
      setActiveTab("presentation");
      showToast("Document partagé avec la classe.", "success");
    } catch (err) {
      showToast((err as Error).message || "Le partage du document a échoué.", "error");
    } finally {
      setUploadingResource(false);
      if (resourceInputRef.current) resourceInputRef.current.value = "";
    }
  };

  const presentResource = async (resource: ClassroomResourceRow) => {
    setPresentedResource(resource);
    setPresentationPage(resource.page || 1);
    setActiveTab("presentation");
    await fetch(`/api/classroom/${bookingId}/resources`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceId: resource.id, page: resource.page || 1 }),
    }).catch(() => {});
  };

  const stopPresenting = async () => {
    setPresentedResource(null);
    setActiveTab("video");
    await fetch(`/api/classroom/${bookingId}/resources`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stop: true }),
    }).catch(() => {});
  };

  const changePresentationPage = async (page: number) => {
    if (!presentedResource) return;
    const clamped = Math.min(Math.max(1, page), presentedResource.pageCount || 1);
    setPresentationPage(clamped);
    await fetch(`/api/classroom/${bookingId}/resources`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceId: presentedResource.id, page: clamped }),
    }).catch(() => {});
  };

  // ── Waiting-room admission (host) ──
  const admit = async (userId: string) => {
    await hostAction({ action: "ADMIT", userId }, "Participant admis.");
  };
  const removeParticipant = async (userId: string, displayName: string) => {
    setConfirmDialog({
      title: `Retirer ${displayName} ?`,
      message: "Ce participant sera retiré de la classe et ne pourra pas revenir sans être admis à nouveau.",
      confirmLabel: "Retirer",
      onConfirm: async () => {
        setConfirmDialog(null);
        await hostAction({ action: "REMOVE", userId }, "Participant retiré.");
      },
    });
  };
  const admitAll = async () => {
    await hostAction({ action: "ADMIT_ALL" }, "Tous les participants en attente ont été admis.");
  };

  const toggleStudentPermission = async (key: "studentScreenShareAllowed" | "studentWhiteboardAllowed" | "studentChatEnabled" | "studentReactionsEnabled" | "studentCameraAllowed" | "studentMicAllowed") => {
    if (!session) return;
    const next = !session.controls[key];
    if (await updateControls({ [key]: next })) {
      showToast("Permission mise à jour.", "success");
    }
  };

  // ── Participants roster shown in the panel: merges Daily's live media state
  // with the server roster (roles, host flags, hands) so both are accurate.
  const roster = useMemo(() => {
    const byId = new Map(participants.map((p) => [p.userId, p]));

    const rows: {
      userId: string;
      name: string;
      role: string;
      isSelf: boolean;
      micOn: boolean;
      camOn: boolean;
      micBlocked: boolean;
      cameraBlocked: boolean;
      handRaised: boolean;
      admission?: string;
      inCall: boolean;
      quality: ConnectionQuality;
    }[] = [];

    for (const tile of tiles) {
      const row = tile.ownerId ? byId.get(tile.ownerId) : undefined;
      rows.push({
        userId: tile.ownerId ?? tile.sessionId,
        name: tile.local ? `${currentUserName} (Vous)` : tile.userName,
        role: row?.role ?? (tile.local ? currentUserRole.toUpperCase() : "STUDENT"),
        isSelf: tile.local,
        micOn: tile.audioOn,
        camOn: tile.videoOn,
        micBlocked: row?.micBlocked ?? false,
        cameraBlocked: row?.cameraBlocked ?? false,
        handRaised: Boolean(raisedHands[tile.ownerId ?? ""] ?? (tile.local && localHandRaised)),
        admission: row?.admission,
        inCall: true,
        quality: tile.connectionQuality,
      });
    }
    for (const p of participants) {
      if (rows.some((r) => r.userId === p.userId)) continue;
      rows.push({
        userId: p.userId,
        name: p.userId === currentUserId ? `${p.displayName} (Vous)` : p.displayName,
        role: p.role,
        isSelf: p.userId === currentUserId,
        micOn: p.userId === currentUserId ? !isMuted : otherPresence.muted ? false : false,
        camOn: p.userId === currentUserId ? !isVideoOff : otherPresence.videoOn,
        micBlocked: p.micBlocked ?? false,
        cameraBlocked: p.cameraBlocked ?? false,
        handRaised: Boolean(raisedHands[p.userId]),
        admission: p.admission,
        inCall: false,
        quality: "UNKNOWN",
      });
    }
    return rows;
  }, [participants, tiles, raisedHands, localHandRaised, currentUserId, currentUserName, currentUserRole, isMuted, isVideoOff, otherPresence]);

  const waitingCount = waitingQueue.length;

  // ── Keyboard shortcuts (ignored while typing in an input) ──
  useEffect(() => {
    if (!hasEnteredRoom) return;
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key.toLowerCase()) {
        case "m":
          if (canToggleMic) dailyRef.current?.toggleAudio();
          break;
        case "v":
          if (canToggleCam) dailyRef.current?.toggleVideo();
          break;
        case "h":
          toggleHand();
          break;
        case "c":
          openDrawer("chat");
          break;
        case "p":
          openDrawer("participants");
          break;
        case "f":
          toggleFullscreen();
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasEnteredRoom, canToggleMic, canToggleCam]);
  void toggleHand;

  // Auto-enter once the teacher admits a waiting student.
  const [joinIntent, setJoinIntent] = useState(false);
  useEffect(() => {
    if (!joinIntent || hasEnteredRoom || !session) return;
    if (session.canJoin && !session.needsAdmission && !session.removed && !session.lockedOut && session.joinToken) {
      const timeout = window.setTimeout(() => enterRoom(), 0);
      return () => window.clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinIntent, hasEnteredRoom, session?.canJoin, session?.needsAdmission, session?.removed, session?.lockedOut, session?.joinToken]);

  const camDevices = devices.filter((d) => d.kind === "videoinput");
  const micDevices = devices.filter((d) => d.kind === "audioinput");

  // Loading state while session data is being fetched
  if (session === null && !sessionError) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#0c1626] via-[#101b2d] to-[#0a0f1a] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-3xl">
          <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/[.04] p-4 sm:p-6 shadow-2xl sm:grid-cols-[1.2fr_1fr]">
            <div className="flex flex-col items-center justify-center aspect-video rounded-2xl border border-white/10 bg-[#0c1626]">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#72d6bf] border-t-transparent" />
              <p className="mt-3 text-sm text-slate-300">Chargement de la séance…</p>
            </div>
            <div className="flex flex-col items-center justify-center gap-4 p-6 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#72d6bf] border-t-transparent" />
              <p className="text-sm text-slate-300">Préparation de la classe…</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Blocking access errors get a dedicated screen (never a raw message).
  if (sessionError) {
    const titles: Record<string, { title: string; message: string }> = {
      UNAUTHORIZED: { title: "Accès refusé", message: "Vous ne faites pas partie de cette séance." },
      NOT_FOUND: { title: "Séance introuvable", message: "Cette réservation n'existe pas ou a été supprimée." },
      CANCELLED: { title: "Séance annulée", message: "Cette séance a été annulée. La classe n'est plus accessible." },
      PAYMENT_NOT_CONFIRMED: { title: "Paiement non confirmé", message: "La classe sera accessible dès que le paiement de la séance sera confirmé." },
      BOOKING_NOT_CONFIRMED: { title: "Réservation en attente", message: "Le professeur n'a pas encore confirmé cette séance." },
      NETWORK: { title: "Connexion perdue", message: "Impossible de joindre le serveur. Vérifiez votre connexion et réessayez." },
    };
    const screen = titles[sessionError.code] ?? { title: "Erreur", message: sessionError.message };
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#101b2d] px-6 text-center text-white">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15">
            <IconShield className="h-6 w-6 text-rose-300" />
          </div>
          <h1 className="text-xl font-bold">{screen.title}</h1>
          <p className="mt-2 text-sm text-slate-300">{screen.message}</p>
          <button onClick={() => window.location.reload()} className="mt-6 inline-flex rounded-2xl bg-[#0d8d78] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0b7866]">
            Réessayer
          </button>
        </div>
      </main>
    );
  }

  if (!hasEnteredRoom) {
    const waitingForAdmission = Boolean(session?.needsAdmission) && joinIntent;
    const joinDisabled = !session?.canJoin || !session?.joinToken || !session?.videoConfigured;

    return (
      <main className="min-h-screen bg-gradient-to-b from-[#0c1626] via-[#101b2d] to-[#0a0f1a] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-3xl">
          <div className="mb-5 text-center">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.3em] text-[#72d6bf]">ProfySpace</p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold">Classe virtuelle</h1>
          </div>

          <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/[.04] p-4 sm:p-6 shadow-2xl sm:grid-cols-[1.2fr_1fr]">
            {/* Camera preview + toggles */}
            <div className="flex flex-col gap-3">
              <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#0c1626]">
                {previewStream ? (
                  <video
                    ref={(node) => {
                      previewVideoRef.current = node;
                      if (node && previewStream) node.srcObject = previewStream;
                    }}
                    autoPlay
                    playsInline
                    muted
                    className={`h-full w-full object-cover ${camEnabled ? "" : "hidden"}`}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 p-6 text-center">
                    {previewError ? (
                      <>
                        <IconCameraOff className="h-8 w-8 text-rose-400" />
                        <p className="max-w-xs text-xs text-slate-300">{previewError}</p>
                        <button onClick={() => void startPreview()} className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold hover:bg-white/20">
                          Réessayer
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#72d6bf] border-t-transparent" />
                        <p className="text-xs text-slate-400">Activation de la caméra...</p>
                      </>
                    )}
                  </div>
                )}
                {previewStream && !camEnabled && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0c1626]">
                    <IconCameraOff className="h-8 w-8 text-slate-400" />
                    <p className="text-xs text-slate-400">Caméra coupée</p>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-2 py-1 text-[11px] font-semibold backdrop-blur-sm">
                  {currentUserName} (Vous)
                </div>
              </div>
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={togglePreviewMic}
                  aria-label={micEnabled ? "Couper le micro" : "Activer le micro"}
                  className={`rounded-xl p-3 transition ${micEnabled ? "bg-white/10 hover:bg-white/20" : "bg-rose-500/20 text-rose-300"}`}
                >
                  {micEnabled ? <IconMicrophone className="h-5 w-5" /> : <IconMicrophoneOff className="h-5 w-5" />}
                </button>
                <button
                  type="button"
                  onClick={togglePreviewCam}
                  aria-label={camEnabled ? "Couper la caméra" : "Activer la caméra"}
                  className={`rounded-xl p-3 transition ${camEnabled ? "bg-white/10 hover:bg-white/20" : "bg-rose-500/20 text-rose-300"}`}
                >
                  {camEnabled ? <IconCamera className="h-5 w-5" /> : <IconCameraOff className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Session info + devices + join */}
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400">{isHost ? "Élève" : "Enseignant"}</span>
                  <span className="truncate font-bold">{headerPeerName}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400">Horaire</span>
                  <span className="font-bold">
                    {new Date(startsAt).toLocaleString("fr-TN", { dateStyle: "medium", timeStyle: "short" })} · {durationMinutes} min
                  </span>
                </div>
                {session?.subject && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400">Matière</span>
                    <span className="truncate font-bold">{session.subject}</span>
                  </div>
                )}
              </div>

              {/* Device selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400">Caméra</label>
                <select
                  value={selectedCamId ?? ""}
                  onChange={(e) => void switchPreviewDevice("videoinput", e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs outline-none focus:border-[#72d6bf]"
                >
                  {camDevices.length === 0 && <option value="">Caméra par défaut</option>}
                  {camDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId} className="text-black">
                      {d.label || "Caméra"}
                    </option>
                  ))}
                </select>
                <label className="block text-xs font-bold text-slate-400">Microphone</label>
                <select
                  value={selectedMicId ?? ""}
                  onChange={(e) => void switchPreviewDevice("audioinput", e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs outline-none focus:border-[#72d6bf]"
                >
                  {micDevices.length === 0 && <option value="">Micro par défaut</option>}
                  {micDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId} className="text-black">
                      {d.label || "Micro"}
                    </option>
                  ))}
                </select>
              </div>

              {session && !session.videoConfigured && (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200">
                  Le service vidéo n'est pas encore configuré pour cette salle. Revenez plus tard.
                </p>
              )}
              {session?.lockedOut && (
                <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200">
                  La classe est verrouillée par l'enseignant.
                </p>
              )}
              {session?.removed && (
                <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200">
                  Vous avez été retiré de cette classe.
                </p>
              )}
              {sessionError?.code === "NETWORK" && (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200">{sessionError.message}</p>
              )}

              <div className="mt-auto flex flex-col gap-2">
                <button
                  onClick={() => {
                    setJoinIntent(true);
                    if (!session?.needsAdmission) enterRoom();
                  }}
                  disabled={joinDisabled || Boolean(session?.removed) || Boolean(session?.lockedOut)}
                  className="w-full rounded-2xl bg-[#72d6bf] px-6 py-3.5 font-bold text-[#101b2d] transition hover:bg-[#5ec4ad] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {waitingForAdmission ? "En attente d'admission..." : session?.needsAdmission ? "Demander à entrer" : "Rejoindre la classe"}
                </button>
                <Link href="/dashboard" className="block text-center text-xs text-slate-400 hover:text-white transition">
                  Retour au tableau de bord
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Waiting room overlay */}
        {waitingForAdmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0f1a]/95 p-4">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#101b2d] p-8 text-center shadow-2xl">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15">
                <IconClock className="h-7 w-7 text-amber-300" />
              </div>
              <h2 className="text-lg font-bold">En attente de votre enseignant</h2>
              <p className="mt-2 text-sm text-slate-300">Votre enseignant doit vous autoriser à entrer dans la classe.</p>
              <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-3 text-xs text-slate-300">
                <p className="font-bold text-white">{session?.teacherName ?? headerPeerName}</p>
                <p className="mt-1">{session?.subject ?? "Cours particulier"}</p>
                <p className="mt-1">{new Date(startsAt).toLocaleString("fr-TN", { dateStyle: "medium", timeStyle: "short" })}</p>
                <p className="mt-1 font-semibold text-[#72d6bf]">{timerStatus}</p>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                {micEnabled ? <IconMicrophone className="h-4 w-4 text-emerald-300" /> : <IconMicrophoneOff className="h-4 w-4 text-rose-300" />}
                {camEnabled ? <IconCamera className="h-4 w-4 text-emerald-300" /> : <IconCameraOff className="h-4 w-4 text-rose-300" />}
                <span>Caméra et micro prêts</span>
              </div>
              <button onClick={() => setJoinIntent(false)} className="mt-5 rounded-2xl bg-white/10 px-5 py-2.5 text-sm font-bold hover:bg-white/20">
                Annuler
              </button>
            </div>
          </div>
        )}
      </main>
    );
  }


  const qualityBadge = (
    <span className={`flex items-center gap-1 text-[11px] font-bold ${qualityColor(connectionStatus === "reconnecting" ? "RECONNECTING" : connectionQuality)}`} title={`Connexion : ${qualityLabel(connectionStatus === "reconnecting" ? "RECONNECTING" : connectionQuality)}`}>
      <IconWifi className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{qualityLabel(connectionStatus === "reconnecting" ? "RECONNECTING" : connectionQuality)}</span>
    </span>
  );

  return (
    <main ref={mainStageRef} className="flex h-screen flex-col overflow-hidden bg-[#0a0f1a] text-white">
      {/* ── Top information bar ── */}
      <header className="z-20 flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#0c1626]/95 px-3 py-2 backdrop-blur sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/10 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-white/20"
            title="Quitter la classe"
          >
            ← <span className="hidden md:inline">Quitter</span>
          </Link>
          <div className="min-w-0">
            <p className="hidden text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#72d6bf] lg:block">ProfySpace</p>
            <p className="truncate text-sm font-bold">{headerTitle}</p>
          </div>
          {session?.subject && <span className="hidden shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-slate-300 xl:block">{session.subject}</span>}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <span className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold sm:flex ${phaseColor(phase)}`}>
            {(phase === "LIVE" || phase === "ENDING_SOON") && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
            {phaseLabelText(phase).toUpperCase()}
          </span>
          <div
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 font-mono text-xs font-bold ${
              phase === "ENDING_SOON" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-white/10 bg-white/10 text-slate-200"
            }`}
            title={`${timerStatus} · Durée prévue : ${durationMinutes} min`}
          >
            <IconClock className="h-3.5 w-3.5 text-[#72d6bf]" />
            <span>{timerDisplay}</span>
          </div>
          {qualityBadge}
          <button
            type="button"
            onClick={() => openDrawer("participants")}
            className="relative flex items-center gap-1.5 rounded-xl bg-white/10 px-2.5 py-1.5 text-xs font-bold text-slate-200 transition hover:bg-white/20"
            title="Participants"
          >
            <IconUsers className="h-3.5 w-3.5" />
            {roster.length}
            {isHost && waitingCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-0.5 text-[9px] font-extrabold text-black">{waitingCount}</span>}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="hidden rounded-xl bg-white/10 p-2 text-white transition hover:bg-white/20 sm:block"
            title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
            aria-label={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
          >
            {isFullscreen ? <IconFullscreenExit className="h-4 w-4" /> : <IconFullscreen className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* ── Main stage ── */}
      <div className="relative flex-1 overflow-hidden p-2 sm:p-3">
        {/* Video stage — always mounted so switching tabs never drops the call. */}
        <div className={activeTab === "video" ? "absolute inset-0 flex flex-col p-2 sm:p-3" : "hidden"}>
          <DailyRoom
            ref={dailyRef}
            bookingId={bookingId}
            currentUserName={currentUserName}
            canScreenShare={canScreenShare}
            joinToken={joinInfo?.token ?? null}
            roomUrl={joinInfo?.roomUrl ?? null}
            initialAudioOn={micEnabled}
            initialVideoOn={camEnabled}
            previewStream={previewStream}
            onJoined={() => {
              void fetch(`/api/classroom/${bookingId}/session/join`, { method: "POST" }).catch(() => {});
            }}
            onStatusChange={setConnectionStatus}
            onTilesChange={setTiles}
            onLocalAudioChange={(on) => setIsMuted(!on)}
            onLocalVideoChange={(on) => setIsVideoOff(!on)}
            onScreenShareChange={setIsScreenSharing}
            onConnectionQualityChange={setConnectionQuality}
            onError={(msg) => showToast(msg, "error")}
          />

          {connectionStatus === "connected" && (
            <div className="absolute inset-0 top-0 flex flex-col p-2 sm:p-3">
              {/* Presentation / screen-share banner */}
              {screenTile && (
                <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-lg bg-black/70 px-3 py-1.5 text-[11px] font-bold backdrop-blur-sm">
                  {screenTile.local ? "Vous partagez votre écran" : `${screenTile.userName} présente son écran`}
                </div>
              )}

              <div className="flex flex-1 gap-2 overflow-hidden">
                {/* Main tile */}
                <div className="relative min-w-0 flex-1">
                  {stageTile ? (
                    <VideoTile tile={stageTile} className="h-full w-full" fit={screenTile ? "contain" : "cover"} showQuality isSpeaking={(stageTile.audioLevel ?? 0) > 0.08} />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl bg-[#0c1626] text-center">
                      <IconVideo className="h-8 w-8 text-slate-500" />
                      <p className="text-sm text-slate-400">En attente que {headerPeerName.split(" ")[0]} rejoigne la classe...</p>
                    </div>
                  )}
                  {screenTile && localTile && !localScreenTile && (
                    <div className="absolute bottom-3 right-3 h-24 w-32 shadow-2xl sm:h-28 sm:w-40">
                      <VideoTile tile={localTile} className="h-full w-full ring-2 ring-white/10" />
                    </div>
                  )}
                </div>

                {/* Filmstrip: remote tiles when someone is presenting */}
                {screenTile && remoteTiles.filter((t) => t !== screenTile).length > 0 && (
                  <div className="hidden w-40 flex-col gap-2 overflow-y-auto md:flex">
                    {remoteTiles
                      .filter((t) => t !== screenTile)
                      .map((t) => (
                        <VideoTile key={t.sessionId} tile={t} className="aspect-video w-full shrink-0" />
                      ))}
                  </div>
                )}
              </div>

              {/* Grid view when no screen share and multiple participants */}
              {!screenTile && remoteTiles.length > 1 && (
                <div className="absolute inset-0 top-0 grid grid-cols-2 gap-2 p-2 sm:gap-3 sm:p-3">
                  {tiles.map((t) => (
                    <VideoTile key={t.sessionId} tile={t} className="h-full w-full" showQuality isSpeaking={(t.audioLevel ?? 0) > 0.08} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Whiteboard tab — hidden, not unmounted, so the drawing survives */}
        <div className={activeTab === "whiteboard" ? "absolute inset-0 flex flex-col p-2 sm:p-3" : "hidden"}>
          {canUseWhiteboard ? (
            <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/10">
              <InteractiveWhiteboard
                ref={whiteboardRef}
                onLocalUpdate={(pageIndex, dataUrl) => broadcast({ type: "whiteboard_update", pageIndex, dataUrl })}
              />
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] text-center">
              <IconEdit className="h-8 w-8 text-slate-500" />
              <p className="text-sm text-slate-400">Le tableau blanc est réservé à l'enseignant pour le moment.</p>
            </div>
          )}
        </div>

        {/* Presentation tab — teacher-shared PDF/images */}
        <div className={activeTab === "presentation" ? "absolute inset-0 flex flex-col p-2 sm:p-3" : "hidden"}>
          {presentedResource ? (
            <div className="flex flex-1 flex-col gap-2 overflow-hidden rounded-2xl border border-white/10 bg-[#0c1626]">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
                <p className="min-w-0 truncate text-xs font-bold">{presentedResource.fileName}</p>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => void changePresentationPage(presentationPage - 1)} disabled={presentationPage <= 1} className="rounded-lg bg-white/10 p-1.5 disabled:opacity-40 hover:bg-white/20" aria-label="Page précédente">
                    <IconChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="min-w-10 text-center text-[11px] font-bold text-slate-300">{presentationPage} / {presentedResource.pageCount || 1}</span>
                  <button type="button" onClick={() => void changePresentationPage(presentationPage + 1)} disabled={presentationPage >= (presentedResource.pageCount || 1)} className="rounded-lg bg-white/10 p-1.5 disabled:opacity-40 hover:bg-white/20" aria-label="Page suivante">
                    <IconChevronRight className="h-4 w-4" />
                  </button>
                  <a href={presentedResource.url} target="_blank" rel="noreferrer" className="rounded-lg bg-white/10 p-1.5 hover:bg-white/20" title="Ouvrir en plein écran" aria-label="Ouvrir en plein écran">
                    <IconFullscreen className="h-4 w-4" />
                  </a>
                  <button type="button" onClick={() => void stopPresenting()} className="rounded-lg bg-rose-500/20 p-1.5 text-rose-200 hover:bg-rose-500/30" title="Fermer la présentation" aria-label="Fermer la présentation">
                    <IconX className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-1 items-center justify-center overflow-auto p-3">
                {presentedResource.kind === "PDF" ? (
                  <iframe src={presentedResource.url} title={presentedResource.fileName} className="h-full w-full rounded-xl bg-white" />
                ) : (
                  <img src={presentedResource.url} alt={presentedResource.fileName} className="max-h-full max-w-full rounded-xl object-contain" />
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] text-center">
              <IconPresentation className="h-8 w-8 text-slate-500" />
              <p className="text-sm text-slate-400">Aucun document partagé pour l'instant.</p>
              {isHost && (
                <button onClick={() => openDrawer("resources")} className="rounded-xl bg-[#0d8d78] px-4 py-2 text-xs font-bold hover:bg-[#0b7866]">
                  Partager un document
                </button>
              )}
            </div>
          )}
        </div>

        {/* Floating reactions (own + received) */}
        {floatingReactions.length > 0 && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-1">
            {floatingReactions.map((r) => (
              <span key={r.id} className="animate-bounce rounded-full bg-black/50 px-3 py-1 text-2xl backdrop-blur-sm">
                {r.emoji}
                <span className="ml-1 align-middle text-[10px] font-bold text-white">{r.name}</span>
              </span>
            ))}
          </div>
        )}

        {/* Recording indicator (everyone sees it when active) */}
        {recordingStatus === "RECORDING" && (
          <div className="pointer-events-none absolute right-3 top-2 z-20 flex items-center gap-1.5 rounded-full bg-rose-500/90 px-3 py-1 text-[10px] font-extrabold text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            ENREGISTREMENT
          </div>
        )}

        {/* Raised-hands banner for the teacher */}
        {isHost && Object.keys(raisedHands).length > 0 && (
          <button
            type="button"
            onClick={() => openDrawer("participants")}
            className="absolute left-3 top-2 z-20 flex items-center gap-1.5 rounded-full bg-amber-500/90 px-3 py-1 text-[11px] font-extrabold text-black shadow"
          >
            <IconHand className="h-3.5 w-3.5" />
            {Object.keys(raisedHands).length} main{Object.keys(raisedHands).length > 1 ? "s" : ""} levée{Object.keys(raisedHands).length > 1 ? "s" : ""}
          </button>
        )}
      </div>

        {/* Slide-in side panel — chat / participants / notes / resources / settings */}
        {drawerOpen && (
          <div className="absolute inset-0 z-30 flex justify-end bg-black/40" onClick={() => setDrawerOpen(false)}>
            <aside
              onClick={(e) => e.stopPropagation()}
              role="complementary"
              aria-label="Panneau de la classe"
              className="flex h-full w-full flex-col border-l border-white/10 bg-[#101b2d] shadow-2xl sm:w-[380px]"
            >
              <div className="flex items-center overflow-x-auto border-b border-white/10">
                {([
                  { key: "chat" as const, label: "Chat", icon: IconMessageSquare, badge: unreadCount },
                  { key: "participants" as const, label: "Participants", icon: IconUsers, badge: waitingCount },
                  { key: "notes" as const, label: "Notes", icon: IconFileText, badge: 0 },
                  { key: "resources" as const, label: "Documents", icon: IconFileText, badge: 0 },
                  { key: "settings" as const, label: "Réglages", icon: IconSettings, badge: 0 },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => openDrawer(tab.key)}
                    aria-current={activeSideTab === tab.key}
                    className={`relative flex flex-1 items-center justify-center gap-1 whitespace-nowrap px-2 py-3 text-xs font-bold transition ${
                      activeSideTab === tab.key ? "border-b-2 border-[#72d6bf] text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{tab.label}</span>
                    {tab.badge > 0 && (
                      <span className="absolute right-1 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-extrabold text-white">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
                <button type="button" onClick={() => setDrawerOpen(false)} className="px-3 text-slate-400 hover:text-white" title="Fermer" aria-label="Fermer le panneau">
                  <IconX className="h-4 w-4" />
                </button>
              </div>

              {activeSideTab === "chat" && (
                <>
                  {!canChat ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
                      <IconMessageSquare className="h-8 w-8 text-slate-500" />
                      <p className="text-sm text-slate-400">Le tchat est désactivé par l'enseignant.</p>
                    </div>
                  ) : (
                    <>
                      <div ref={chatScrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-xs">
                        {messagesLoaded && messages.length === 0 && (
                          <p className="py-8 text-center text-slate-400">Aucun message pour le moment. Dites bonjour à {otherPartyName.split(" ")[0]} !</p>
                        )}
                        {messages.map((item) => {
                          const isMe = item.senderId === currentUserId;
                          const isSystem = item.kind === "SYSTEM" || item.senderId === "system";
                          const isImageAttachment = item.attachmentName ? IMAGE_EXTENSIONS.test(item.attachmentName) : false;
                          if (isSystem) {
                            return (
                              <p key={item.id} className="py-1 text-center text-[10px] font-semibold text-slate-400">
                                {item.text}
                              </p>
                            );
                          }
                          return (
                            <div key={item.id} className={isMe ? "text-right" : "text-left"}>
                              <p className="mb-0.5 text-[10px] text-slate-400">
                                {isMe ? "Vous" : item.senderName} · {formatTime(item.createdAt)}
                              </p>
                              <div className={`inline-block max-w-[90%] rounded-2xl p-3.5 text-left ${isMe ? "bg-[#0d8d78] font-medium text-white" : "bg-white/10 text-white"}`}>
                                {item.text && <p className="whitespace-pre-wrap leading-relaxed">{item.text}</p>}
                                {item.attachmentUrl && isImageAttachment && (
                                  <div className="mt-2">
                                    <img
                                      src={item.attachmentUrl}
                                      alt={item.attachmentName || "Pièce jointe"}
                                      onClick={() => setPreviewImage(item.attachmentUrl || null)}
                                      className="max-h-48 cursor-pointer rounded-xl border border-white/20 object-cover transition hover:opacity-90"
                                    />
                                    <span className="mt-1 block text-[10px] opacity-75">{item.attachmentName}</span>
                                  </div>
                                )}
                                {item.attachmentUrl && !isImageAttachment && (
                                  <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-white/20 bg-black/30 p-2.5">
                                    <div className="flex min-w-0 items-center gap-2 truncate">
                                      <IconFileText className="h-4 w-4 shrink-0 text-[#72d6bf]" />
                                      <p className="truncate text-[11px] font-bold">{item.attachmentName}</p>
                                    </div>
                                    <a
                                      href={item.attachmentUrl}
                                      download={item.attachmentName || undefined}
                                      className="rounded-lg bg-white/20 p-1.5 text-white hover:bg-white/30"
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
                        <div className="mx-4 mb-2 flex items-center justify-between gap-2 rounded-xl border border-white/20 bg-white/10 p-2 text-xs">
                          <div className="flex min-w-0 items-center gap-2 truncate">
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
                            className="px-1 text-xs font-bold text-rose-300 hover:text-rose-100"
                            aria-label="Retirer la pièce jointe"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      <form onSubmit={send} className="flex items-center gap-2 border-t border-white/10 p-3">
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,.pdf" className="hidden" />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          title="Joindre une image ou un PDF"
                          aria-label="Joindre une image ou un PDF"
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
                          aria-label="Message"
                          className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-xs text-white outline-none placeholder-slate-400 focus:border-[#72d6bf]"
                        />
                        <button
                          type="submit"
                          className="rounded-xl bg-[#72d6bf] p-2.5 text-[#101b2d] transition hover:bg-[#5ec4ad]"
                          title="Envoyer"
                          aria-label="Envoyer"
                        >
                          <IconSend className="h-4 w-4" />
                        </button>
                      </form>
                    </>
                  )}
                </>
              )}

              {activeSideTab === "notes" && (
                <div className="flex flex-1 flex-col px-4 py-4">
                  <div className="flex-1 space-y-3 overflow-y-auto">
                    {notes.length === 0 ? (
                      <p className="py-8 text-center text-xs text-slate-400">Aucune note pour le moment</p>
                    ) : (
                      notes.map((note) => (
                        <div key={note.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <p className="text-xs leading-relaxed text-white">{note.text}</p>
                          <p className="mt-1 text-[10px] text-slate-400">
                            {note.authorId === currentUserId ? "Vous" : note.authorName} · {formatTime(note.createdAt)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  <form onSubmit={addNote} className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
                    <input
                      type="text"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Ajouter une note partagée..."
                      aria-label="Note partagée"
                      className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-xs text-white outline-none placeholder-slate-400 focus:border-[#72d6bf]"
                    />
                    <button type="submit" className="rounded-xl bg-[#72d6bf] p-2.5 text-[#101b2d] transition hover:bg-[#5ec4ad]" title="Ajouter" aria-label="Ajouter la note">
                      <IconSend className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              )}

              {activeSideTab === "participants" && (
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  {/* Waiting room queue (host only) */}
                  {isHost && (
                    <div className="mb-4">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-300">Salle d'attente {waitingCount > 0 && <span className="text-amber-300">({waitingCount})</span>}</p>
                        {waitingCount > 0 && (
                          <button onClick={() => void admitAll()} className="rounded-lg bg-[#0d8d78] px-2.5 py-1 text-[10px] font-bold text-white hover:bg-[#0b7866]">
                            Tout admettre
                          </button>
                        )}
                      </div>
                      {waitingCount === 0 ? (
                        <p className="rounded-xl bg-white/5 border border-white/10 p-3 text-[11px] text-slate-400">Personne n'attend. {session?.controls.waitingRoomEnabled ? "" : "(Salle d'attente désactivée)"}</p>
                      ) : (
                        <div className="space-y-2">
                          {waitingQueue.map((w) => (
                            <div key={w.userId} className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold">{w.displayName}</p>
                                <p className="text-[10px] text-slate-400">depuis {formatTime(w.createdAt)}</p>
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => void admit(w.userId)} className="rounded-lg bg-emerald-500/20 p-1.5 text-emerald-300 hover:bg-emerald-500/30" title="Admettre" aria-label={`Admettre ${w.displayName}`}>
                                  <IconCheck className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => void removeParticipant(w.userId, w.displayName)} className="rounded-lg bg-rose-500/20 p-1.5 text-rose-300 hover:bg-rose-500/30" title="Refuser" aria-label={`Refuser ${w.displayName}`}>
                                  <IconX className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <p className="mb-2 text-xs font-bold text-slate-300">Dans la classe ({roster.length})</p>
                  <div className="space-y-2.5">
                    {roster.map((participant) => (
                      <div key={participant.userId} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0d8d78] text-sm font-bold text-white">
                              {participant.name.charAt(0).toUpperCase()}
                              {participant.micOn && !participant.isSelf && (
                                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#101b2d] bg-emerald-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 truncate text-xs font-bold">
                                {participant.name}
                                {participant.role === "TEACHER" && <span className="shrink-0 rounded-full bg-[#0d8d78]/25 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-300">ENSEIGNANT</span>}
                                {participant.handRaised && <span title="Main levée" className="shrink-0 text-amber-300"><IconHand className="h-3.5 w-3.5" /></span>}
                              </p>
                              <span className="text-[10px] text-slate-400">
                                {participant.inCall ? qualityLabel(participant.quality) : participant.isSelf ? "Hors appel" : "Hors appel"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`rounded-lg p-1.5 ${participant.micOn && !participant.micBlocked ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`} title={participant.micOn ? "Micro actif" : "Micro coupé"}>
                              {participant.micOn && !participant.micBlocked ? <IconMicrophone className="h-3.5 w-3.5" /> : <IconMicrophoneOff className="h-3.5 w-3.5" />}
                            </span>
                            <span className={`rounded-lg p-1.5 ${participant.camOn && !participant.cameraBlocked ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`} title={participant.camOn ? "Caméra active" : "Caméra coupée"}>
                              {participant.camOn && !participant.cameraBlocked ? <IconVideo className="h-3.5 w-3.5" /> : <IconCameraOff className="h-3.5 w-3.5" />}
                            </span>
                          </div>
                        </div>

                        {/* Host controls — only rendered for the teacher, and every
                            action is re-verified server-side. */}
                        {isHost && !participant.isSelf && (
                          <div className="mt-2 flex flex-wrap gap-1 border-t border-white/10 pt-2">
                            <button
                              onClick={() => void hostAction({ action: participant.micBlocked ? "UNMUTE" : "MUTE", userId: participant.userId }, participant.micBlocked ? "Micro réautorisé." : "Participant coupé.")}
                              className="rounded-lg bg-white/10 px-2 py-1 text-[10px] font-bold hover:bg-white/20"
                            >
                              {participant.micBlocked ? "Réactiver micro" : "Couper micro"}
                            </button>
                            <button
                              onClick={() => void hostAction({ action: participant.cameraBlocked ? "ALLOW_CAMERA" : "BLOCK_CAMERA", userId: participant.userId }, "Caméra mise à jour.")}
                              className="rounded-lg bg-white/10 px-2 py-1 text-[10px] font-bold hover:bg-white/20"
                            >
                              {participant.cameraBlocked ? "Réactiver caméra" : "Couper caméra"}
                            </button>
                            {participant.handRaised && (
                              <button onClick={() => void hostAction({ action: "LOWER_HAND", userId: participant.userId }, "Main baissée.")} className="rounded-lg bg-white/10 px-2 py-1 text-[10px] font-bold hover:bg-white/20">
                                Baisser la main
                              </button>
                            )}
                            <button onClick={() => void removeParticipant(participant.userId, participant.name)} className="rounded-lg bg-rose-500/15 px-2 py-1 text-[10px] font-bold text-rose-300 hover:bg-rose-500/25">
                              Retirer
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Attendance ledger (host) */}
                  {isHost && attendances.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-bold text-slate-300">Présence</p>
                      <div className="space-y-1.5">
                        {attendances.map((a, i) => (
                          <div key={`${a.userId}-${a.joinedAt}-${i}`} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-[10px]">
                            <span className="truncate font-bold">{a.displayName}</span>
                            <span className="text-slate-400">
                              {formatTime(a.joinedAt)} → {a.leftAt ? formatTime(a.leftAt) : "présent"}
                              {a.durationSeconds !== null && ` · ${formatDurationLabel(a.durationSeconds)}`}
                              {a.reconnectCount > 0 && ` · ${a.reconnectCount} reconnexion(s)`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeSideTab === "resources" && (
                <div className="flex flex-1 flex-col px-4 py-4">
                  {isHost && (
                    <div className="mb-3">
                      <input type="file" ref={resourceInputRef} onChange={handleResourceUpload} accept="application/pdf,image/*" className="hidden" />
                      <button
                        onClick={() => resourceInputRef.current?.click()}
                        disabled={uploadingResource}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-3 text-xs font-bold text-slate-200 transition hover:border-[#72d6bf] hover:text-white disabled:opacity-50"
                      >
                        <IconUpload className="h-4 w-4" />
                        {uploadingResource ? "Envoi en cours..." : "Partager un PDF ou une image"}
                      </button>
                      <p className="mt-1 text-center text-[10px] text-slate-500">PDF et images uniquement — les autres formats ne sont pas pris en charge.</p>
                    </div>
                  )}
                  <div className="flex-1 space-y-2 overflow-y-auto">
                    {resources.length === 0 ? (
                      <p className="py-8 text-center text-xs text-slate-400">Aucun document partagé pour le moment.</p>
                    ) : (
                      resources.map((r) => (
                        <div key={r.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5">
                          <div className="flex min-w-0 items-center gap-2">
                            {r.kind === "PDF" ? <IconFileText className="h-4 w-4 shrink-0 text-[#72d6bf]" /> : <IconImage className="h-4 w-4 shrink-0 text-[#72d6bf]" />}
                            <p className="min-w-0 truncate text-xs font-bold">{r.fileName}</p>
                            {r.isPresenting && <span className="shrink-0 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-300">À L'ÉCRAN</span>}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button onClick={() => void presentResource(r)} className="rounded-lg bg-white/10 p-1.5 hover:bg-white/20" title="Présenter" aria-label={`Présenter ${r.fileName}`}>
                              <IconPresentation className="h-3.5 w-3.5" />
                            </button>
                            <a href={r.url} download={r.fileName} className="rounded-lg bg-white/10 p-1.5 hover:bg-white/20" title="Télécharger" aria-label={`Télécharger ${r.fileName}`}>
                              <IconDownload className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeSideTab === "settings" && (
                <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                  {/* Audio */}
                  <section>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-300">
                      <IconMicrophone className="h-3.5 w-3.5 text-[#72d6bf]" /> Audio
                    </p>
                    <div className="space-y-2">
                      <select
                        onChange={(e) => void dailyRef.current?.setAudioDevice(e.target.value)}
                        defaultValue=""
                        className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs outline-none focus:border-[#72d6bf]"
                        aria-label="Microphone"
                      >
                        <option value="">Micro par défaut</option>
                        {devices.filter((d) => d.kind === "audioinput").map((d) => (
                          <option key={d.deviceId} value={d.deviceId} className="text-black">{d.label || "Micro"}</option>
                        ))}
                      </select>
                      <select
                        onChange={(e) => void dailyRef.current?.setSpeakerDevice(e.target.value)}
                        defaultValue=""
                        className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs outline-none focus:border-[#72d6bf]"
                        aria-label="Haut-parleur"
                      >
                        <option value="">Haut-parleur par défaut</option>
                        {devices.filter((d) => d.kind === "audiooutput").map((d) => (
                          <option key={d.deviceId} value={d.deviceId} className="text-black">{d.label || "Haut-parleur"}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button onClick={() => dailyRef.current?.setAudioQuality("high")} className="flex-1 rounded-xl bg-white/10 px-2 py-2 text-[10px] font-bold hover:bg-white/20">Haute qualité</button>
                        <button onClick={() => dailyRef.current?.setAudioQuality("medium")} className="flex-1 rounded-xl bg-white/10 px-2 py-2 text-[10px] font-bold hover:bg-white/20">Équilibrée</button>
                        <button onClick={() => dailyRef.current?.setAudioQuality("low")} className="flex-1 rounded-xl bg-white/10 px-2 py-2 text-[10px] font-bold hover:bg-white/20">Économie</button>
                      </div>
                      <label className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs">
                        Réduction de bruit
                        <input type="checkbox" defaultChecked onChange={(e) => dailyRef.current?.enableNoiseSuppression(e.target.checked)} className="accent-[#72d6bf]" />
                      </label>
                      <label className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs">
                        Annulation d'écho
                        <input type="checkbox" defaultChecked onChange={(e) => dailyRef.current?.enableEchoCancellation(e.target.checked)} className="accent-[#72d6bf]" />
                      </label>
                    </div>
                  </section>

                  {/* Video */}
                  <section>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-300">
                      <IconVideo className="h-3.5 w-3.5 text-[#72d6bf]" /> Vidéo
                    </p>
                    <div className="space-y-2">
                      <select
                        onChange={(e) => void dailyRef.current?.setVideoDevice(e.target.value)}
                        defaultValue=""
                        className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs outline-none focus:border-[#72d6bf]"
                        aria-label="Caméra"
                      >
                        <option value="">Caméra par défaut</option>
                        {devices.filter((d) => d.kind === "videoinput").map((d) => (
                          <option key={d.deviceId} value={d.deviceId} className="text-black">{d.label || "Caméra"}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button onClick={() => dailyRef.current?.setVideoQuality("high")} className="flex-1 rounded-xl bg-white/10 px-2 py-2 text-[10px] font-bold hover:bg-white/20">HD</button>
                        <button onClick={() => dailyRef.current?.setVideoQuality("medium")} className="flex-1 rounded-xl bg-white/10 px-2 py-2 text-[10px] font-bold hover:bg-white/20">Standard</button>
                        <button onClick={() => dailyRef.current?.setVideoQuality("low")} className="flex-1 rounded-xl bg-white/10 px-2 py-2 text-[10px] font-bold hover:bg-white/20">Fluide</button>
                      </div>
                    </div>
                  </section>

                  {/* Host controls */}
                  {isHost && session && (
                    <section>
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-300">
                        <IconShield className="h-3.5 w-3.5 text-[#72d6bf]" /> Contrôles de la classe
                      </p>
                      <div className="space-y-2">
                        <label className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs">
                          Partage d'écran élève
                          <input type="checkbox" checked={session.controls.studentScreenShareAllowed} onChange={() => void toggleStudentPermission("studentScreenShareAllowed")} className="accent-[#72d6bf]" />
                        </label>
                        <label className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs">
                          Tableau blanc élève
                          <input type="checkbox" checked={session.controls.studentWhiteboardAllowed} onChange={() => void toggleStudentPermission("studentWhiteboardAllowed")} className="accent-[#72d6bf]" />
                        </label>
                        <label className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs">
                          Tchat élève
                          <input type="checkbox" checked={session.controls.studentChatEnabled} onChange={() => void toggleStudentPermission("studentChatEnabled")} className="accent-[#72d6bf]" />
                        </label>
                        <label className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs">
                          Réactions élève
                          <input type="checkbox" checked={session.controls.studentReactionsEnabled} onChange={() => void toggleStudentPermission("studentReactionsEnabled")} className="accent-[#72d6bf]" />
                        </label>
                      </div>
                      <div className="mt-3 space-y-2">
                        <button
                          onClick={() => void toggleRecording()}
                          disabled={!session.videoConfigured}
                          className={`w-full rounded-xl px-3 py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            recordingStatus === "RECORDING" ? "bg-rose-500/20 text-rose-200 hover:bg-rose-500/30" : "bg-white/10 hover:bg-white/20"
                          }`}
                        >
                          {recordingStatus === "RECORDING" ? "Arrêter l'enregistrement" : recordingStatus === "PROCESSING" ? "Enregistrement en traitement..." : "Enregistrer la leçon"}
                        </button>
                        {!session.videoConfigured && <p className="text-[10px] text-slate-500">Enregistrement indisponible : service vidéo non configuré.</p>}
                        <button onClick={endForEveryone} className="w-full rounded-xl bg-rose-500 px-3 py-2.5 text-xs font-bold text-white hover:bg-rose-600">
                          Terminer la leçon pour tous
                        </button>
                      </div>
                    </section>
                  )}

                  {/* Accessibility & shortcuts */}
                  <section>
                    <p className="mb-2 text-xs font-bold text-slate-300">Raccourcis clavier</p>
                    <div className="space-y-1 rounded-xl bg-white/5 border border-white/10 p-3 text-[10px] text-slate-400">
                      <p><kbd className="rounded bg-white/10 px-1 font-bold">M</kbd> micro · <kbd className="rounded bg-white/10 px-1 font-bold">V</kbd> caméra</p>
                      <p><kbd className="rounded bg-white/10 px-1 font-bold">H</kbd> main levée · <kbd className="rounded bg-white/10 px-1 font-bold">C</kbd> tchat</p>
                      <p><kbd className="rounded bg-white/10 px-1 font-bold">P</kbd> participants · <kbd className="rounded bg-white/10 px-1 font-bold">F</kbd> plein écran</p>
                    </div>
                  </section>

                  <section>
                    <p className="mb-2 text-xs font-bold text-slate-300">Indisponible</p>
                    <div className="space-y-1 rounded-xl border border-white/10 bg-white/5 p-3 text-[10px] text-slate-500">
                      <p>Sous-titres en direct : non pris en charge par l'infrastructure actuelle.</p>
                      <p>Arrière-plan virtuel / flou : non pris en charge par l'infrastructure actuelle.</p>
                    </div>
                  </section>
                </div>
              )}
                  </aside>
                </div>
              )}
            {/* ── Bottom control bar ── */}
      <div className="z-20 flex shrink-0 items-center justify-center gap-2 border-t border-white/10 bg-[#0c1626] px-2 py-2.5 sm:px-6 sm:py-3">
        <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => dailyRef.current?.toggleAudio()}
            disabled={!canToggleMic}
            aria-label={isMuted ? "Activer le micro" : "Couper le micro"}
            className={`rounded-xl p-2.5 transition sm:p-3 disabled:cursor-not-allowed disabled:opacity-40 ${isMuted ? "bg-rose-500/20 text-rose-300" : "bg-white/10 text-white hover:bg-white/20"}`}
            title={isMuted ? "Activer le micro (M)" : "Couper le micro (M)"}
          >
            {isMuted ? <IconMicrophoneOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <IconMicrophone className="h-4 w-4 sm:h-5 sm:w-5" />}
          </button>
          <button
            type="button"
            onClick={() => dailyRef.current?.toggleVideo()}
            disabled={!canToggleCam}
            aria-label={isVideoOff ? "Activer la caméra" : "Couper la caméra"}
            className={`rounded-xl p-2.5 transition sm:p-3 disabled:cursor-not-allowed disabled:opacity-40 ${isVideoOff ? "bg-rose-500/20 text-rose-300" : "bg-white/10 text-white hover:bg-white/20"}`}
            title={isVideoOff ? "Activer la caméra (V)" : "Couper la caméra (V)"}
          >
            {isVideoOff ? <IconCameraOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <IconCamera className="h-4 w-4 sm:h-5 sm:w-5" />}
          </button>
          {canScreenShare && (
            <button
              type="button"
              onClick={() => dailyRef.current?.toggleScreenShare()}
              aria-label={isScreenSharing ? "Arrêter le partage d'écran" : "Partager l'écran"}
              className={`rounded-xl p-2.5 transition sm:p-3 ${isScreenSharing ? "bg-[#0d8d78] text-white" : "bg-white/10 text-white hover:bg-white/20"}`}
              title={isScreenSharing ? "Arrêter le partage d'écran" : "Partager l'écran"}
            >
              <IconMonitor className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )}
          <button
            type="button"
            onClick={toggleHand}
            aria-label={localHandRaised ? "Baisser la main" : "Lever la main"}
            className={`rounded-xl p-2.5 transition sm:p-3 ${localHandRaised ? "bg-amber-500 text-black" : "bg-white/10 text-white hover:bg-white/20"}`}
            title={localHandRaised ? "Baisser la main (H)" : "Lever la main (H)"}
          >
            <IconHand className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          {canReact && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowReactionsPicker((prev) => !prev)}
                aria-label="Réactions"
                aria-expanded={showReactionsPicker}
                className="rounded-xl bg-white/10 p-2.5 text-white transition hover:bg-white/20 sm:p-3"
                title="Réactions"
              >
                <IconStar className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              {showReactionsPicker && (
                <div className="absolute bottom-full left-1/2 z-30 mb-2 flex -translate-x-1/2 gap-1.5 rounded-2xl border border-white/10 bg-[#1a2d47] p-2 shadow-2xl">
                  {REACTIONS.map((emoji) => (
                    <button key={emoji} onClick={() => sendReaction(emoji)} aria-label={`Réagir ${emoji}`} className="rounded-xl p-1.5 text-2xl transition hover:bg-white/10">
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === "whiteboard" ? "video" : "whiteboard")}
            aria-label="Tableau blanc"
            className={`rounded-xl p-2.5 transition sm:p-3 ${activeTab === "whiteboard" ? "bg-[#0d8d78] text-white" : "bg-white/10 text-white hover:bg-white/20"}`}
            title="Tableau blanc"
          >
            <IconEdit className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button
            type="button"
            onClick={() => openDrawer("chat")}
            aria-label="Tchat"
            className="relative rounded-xl bg-white/10 p-2.5 text-white transition hover:bg-white/20 sm:p-3"
            title="Tchat (C)"
          >
            <IconMessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-extrabold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
            className="rounded-xl bg-white/10 p-2.5 text-white transition hover:bg-white/20 sm:p-3"
            title={isFullscreen ? "Quitter le plein écran (F)" : "Plein écran (F)"}
          >
            {isFullscreen ? <IconFullscreenExit className="h-4 w-4" /> : <IconFullscreen className="h-4 w-4" />}
          </button>
        </div>
        <button
          type="button"
          onClick={() => void quitClassroom()}
          className="ml-1 flex items-center gap-1.5 rounded-2xl bg-rose-500 px-4 py-2.5 font-bold text-white transition hover:bg-rose-600 sm:px-5 sm:py-3"
          title="Quitter la classe"
        >
          <IconPhone className="h-4 w-4 rotate-[135deg] sm:h-5 sm:w-5" />
          <span className="hidden sm:inline">Quitter</span>
        </button>
      </div>

      {/* Toast notifications */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl border px-4 py-2.5 text-xs font-bold shadow-2xl backdrop-blur ${
            toast.tone === "success"
              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
              : toast.tone === "error"
              ? "border-rose-500/30 bg-rose-500/15 text-rose-200"
              : "border-white/20 bg-[#1a2d47]/95 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#101b2d] p-6 shadow-2xl">
            <h3 className="text-base font-bold">{confirmDialog.title}</h3>
            <p className="mt-2 text-sm text-slate-300">{confirmDialog.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmDialog(null)} className="rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold hover:bg-white/20">
                Annuler
              </button>
              <button onClick={confirmDialog.onConfirm} className="rounded-xl bg-rose-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-600">
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image preview lightbox */}
      {previewImage && (
        <div onClick={() => setPreviewImage(null)} className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] max-w-4xl">
            <img src={previewImage} alt="Aperçu" className="max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
            <button onClick={() => setPreviewImage(null)} className="absolute right-4 top-4 rounded-full bg-black/60 px-3 py-1.5 text-xs font-bold text-white hover:bg-black">
              Fermer ✕
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
