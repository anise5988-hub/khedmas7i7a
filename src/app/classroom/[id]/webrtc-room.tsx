"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/client/supabase";
import {
  IconMicrophone,
  IconMicrophoneOff,
  IconCamera,
  IconCameraOff,
  IconFullscreen,
  IconFullscreenExit,
  IconVideo,
  IconTeacher,
  IconMonitor,
} from "@/components/icons";

const fallbackRtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

type Signal = {
  type: "description" | "ice";
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

export function WebRTCRoom({ roomId, polite = true }: { roomId: string; polite?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const peer = useRef<RTCPeerConnection | null>(null);
  const channel = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  const localStream = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState("Connexion à la salle...");
  const [camera, setCamera] = useState(true);
  const [microphone, setMicrophone] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function start() {
      // Start local media stream
      const stream = await navigator.mediaDevices
        ?.getUserMedia({ video: true, audio: true })
        .catch(() => null);

      if (stream) {
        localStream.current = stream;
        if (localVideo.current) localVideo.current.srcObject = stream;
      } else {
        if (mounted) setStatus("Caméra / micro non détectés ou permissions refusées.");
      }

      if (!supabase) {
        if (mounted) setStatus("Salle active en mode direct.");
        return;
      }

      const rtcConfig: RTCConfiguration = await fetch(`/api/classroom/${roomId}/ice-servers`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => (data?.iceServers ? { iceServers: data.iceServers } : fallbackRtcConfig))
        .catch(() => fallbackRtcConfig);

      try {
        const room = supabase.channel(`classroom:${roomId}`, {
          config: { broadcast: { self: false } },
        });
        channel.current = room;

        // "Perfect negotiation": both peers can independently trigger
        // renegotiation (onnegotiationneeded), and without a tie-breaker
        // they can each send a colliding offer at the same time. The
        // designated impolite peer keeps its own offer and ignores the
        // incoming one; the polite peer rolls back and accepts it. See
        // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
        let makingOffer = false;
        let ignoreOffer = false;
        // ICE candidates can arrive over the broadcast channel before the
        // remote description that makes them valid has been applied yet —
        // queue them and flush once setRemoteDescription resolves.
        const pendingCandidates: RTCIceCandidateInit[] = [];

        const connection = new RTCPeerConnection(rtcConfig);
        peer.current = connection;

        if (stream) {
          stream.getTracks().forEach((track) => connection.addTrack(track, stream));
        }

        connection.ontrack = (event) => {
          if (remoteVideo.current && event.streams[0]) {
            remoteVideo.current.srcObject = event.streams[0];
          }
        };

        connection.onicecandidate = (event) => {
          if (event.candidate) {
            room.send({
              type: "broadcast",
              event: "signal",
              payload: { type: "ice", candidate: event.candidate.toJSON() } satisfies Signal,
            });
          }
        };

        connection.onnegotiationneeded = async () => {
          try {
            makingOffer = true;
            await connection.setLocalDescription();
            await room.send({
              type: "broadcast",
              event: "signal",
              payload: { type: "description", description: connection.localDescription! } satisfies Signal,
            });
            if (mounted) setStatus("Invitation envoyée, connexion en cours...");
          } catch (err) {
            console.error("Negotiation error:", err);
          } finally {
            makingOffer = false;
          }
        };

        room.on("broadcast", { event: "signal" }, async ({ payload }: { payload: Signal }) => {
          if (!peer.current) return;
          try {
            if (payload.type === "description" && payload.description) {
              const description = payload.description;
              const offerCollision =
                description.type === "offer" && (makingOffer || connection.signalingState !== "stable");
              ignoreOffer = !polite && offerCollision;
              if (ignoreOffer) return;

              if (offerCollision) {
                await Promise.all([
                  connection.setLocalDescription({ type: "rollback" }),
                  connection.setRemoteDescription(description),
                ]);
              } else {
                await connection.setRemoteDescription(description);
              }

              // Remote description just landed — apply any ICE candidates
              // that arrived earlier and couldn't be added yet.
              while (pendingCandidates.length > 0) {
                const candidate = pendingCandidates.shift()!;
                await connection.addIceCandidate(candidate).catch(() => {});
              }

              if (description.type === "offer") {
                await connection.setLocalDescription();
                await room.send({
                  type: "broadcast",
                  event: "signal",
                  payload: { type: "description", description: connection.localDescription! } satisfies Signal,
                });
              }
            } else if (payload.type === "ice" && payload.candidate) {
              if (!connection.remoteDescription) {
                pendingCandidates.push(payload.candidate);
                return;
              }
              try {
                await connection.addIceCandidate(payload.candidate);
              } catch (err) {
                if (!ignoreOffer) throw err;
              }
            }
          } catch (err) {
            console.error("Signal handling error:", err);
          }
        });

        await room.subscribe((subState) => {
          if (subState === "SUBSCRIBED" && mounted) {
            setStatus("En attente de l'autre participant...");
          }
        });

        connection.onconnectionstatechange = () => {
          if (mounted && connection.connectionState === "connected") {
            setStatus("Appel vidéo HD connecté");
          }
          if (mounted && ["failed", "disconnected"].includes(connection.connectionState)) {
            setStatus("Connexion vidéo interrompue");
          }
        };
      } catch (err) {
        console.error("WebRTC initialization error:", err);
      }
    }

    void start();

    return () => {
      mounted = false;
      localStream.current?.getTracks().forEach((track) => track.stop());
      peer.current?.close();
      if (channel.current) void channel.current.unsubscribe();
    };
  }, [roomId, polite]);

  function toggleTrack(kind: "video" | "audio") {
    const track = localStream.current?.getTracks().find((item) => item.kind === kind);
    if (!track) return;
    track.enabled = !track.enabled;
    if (kind === "video") setCamera(track.enabled);
    else setMicrophone(track.enabled);
  }

  async function toggleScreenShare() {
    if (isScreenSharing) {
      // Revert to camera
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() => null);
      if (cameraStream && localVideo.current) {
        localStream.current?.getTracks().forEach((t) => t.stop());
        localStream.current = cameraStream;
        localVideo.current.srcObject = cameraStream;
        setIsScreenSharing(false);

        if (peer.current) {
          const videoSender = peer.current.getSenders().find((s) => s.track?.kind === "video");
          const newTrack = cameraStream.getVideoTracks()[0];
          if (videoSender && newTrack) {
            videoSender.replaceTrack(newTrack);
          }
        }
      }
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (screenStream && localVideo.current) {
          localStream.current = screenStream;
          localVideo.current.srcObject = screenStream;
          setIsScreenSharing(true);

          const screenTrack = screenStream.getVideoTracks()[0];
          if (peer.current) {
            const videoSender = peer.current.getSenders().find((s) => s.track?.kind === "video");
            if (videoSender && screenTrack) {
              videoSender.replaceTrack(screenTrack);
            }
          }

          screenTrack.onended = async () => {
            setIsScreenSharing(false);
            const cam = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() => null);
            if (cam && localVideo.current) {
              localStream.current = cam;
              localVideo.current.srcObject = cam;
              if (peer.current) {
                const sender = peer.current.getSenders().find((s) => s.track?.kind === "video");
                if (sender && cam.getVideoTracks()[0]) {
                  sender.replaceTrack(cam.getVideoTracks()[0]);
                }
              }
            }
          };
        }
      } catch {
        // User cancelled share
      }
    }
  }

  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative flex flex-col justify-between w-full h-full min-h-[420px] lg:min-h-[520px] bg-[#0c1626] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
      {/* Main Large Stage: Teacher / Main Camera */}
      <div className="relative flex-1 w-full h-full min-h-[380px] bg-[#101b2d] flex items-center justify-center overflow-hidden">
        <video
          ref={remoteVideo}
          autoPlay
          playsInline
          className="h-full w-full object-cover"
        />

        {/* Fallback teacher badge/avatar if no video received yet */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-80">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10 text-[#72d6bf] backdrop-blur-md shadow-2xl">
            <IconTeacher className="h-10 w-10" />
          </div>
          <span className="mt-3 text-xs font-semibold text-slate-300">
            Espace Enseignant · Scène Principale
          </span>
        </div>

        {/* Live teacher badge */}
        <div className="absolute top-4 left-4 flex items-center gap-2 rounded-xl bg-black/60 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Professeur (Scène Principale)</span>
        </div>

        {/* Student PiP Preview (Floating in corner, neatly sized) */}
        <div className="absolute bottom-4 right-4 w-44 sm:w-56 aspect-video rounded-2xl border-2 border-white/20 bg-black/70 overflow-hidden shadow-2xl backdrop-blur-md z-10">
          <video
            ref={localVideo}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
          />
          <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
            Vous ({camera ? "Caméra active" : "Off"})
          </div>
        </div>
      </div>

      {/* Bottom Floating Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-[#0a1220]/90 border-t border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <IconVideo className="h-4 w-4 text-[#72d6bf]" />
          <span className="truncate max-w-xs">{status}</span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Microphone Toggle */}
          <button
            onClick={() => toggleTrack("audio")}
            title={microphone ? "Couper le micro" : "Activer le micro"}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              microphone
                ? "bg-white/10 text-white hover:bg-white/20"
                : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
            }`}
          >
            {microphone ? <IconMicrophone className="h-4 w-4" /> : <IconMicrophoneOff className="h-4 w-4" />}
            <span className="hidden sm:inline">{microphone ? "Micro" : "Muet"}</span>
          </button>

          {/* Camera Toggle */}
          <button
            onClick={() => toggleTrack("video")}
            title={camera ? "Couper la caméra" : "Activer la caméra"}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              camera
                ? "bg-white/10 text-white hover:bg-white/20"
                : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
            }`}
          >
            {camera ? <IconCamera className="h-4 w-4" /> : <IconCameraOff className="h-4 w-4" />}
            <span className="hidden sm:inline">{camera ? "Caméra" : "Cam Off"}</span>
          </button>

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            title={isScreenSharing ? "Arrêter le partage" : "Partager mon écran"}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              isScreenSharing
                ? "bg-emerald-500 text-[#101b2d]"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <IconMonitor className="h-4 w-4" />
            <span className="hidden sm:inline">{isScreenSharing ? "Partage Actif" : "Partager"}</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Quitter plein écran" : "Plein écran"}
            className="flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/20"
          >
            {isFullscreen ? <IconFullscreenExit className="h-4 w-4" /> : <IconFullscreen className="h-4 w-4" />}
            <span className="hidden sm:inline">{isFullscreen ? "Réduire" : "Plein Écran"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
