"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import DailyIframe from "@daily-co/daily-js";
import type { DailyParticipant } from "@daily-co/daily-js";
import { IconMicrophone, IconMicrophoneOff, IconCameraOff, IconVideo } from "@/components/icons";

type DailyCallObject = ReturnType<typeof DailyIframe.createCallObject>;

export type DailyRoomHandle = {
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  leave: () => void;
};

type ParticipantTile = {
  sessionId: string;
  userName: string;
  local: boolean;
  videoTrack: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
  audioOn: boolean;
  videoOn: boolean;
  screen: boolean;
};

function toTile(p: DailyParticipant): ParticipantTile {
  const video = p.tracks.video;
  const audio = p.tracks.audio;
  return {
    sessionId: p.session_id,
    userName: p.user_name || (p.local ? "Vous" : "Participant"),
    local: p.local,
    videoTrack: video?.state === "playable" && video.persistentTrack ? video.persistentTrack : null,
    audioTrack: audio?.state === "playable" && audio.persistentTrack ? audio.persistentTrack : null,
    audioOn: !p.local ? audio?.state === "playable" : !p.tracks.audio?.off,
    videoOn: video?.state === "playable",
    screen: p.tracks.screenVideo?.state === "playable",
  };
}

function VideoTile({ tile, className, fit = "cover" }: { tile: ParticipantTile; className?: string; fit?: "cover" | "contain" }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (tile.videoTrack) {
      videoRef.current.srcObject = new MediaStream([tile.videoTrack]);
    } else {
      videoRef.current.srcObject = null;
    }
  }, [tile.videoTrack]);

  useEffect(() => {
    if (!audioRef.current || tile.local) return;
    if (tile.audioTrack) {
      audioRef.current.srcObject = new MediaStream([tile.audioTrack]);
    } else {
      audioRef.current.srcObject = null;
    }
  }, [tile.audioTrack, tile.local]);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-[#0c1626] ${className || ""}`}>
      {tile.videoOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={tile.local}
          className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"}`}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#132238] to-[#0c1626]">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0d8d78] text-xl font-bold text-white">
            {tile.userName.charAt(0).toUpperCase()}
          </div>
          <p className="text-xs font-semibold text-slate-300">{tile.userName}</p>
        </div>
      )}
      {!tile.local && <audio ref={audioRef} autoPlay />}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg bg-black/50 px-2 py-1 backdrop-blur-sm">
        <span className="text-[11px] font-semibold text-white">{tile.local ? `${tile.userName} (Vous)` : tile.userName}</span>
        {tile.screen && <span className="text-[10px] font-bold text-[#72d6bf]">ÉCRAN</span>}
        {tile.audioOn ? (
          <IconMicrophone className="h-3 w-3 text-emerald-300" />
        ) : (
          <IconMicrophoneOff className="h-3 w-3 text-rose-300" />
        )}
      </div>
    </div>
  );
}

export const DailyRoom = forwardRef<DailyRoomHandle, {
  bookingId: string;
  currentUserName: string;
  onStatusChange?: (status: "connecting" | "connected" | "error") => void;
  onAudioMuteChange?: (muted: boolean) => void;
  onVideoMuteChange?: (muted: boolean) => void;
  onScreenShareChange?: (sharing: boolean) => void;
}>(function DailyRoom({ bookingId, currentUserName, onStatusChange, onAudioMuteChange, onVideoMuteChange, onScreenShareChange }, ref) {
  const callRef = useRef<DailyCallObject | null>(null);
  const mountedRef = useRef(true);
  // The device-recovery effect runs once and outlives the join effect's scope,
  // so it reaches refreshTiles through a ref rather than a stale closure.
  const refreshTilesRef = useRef<(() => void) | null>(null);
  const [tiles, setTiles] = useState<ParticipantTile[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localAudioOn, setLocalAudioOn] = useState(true);
  const [localVideoOn, setLocalVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenShareError, setScreenShareError] = useState<string | null>(null);

  // Screen-share state lives on the participants object, not in React. Deriving
  // it here keeps the toolbar button honest and lets the client react to the
  // browser's own "Stop sharing" affordance (local-screen-share-stopped).
  const syncScreenShareState = () => {
    if (!mountedRef.current) return;
    const state = callRef.current?.participants()?.local?.tracks.screenVideo?.state;
    const sharing = state === "playable";
    setIsScreenSharing(sharing);
    onScreenShareChange?.(sharing);
  };

  const toggleScreenShare = () => {
    const call = callRef.current;
    if (!call) return;
    setScreenShareError(null);
    if (isScreenSharing) {
      call.stopScreenShare();
      return;
    }
    // startScreenShare() is typed void and reports failure through the
    // "screen-share-error" nonfatal event, not by rejecting — so there is
    // nothing to await. The listeners registered on join set the error
    // message and re-sync the button.
    call.startScreenShare();
  };

  useImperativeHandle(ref, () => ({
    toggleAudio: () => {
      const call = callRef.current;
      if (!call) return;
      const next = !localAudioOn;
      call.setLocalAudio(next);
      setLocalAudioOn(next);
      onAudioMuteChange?.(!next);
    },
    toggleVideo: () => {
      const call = callRef.current;
      if (!call) return;
      const next = !localVideoOn;
      call.setLocalVideo(next);
      setLocalVideoOn(next);
      onVideoMuteChange?.(!next);
    },
    toggleScreenShare: () => toggleScreenShare(),
    leave: () => {
      callRef.current?.leave();
    },
  }));

  useEffect(() => {
    let mounted = true;
    let call: DailyCallObject | null = null;
    mountedRef.current = true;
    onStatusChange?.("connecting");

    function sendLeave() {
      const url = `/api/classroom/${bookingId}/session/leave`;
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([], { type: "application/json" }));
      } else {
        fetch(url, { method: "POST", keepalive: true }).catch(() => {});
      }
    }

    function refreshTiles() {
      if (!call || !mounted) return;
      const participants = call.participants();
      setTiles(Object.values(participants).map((p) => toTile(p as DailyParticipant)));
    }
    refreshTilesRef.current = refreshTiles;

    async function start() {
      try {
        const res = await fetch(`/api/classroom/${bookingId}/session`);
        const data = await res.json();
        if (!mounted) return;

        if (!res.ok) {
          setError(data.error || "Impossible de préparer la salle.");
          onStatusChange?.("error");
          return;
        }
        if (!data.canJoin) {
          // Reachable only when the server refuses the join for a reason other
          // than the clock (the time window is disabled server-side).
          setError(data.error || "La salle n'est pas accessible pour le moment.");
          onStatusChange?.("error");
          return;
        }
        if (!data.videoConfigured || !data.roomUrl || !data.joinToken) {
          setError("Le service vidéo n'est pas encore configuré pour cette salle. Réessayez plus tard.");
          onStatusChange?.("error");
          return;
        }

        // videoSource/audioSource as plain `true` snapshots the device list once
        // at construction. After the OS sleeps, the browser invalidates the old
        // track identifiers and Daily keeps trying to reacquire a device it no
        // longer knows — the camera and mic come back dead until a full reload.
        // Passing no source makes Daily resolve the device at join time and
        // again on every re-acquisition instead of pinning the initial one.
        call = DailyIframe.createCallObject();
        callRef.current = call;

        call.on("joined-meeting", () => {
          if (!mounted) return;
          setConnected(true);
          onStatusChange?.("connected");
          fetch(`/api/classroom/${bookingId}/session/join`, { method: "POST" }).catch(() => {});
          refreshTiles();
        });
        // participants-updated covers the normal path, but these four fire
        // immediately around the capture prompt — including when the user
        // cancels it — so the button never stays stuck in the wrong state.
        call.on("local-screen-share-started", syncScreenShareState);
        call.on("local-screen-share-stopped", syncScreenShareState);
        call.on("local-screen-share-canceled", () => {
          if (!mounted) return;
          syncScreenShareState();
          setScreenShareError(null);
        });
        call.on("nonfatal-error", (e) => {
          if (!mounted || e?.type !== "screen-share-error") return;
          console.error("Screen share nonfatal error", e);
          syncScreenShareState();
          setScreenShareError("Le partage d'écran a échoué. Autorisez la capture d'écran dans votre navigateur, puis réessayez.");
        });
        call.on("participant-joined", refreshTiles);
        call.on("participant-updated", refreshTiles);
        call.on("participant-left", refreshTiles);
        call.on("left-meeting", () => sendLeave());
        call.on("error", (e) => {
          if (!mounted) return;
          setError(e?.errorMsg || "Erreur de connexion à la salle vidéo.");
          onStatusChange?.("error");
        });

        await call.join({ url: data.roomUrl, token: data.joinToken, userName: currentUserName });
        window.addEventListener("beforeunload", sendLeave);
      } catch (err) {
        if (mounted) {
          console.error(err);
          setError("Erreur de connexion à la salle vidéo. Vérifiez votre connexion internet.");
          onStatusChange?.("error");
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
  }, [bookingId, currentUserName]);

  // Laptop lids, OS sleep and device switching all leave Daily holding stale
  // track ids: the camera/mic stop working mid-lesson with no way back short of
  // a reload. Re-enumerating the devices and re-publishing the local tracks on
  // wake is what actually restores them.
  useEffect(() => {
    let recovering = false;

    async function recoverDevices() {
      const call = callRef.current;
      if (!call || recovering || document.visibilityState !== "visible") return;
      recovering = true;
      try {
        // Resolve the input devices again — this also re-triggers the browser's
        // own permission/device state after a sleep cycle.
        const devices = await call.enumerateDevices().catch(() => null);
        const hasCamera = Boolean(devices?.devices?.some((d) => d.kind === "videoinput"));
        const hasMic = Boolean(devices?.devices?.some((d) => d.kind === "audioinput"));

        const local = call.participants()?.local;
        const videoDead = local?.tracks.video?.state === "interrupted" || local?.tracks.video?.state === "off";
        const audioDead = local?.tracks.audio?.state === "interrupted" || local?.tracks.audio?.state === "off";

        if (hasCamera && videoDead) {
          // setLocalVideo(true) on an already-enabled track is a no-op, so cycle
          // it off then on to force a fresh capture. These return the call
          // object, not a promise — they are not awaitable.
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
    // `online` covers the network dropping while the laptop slept.
    window.addEventListener("online", onVisibility);

    return () => {
      window.removeEventListener("focus", onVisibility);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onVisibility);
    };
  }, []);

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <IconCameraOff className="h-8 w-8 text-slate-500" />
        <p className="text-sm text-slate-300">{error}</p>
      </div>
    );
  }

  const local = tiles.find((t) => t.local);
  const remote = tiles.filter((t) => !t.local);

  // A shared screen must win the main stage: filtering participants by index
  // meant a screen share was only visible if it happened to come from
  // remote[0], and then it was shown as an object-cover webcam tile. Prefer
  // the remote screen, fall back to the local one, then to the first remote.
  const remoteScreen = remote.find((t) => t.screen);
  const localScreen = local?.screen ? local : undefined;
  const screenTile = remoteScreen ?? localScreen;
  const stageTile = screenTile ?? remote[0];

  return (
    <div className="relative flex-1 min-h-[400px] p-3">
      {!connected && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0c1626]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#72d6bf] border-t-transparent" />
          <p className="text-sm text-slate-300">Connexion à la salle...</p>
        </div>
      )}

      {screenShareError && connected && (
        <div className="mb-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200">
          {screenShareError}
        </div>
      )}

      {connected && (
        <div className="relative h-full w-full">
          {stageTile ? (
            <VideoTile
              tile={stageTile}
              className="h-full w-full"
              fit={screenTile ? "contain" : "cover"}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl bg-[#0c1626] text-center">
              <IconVideo className="h-8 w-8 text-slate-500" />
              <p className="text-sm text-slate-400">En attente que l&apos;autre participant rejoigne...</p>
            </div>
          )}
          {screenTile && (
            <div className="absolute top-3 left-3 rounded-lg bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
              {screenTile.local ? "Vous partagez votre écran" : `Écran de ${screenTile.userName}`}
            </div>
          )}
          {local && !localScreen && (
            <div className="absolute bottom-3 right-3 h-28 w-40 shadow-2xl sm:h-32 sm:w-48">
              <VideoTile tile={local} className="h-full w-full ring-2 ring-white/10" />
            </div>
          )}
        </div>
      )}
    </div>
  );
});
