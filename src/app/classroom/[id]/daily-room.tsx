"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import DailyIframe from "@daily-co/daily-js";
import type { DailyParticipant } from "@daily-co/daily-js";
import {
  IconMicrophone,
  IconMicrophoneOff,
  IconCameraOff,
  IconMonitor,
  IconHand,
} from "@/components/icons";
import type { ConnectionQuality } from "./classroom-types";

type DailyCallObject = ReturnType<typeof DailyIframe.createCallObject>;

export type DailyRoomHandle = {
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  setAudioDevice: (deviceId: string) => Promise<void>;
  setVideoDevice: (deviceId: string) => Promise<void>;
  setSpeakerDevice: (deviceId: string) => Promise<void>;
  enumerateDevices: () => Promise<MediaDeviceInfo[]>;
  setAudioQuality: (quality: "low" | "medium" | "high") => void;
  setVideoQuality: (quality: "low" | "medium" | "high") => void;
  enableNoiseSuppression: (on: boolean) => void;
  enableEchoCancellation: (on: boolean) => void;
  enableAutoGainControl: (on: boolean) => void;
  leave: () => void;
  sendReaction: (emoji: string) => void;
  setHandRaised: (raised: boolean) => void;
  sendAppMessage: (data: unknown, toId?: string) => void;
  onAppMessage: (handler: (data: unknown, fromId: string) => void) => void;
};

export type DailyTile = {
  sessionId: string;
  userName: string;
  local: boolean;
  videoTrack: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
  screenTrack: MediaStreamTrack | null;
  audioOn: boolean;
  videoOn: boolean;
  screenOn: boolean;
  audioLevel: number;
  handRaised: boolean;
  connectionQuality: ConnectionQuality;
  ownerId?: string;
};

function toTile(p: DailyParticipant): DailyTile {
  const video = p.tracks.video;
  const audio = p.tracks.audio;
  const screen = p.tracks.screenVideo;
  // Keep the track object across "interrupted" (bandwidth adaptation, camera
  // re-acquisition) so the <video> element never unmounts and flash black.
  // Only a real "off" (user disabled the device) drops the track.
  const trackLive = (t: { state?: string; persistentTrack?: MediaStreamTrack | null }) =>
    (t?.state === "playable" || t?.state === "interrupted") && t?.persistentTrack ? t.persistentTrack : null;
  const localVideoOff = p.local ? Boolean(p.tracks.video?.off) : false;
  const localAudioOff = p.local ? Boolean(p.tracks.audio?.off) : false;
  return {
    sessionId: p.session_id,
    userName: p.user_name || (p.local ? "Vous" : "Participant"),
    local: p.local,
    videoTrack: trackLive(video),
    audioTrack: trackLive(audio),
    screenTrack: trackLive(screen),
    audioOn: p.local ? !localAudioOff : audio?.state === "playable",
    videoOn: p.local ? !localVideoOff : video?.state === "playable",
    screenOn: screen?.state === "playable",
    audioLevel: (p as unknown as { audioLevel?: number }).audioLevel ?? 0,
    handRaised: Boolean((p as unknown as { handRaised?: boolean }).handRaised),
    connectionQuality: ((p as unknown as { connectionQuality?: string }).connectionQuality === "good"
      ? "GOOD"
      : (p as unknown as { connectionQuality?: string }).connectionQuality === "poor"
      ? "POOR"
      : "UNKNOWN") as ConnectionQuality,
    ownerId: (p as unknown as { user_id?: string }).user_id,
  };
}

// ── Connection-quality indicator helpers ───────────────────────────────────
export function qualityColor(q: ConnectionQuality): string {
  switch (q) {
    case "EXCELLENT": return "text-emerald-300";
    case "GOOD": return "text-emerald-300/80";
    case "POOR": return "text-amber-300";
    case "RECONNECTING": return "text-rose-300";
    default: return "text-slate-400";
  }
}
export function qualityLabel(q: ConnectionQuality): string {
  switch (q) {
    case "EXCELLENT": return "Excellente";
    case "GOOD": return "Bonne";
    case "POOR": return "Faible";
    case "RECONNECTING": return "Reconnexion...";
    default: return "—";
  }
}

// ── Video tile ──────────────────────────────────────────────────────────────

function VideoTile({
  tile,
  className,
  fit = "cover",
  showQuality,
  isSpeaking,
}: {
  tile: DailyTile;
  className?: string;
  fit?: "cover" | "contain";
  showQuality?: boolean;
  isSpeaking?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const screenRef = useRef<HTMLVideoElement>(null);
  // Daily drops the track object for a moment on every re-negotiation
  // (bandwidth adaptation, camera re-acquisition). Unmounting the <video>
  // for that instant is what flashed black. Keep the last track rendered
  // for a grace period before ever falling back to the avatar.
  const [renderedVideoTrack, setRenderedVideoTrack] = useState<MediaStreamTrack | null>(tile.videoTrack ?? null);
  const [renderedScreenTrack, setRenderedScreenTrack] = useState<MediaStreamTrack | null>(tile.screenTrack ?? null);
  const [renderedAudioTrack, setRenderedAudioTrack] = useState<MediaStreamTrack | null>(tile.audioTrack ?? null);

  useEffect(() => {
    if (tile.videoTrack) {
      const timeout = window.setTimeout(() => setRenderedVideoTrack(tile.videoTrack), 0);
      return () => window.clearTimeout(timeout);
    }
    const timeout = window.setTimeout(() => setRenderedVideoTrack(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [tile.videoTrack]);

  useEffect(() => {
    if (tile.screenTrack) {
      const timeout = window.setTimeout(() => setRenderedScreenTrack(tile.screenTrack), 0);
      return () => window.clearTimeout(timeout);
    }
    const timeout = window.setTimeout(() => setRenderedScreenTrack(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [tile.screenTrack]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = renderedVideoTrack ? new MediaStream([renderedVideoTrack]) : null;
  }, [renderedVideoTrack]);

  useEffect(() => {
    if (tile.audioTrack) {
      const timeout = window.setTimeout(() => setRenderedAudioTrack(tile.audioTrack), 0);
      return () => window.clearTimeout(timeout);
    }
    const timeout = window.setTimeout(() => setRenderedAudioTrack(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [tile.audioTrack]);

  useEffect(() => {
    if (!screenRef.current) return;
    screenRef.current.srcObject = renderedScreenTrack ? new MediaStream([renderedScreenTrack]) : null;
  }, [renderedScreenTrack]);

  useEffect(() => {
    if (!audioRef.current || tile.local) return;
    audioRef.current.srcObject = renderedAudioTrack ? new MediaStream([renderedAudioTrack]) : null;
  }, [renderedAudioTrack, tile.local]);

  // The video element stays mounted as long as a track exists (the avatar is
  // an overlay, not a replacement) so a re-negotiation can't flash black.
  const hasScreen = Boolean(renderedScreenTrack);
  const showAvatar = !hasScreen && !renderedVideoTrack;
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-[#0c1626] ${
        isSpeaking ? "ring-2 ring-[#72d6bf]" : ""
      } ${className || ""}`}
    >
      {hasScreen && (
        <video ref={screenRef} autoPlay playsInline muted={tile.local} className="absolute inset-0 h-full w-full object-contain" />
      )}

      {/* Camera layer — persists across brief track drops */}
      {renderedVideoTrack && !hasScreen ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={tile.local}
          className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"}`}
        />
      ) : null}

      {/* Avatar overlay (video off) — sits above the persistent video element */}
      {!hasScreen && showAvatar && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#132238] to-[#0c1626]">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0d8d78] text-xl font-bold text-white">
            {tile.userName.charAt(0).toUpperCase()}
          </div>
          <p className="text-xs font-semibold text-slate-300">{tile.userName}</p>
        </div>
      )}

      {!tile.local && !hasScreen && renderedAudioTrack != null && <audio ref={audioRef} autoPlay />}

      <div className="absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-lg bg-black/60 px-2 py-1 backdrop-blur-sm">
        <span className="truncate text-[11px] font-semibold text-white">{tile.local ? `${tile.userName} (Vous)` : tile.userName}</span>
        {tile.audioOn ? (
          <IconMicrophone className={`h-3 w-3 shrink-0 ${isSpeaking ? "text-[#72d6bf]" : "text-emerald-300"}`} />
        ) : (
          <IconMicrophoneOff className="h-3 w-3 shrink-0 text-rose-300" />
        )}
        {!tile.videoOn && !hasScreen && <IconCameraOff className="h-3 w-3 shrink-0 text-rose-300" />}
        {showQuality && tile.connectionQuality !== "UNKNOWN" && (
          <span className={`text-[10px] font-bold ${qualityColor(tile.connectionQuality)}`}>●</span>
        )}
      </div>

      {tile.handRaised && (
        <div className="absolute top-2 right-2 flex items-center gap-1 rounded-lg bg-amber-500/90 px-2 py-1 shadow">
          <IconHand className="h-3.5 w-3.5 text-white" />
          <span className="text-[10px] font-bold text-white">Main levée</span>
        </div>
      )}
      {hasScreen && (
        <div className="absolute top-2 left-2 flex items-center gap-1 rounded-lg bg-black/70 px-2 py-1 backdrop-blur-sm">
          <IconMonitor className="h-3 w-3 text-[#72d6bf]" />
          <span className="text-[10px] font-bold text-white">Écran</span>
        </div>
      )}
    </div>
  );
}

export { VideoTile };

export const DailyRoom = forwardRef<
  DailyRoomHandle,
  {
    bookingId: string;
    currentUserName: string;
    canScreenShare: boolean;
    joinToken: string | null;
    roomUrl: string | null;
    initialAudioOn?: boolean;
    initialVideoOn?: boolean;
    previewStream?: MediaStream | null;
    onJoined?: () => void;
    onStatusChange?: (status: "connecting" | "connected" | "error" | "reconnecting") => void;
    onTilesChange?: (tiles: DailyTile[]) => void;
    onLocalAudioChange?: (on: boolean) => void;
    onLocalVideoChange?: (on: boolean) => void;
    onScreenShareChange?: (on: boolean) => void;
    onError?: (message: string) => void;
    onConnectionQualityChange?: (quality: ConnectionQuality) => void;
  }
>(function DailyRoom(
  {
    bookingId,
    currentUserName,
    canScreenShare,
    joinToken,
    roomUrl,
    initialAudioOn = true,
    initialVideoOn = true,
    previewStream = null,
    onJoined,
    onStatusChange,
    onTilesChange,
    onLocalAudioChange,
    onLocalVideoChange,
    onScreenShareChange,
    onError,
    onConnectionQualityChange,
  },
  ref,
) {
  const callRef = useRef<DailyCallObject | null>(null);
  const mountedRef = useRef(true);
  const refreshTilesRef = useRef<(() => void) | null>(null);
  const appMessageHandlerRef = useRef<((data: unknown, fromId: string) => void) | null>(null);

  // Tiles are pushed to the parent via onTilesChange; the state is kept only
  // so this component re-renders when the meeting composition changes.
  const [, setTiles] = useState<DailyTile[]>([]);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localAudioOn, setLocalAudioOn] = useState(initialAudioOn);
  const [localVideoOn, setLocalVideoOn] = useState(initialVideoOn);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenShareError, setScreenShareError] = useState<string | null>(null);

  const syncScreenShareState = useCallback(() => {
    if (!mountedRef.current) return;
    const state = callRef.current?.participants()?.local?.tracks.screenVideo?.state;
    const sharing = state === "playable";
    setIsScreenSharing(sharing);
    onScreenShareChange?.(sharing);
  }, [onScreenShareChange]);

  useImperativeHandle(
    ref,
    (): DailyRoomHandle => ({
      toggleAudio: () => {
        const call = callRef.current;
        if (!call) return;
        const next = !localAudioOn;
        call.setLocalAudio(next);
        setLocalAudioOn(next);
        onLocalAudioChange?.(next);
      },
      toggleVideo: () => {
        const call = callRef.current;
        if (!call) return;
        const next = !localVideoOn;
        call.setLocalVideo(next);
        setLocalVideoOn(next);
        onLocalVideoChange?.(next);
      },
      toggleScreenShare: () => {
        const call = callRef.current;
        if (!call || !canScreenShare) return;
        setScreenShareError(null);
        if (isScreenSharing) {
          call.stopScreenShare();
          return;
        }
        call.startScreenShare();
      },
      setAudioDevice: async (deviceId) => {
        const call = callRef.current;
        if (!call) return;
        try {
          await (call as unknown as { setAudioDevice?: (id: string) => Promise<void> }).setAudioDevice?.(deviceId);
        } catch (e) { console.warn("setAudioDevice failed", e); }
      },
      setVideoDevice: async (deviceId) => {
        const call = callRef.current;
        if (!call) return;
        try {
          await (call as unknown as { setVideoDevice?: (id: string) => Promise<void> }).setVideoDevice?.(deviceId);
        } catch (e) { console.warn("setVideoDevice failed", e); }
      },
      setSpeakerDevice: async (deviceId) => {
        const call = callRef.current;
        if (!call) return;
        try {
          await (call as unknown as { setSpeakerDevice?: (id: string) => Promise<void> }).setSpeakerDevice?.(deviceId);
        } catch (e) { console.warn("setSpeakerDevice failed", e); }
      },
      enumerateDevices: async () => {
        const call = callRef.current;
        if (!call) return [];
        try {
          const result = await call.enumerateDevices();
          return result.devices;
        } catch { return []; }
      },
      setAudioQuality: (quality) => {
        const call = callRef.current;
        if (!call) return;
        void quality;
        const bitrates = { low: 16, medium: 32, high: 64 } as const;
        void (call.updateSendSettings as (s: unknown) => void)({
          audio: { bitrate: { low: bitrates.low, standard: bitrates.medium, high: bitrates.high } },
        });
      },
      setVideoQuality: (quality) => {
        const call = callRef.current;
        if (!call) return;
        void quality;
        const presets = { low: 150, medium: 500, high: 1500 } as const;
        void (call.updateSendSettings as (s: unknown) => void)({
          video: { kbps: { low: presets.low, standard: presets.medium, high: presets.high } },
        });
      },
      enableNoiseSuppression: (on) => {
        const call = callRef.current;
        if (!call) return;
        void (call.updateInputSettings as (s: unknown) => void)({
          audio: { processor: { type: on ? "noise-cancellation" : "none" } },
        });
      },
      enableEchoCancellation: (on) => {
        const call = callRef.current;
        if (!call) return;
        void (call.updateInputSettings as (s: unknown) => void)({
          audio: { autoEchoCancellation: on },
        });
      },
      enableAutoGainControl: (on) => {
        const call = callRef.current;
        if (!call) return;
        void (call.updateInputSettings as (s: unknown) => void)({
          audio: { autoGainControl: on },
        });
      },
      leave: () => {
        callRef.current?.leave();
      },
      sendReaction: (emoji) => {
        const call = callRef.current;
        if (!call) return;
        call.sendAppMessage({ type: "reaction", emoji }, undefined);
      },
      setHandRaised: (raised) => {
        const call = callRef.current;
        if (!call) return;
        call.sendAppMessage({ type: "hand", raised }, undefined);
      },
      sendAppMessage: (data, toId) => {
        const call = callRef.current;
        if (!call) return;
        call.sendAppMessage(data, toId);
      },
      onAppMessage: (handler) => {
        appMessageHandlerRef.current = handler;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [localAudioOn, localVideoOn, isScreenSharing, canScreenShare],
  );

  useEffect(() => {
    let mounted = true;
    let call: DailyCallObject | null = null;
    mountedRef.current = true;
    onStatusChange?.("connecting");

    function sendLeave() {
      const url = `/api/classroom/${bookingId}/session/leave`;
      const body = JSON.stringify({ reason: "LEFT" });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      } else {
        fetch(url, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body }).catch(() => {});
      }
    }

    function refreshTiles() {
      if (!call || !mounted) return;
      const participants = call.participants();
      const next = Object.values(participants).map((p) => toTile(p as DailyParticipant));
      setTiles(next);
      onTilesChange?.(next);
    }
    refreshTilesRef.current = refreshTiles;

    async function start() {
      try {
        if (!roomUrl || !joinToken) {
          setError("Le service vidéo n'est pas encore configuré pour cette salle. Réessayez plus tard.");
          onStatusChange?.("error");
          onError?.("Le service vidéo n'est pas encore configuré pour cette salle.");
          return;
        }

        // No videoSource/audioSource pinned — Daily resolves the device at join
        // time and again on every re-acquisition instead of pinning the initial
        // one, which broke camera/mic after an OS sleep.
        call = DailyIframe.createCallObject();
        callRef.current = call;

        call.on("joined-meeting", () => {
          if (!mounted) return;
          setConnected(true);
          setReconnecting(false);
          onStatusChange?.("connected");
          onJoined?.();
          refreshTiles();
          // Stop the preview stream after Daily has successfully joined and taken over the devices
          if (previewStream) {
            previewStream.getTracks().forEach((t) => t.stop());
          }
        });

        call.on("participant-joined", refreshTiles);
        call.on("participant-updated", refreshTiles);
        call.on("participant-left", refreshTiles);

        call.on("local-screen-share-started", syncScreenShareState);
        call.on("local-screen-share-stopped", syncScreenShareState);
        call.on("local-screen-share-canceled", () => {
          if (!mounted) return;
          syncScreenShareState();
          setScreenShareError(null);
        });

        call.on("nonfatal-error", (e) => {
          if (!mounted) return;
          if (e?.type === "screen-share-error") {
            console.error("Screen share nonfatal error", e);
            syncScreenShareState();
            setScreenShareError("Le partage d'écran a échoué. Autorisez la capture d'écran dans votre navigateur, puis réessayez.");
          }
        });

        call.on("left-meeting", () => sendLeave());
        call.on("error", (e) => {
          if (!mounted) return;
          const message = e?.errorMsg || "Erreur de connexion à la salle vidéo.";
          setError(message);
          onStatusChange?.("error");
          onError?.(message);
        });

        // Network reconnection events (Daily reports these through
        // "reconnecting"/"reconnected" — the type definitions lag the runtime,
        // hence the cast).
        type ReconnectEvent = { error?: { errorMsg: string } };
        call.on("reconnecting" as never, () => {
          if (!mounted) return;
          setReconnecting(true);
          onStatusChange?.("reconnecting");
        });
        call.on("reconnected" as never, (event: ReconnectEvent) => {
          if (!mounted) return;
          setReconnecting(false);
          onStatusChange?.("connected");
          refreshTiles();
          void event;
        });

        call.on("app-message", (event: unknown) => {
          if (!mounted) return;
          const typed = event as { data?: unknown; fromId?: string };
          appMessageHandlerRef.current?.(typed?.data, typed?.fromId ?? "");
        });

        call.on("active-speaker-change", () => refreshTilesRef.current?.());

        const videoTrack = previewStream?.getVideoTracks()[0] ?? null;
        const audioTrack = previewStream?.getAudioTracks()[0] ?? null;

        await call.join({
          url: roomUrl,
          token: joinToken,
          userName: currentUserName,
          ...(videoTrack ? { videoSource: videoTrack } : {}),
          ...(audioTrack ? { audioSource: audioTrack } : {}),
        });
        window.addEventListener("beforeunload", sendLeave);
      } catch (err) {
        if (mounted) {
          console.error(err);
          setError("Erreur de connexion à la salle vidéo. Vérifiez votre connexion internet.");
          onStatusChange?.("error");
          onError?.("Erreur de connexion à la salle vidéo.");
        }
      }
    }

    void start();

    return () => {
      mounted = false;
      mountedRef.current = false;
      window.removeEventListener("beforeunload", sendLeave);
      if (call) {
        sendLeave();
        call.leave().catch(() => {});
        call.destroy().catch(() => {});
      }
      callRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, roomUrl, joinToken]);

  // Device-recovery effect (laptop sleep / device switch / network back)
  useEffect(() => {
    let recovering = false;

    async function recoverDevices() {      const call = callRef.current;
      if (!call || recovering || document.visibilityState !== "visible") return;
      recovering = true;
      try {
        const result = await call.enumerateDevices().catch(() => null);
        const hasCamera = Boolean(result?.devices?.some((d) => d.kind === "videoinput"));
        const hasMic = Boolean(result?.devices?.some((d) => d.kind === "audioinput"));
        const local = call.participants()?.local;
        // Only re-acquire genuinely interrupted tracks. Cycling a merely
        // "off" track (user's choice, or a brief bandwidth pause) produces
        // exactly the black-then-back flicker we're avoiding.
        const videoDead = local?.tracks.video?.state === "interrupted";
        const audioDead = local?.tracks.audio?.state === "interrupted";

        if (hasCamera && videoDead) {
          call.setLocalVideo(false);
          call.setLocalVideo(true);
        }
        if (hasMic && audioDead) {
          call.setLocalAudio(false);
          call.setLocalAudio(true);
        }
        refreshTilesRef.current?.();
      } finally {
        recovering = false;
      }
    }

    function onVisibility() {
      if (document.visibilityState === "visible") void recoverDevices();
    }

    window.addEventListener("focus", onVisibility);
    document.addEventListener("visibilitychange", onVisibility);
    // Note: no "online" listener — a flapping network would cycle the camera
    // and flash black; Daily's own reconnection handles that case.

    return () => {
      window.removeEventListener("focus", onVisibility);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Poll meeting quality into a React-friendly state (one cheap read / 3s).
  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(() => {
      const call = callRef.current;
      if (!call) return;
      const stats = (call as unknown as { getMeetingQuality?: () => { video?: string; audio?: string } }).getMeetingQuality?.();
      if (!stats) return;
      let quality: ConnectionQuality = "UNKNOWN";
      if (stats.video === "excellent" || stats.audio === "excellent") quality = "EXCELLENT";
      else if (stats.video === "good" || stats.audio === "good") quality = "GOOD";
      else if (stats.video === "poor" || stats.audio === "poor") quality = "POOR";
      onConnectionQualityChange?.(quality);
    }, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  // Reconnect with a fresh token after a long network drop — the original
  // token may have expired while offline, so re-request a join payload.
  const retryJoin = useCallback(async () => {
    try {
      const res = await fetch(`/api/classroom/${bookingId}/session`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.joinToken && data.roomUrl) {
        const call = callRef.current;
        if (call) {
          await call.join({ url: data.roomUrl, token: data.joinToken, userName: currentUserName });
        }
      }
    } catch {
      // Silent — the reconnecting overlay already tells the user what's happening.
    }
  }, [bookingId, currentUserName]);

  // Auto-retry the join once after 8 seconds while reconnecting.
  useEffect(() => {
    if (!reconnecting) return;
    const timeout = setTimeout(() => void retryJoin(), 8000);
    return () => clearTimeout(timeout);
  }, [reconnecting, retryJoin]);

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <IconCameraOff className="h-8 w-8 text-slate-500" />
        <p className="text-sm text-slate-300">{error}</p>
      </div>
    );
  }

  if (reconnecting) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[#0a0f1a]/95 p-6 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
        <p className="text-sm font-semibold text-amber-200">Connexion perdue. Reconnexion...</p>
        <p className="text-xs text-slate-400">Vos réglages et la session sont conservés.</p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-[280px] overflow-hidden" data-daily-stage>
      {!connected && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0c1626]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#72d6bf] border-t-transparent" />
          <p className="text-sm text-slate-300">Connexion à la salle...</p>
        </div>
      )}

      {screenShareError && connected && (
        <div className="absolute top-3 left-1/2 z-20 -translate-x-1/2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 backdrop-blur">
          {screenShareError}
        </div>
      )}

      {/* The tiles themselves are rendered by the parent layout — this
          component owns only the call object and its lifecycle. */}
    </div>
  );
});
