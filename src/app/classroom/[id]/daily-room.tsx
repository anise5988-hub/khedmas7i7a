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

function VideoTile({ tile, className }: { tile: ParticipantTile; className?: string }) {
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
        <video ref={videoRef} autoPlay playsInline muted={tile.local} className="h-full w-full object-cover" />
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
}>(function DailyRoom({ bookingId, currentUserName, onStatusChange, onAudioMuteChange, onVideoMuteChange }, ref) {
  const callRef = useRef<DailyCallObject | null>(null);
  const [tiles, setTiles] = useState<ParticipantTile[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localAudioOn, setLocalAudioOn] = useState(true);
  const [localVideoOn, setLocalVideoOn] = useState(true);

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
    toggleScreenShare: () => {
      const call = callRef.current;
      if (!call) return;
      const local = call.participants()?.local;
      if (local?.tracks.screenVideo?.state === "playable") {
        call.stopScreenShare();
      } else {
        call.startScreenShare();
      }
    },
    leave: () => {
      callRef.current?.leave();
    },
  }));

  useEffect(() => {
    let mounted = true;
    let call: DailyCallObject | null = null;
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
          setError(
            data.isTooEarly
              ? `La salle ouvre 10 minutes avant l'heure prévue (${new Date(data.opensAt).toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })}).`
              : "Cette séance est terminée et la salle n'est plus accessible.",
          );
          onStatusChange?.("error");
          return;
        }
        if (!data.videoConfigured || !data.roomUrl || !data.joinToken) {
          setError("Le service vidéo n'est pas encore configuré pour cette salle. Réessayez plus tard.");
          onStatusChange?.("error");
          return;
        }

        call = DailyIframe.createCallObject({ videoSource: true, audioSource: true });
        callRef.current = call;

        call.on("joined-meeting", () => {
          if (!mounted) return;
          setConnected(true);
          onStatusChange?.("connected");
          fetch(`/api/classroom/${bookingId}/session/join`, { method: "POST" }).catch(() => {});
          refreshTiles();
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

  return (
    <div className="relative flex-1 min-h-[400px] p-3">
      {!connected && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0c1626]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#72d6bf] border-t-transparent" />
          <p className="text-sm text-slate-300">Connexion à la salle...</p>
        </div>
      )}

      {connected && (
        <div className="relative h-full w-full">
          {remote.length > 0 ? (
            <VideoTile tile={remote[0]} className="h-full w-full" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl bg-[#0c1626] text-center">
              <IconVideo className="h-8 w-8 text-slate-500" />
              <p className="text-sm text-slate-400">En attente que l&apos;autre participant rejoigne...</p>
            </div>
          )}
          {local && (
            <VideoTile
              tile={local}
              className="absolute bottom-3 right-3 h-28 w-40 sm:h-32 sm:w-48 shadow-2xl ring-2 ring-white/10"
            />
          )}
        </div>
      )}
    </div>
  );
});
