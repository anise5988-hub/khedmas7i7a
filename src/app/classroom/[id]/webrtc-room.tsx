"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/client/supabase";

const rtcConfig: RTCConfiguration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
type Signal = { type: "offer" | "answer" | "ice" | "join"; offer?: RTCSessionDescriptionInit; answer?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };

export function WebRTCRoom({ roomId }: { roomId: string }) {
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const peer = useRef<RTCPeerConnection | null>(null);
  const channel = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState("Connexion à la salle...");
  const [camera, setCamera] = useState(true);
  const [microphone, setMicrophone] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function start() {
      if (!supabase) { setStatus("Ajoute les variables Supabase Realtime pour activer la vidéo."); return; }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() => null);
      if (!stream) { setStatus("Autorise la caméra et le microphone pour rejoindre la salle."); return; }
      localStream.current = stream;
      if (localVideo.current) localVideo.current.srcObject = stream;
      const connection = new RTCPeerConnection(rtcConfig);
      peer.current = connection;
      stream.getTracks().forEach((track) => connection.addTrack(track, stream));
      connection.ontrack = (event) => { if (remoteVideo.current) remoteVideo.current.srcObject = event.streams[0]; };
      const room = supabase.channel(`classroom:${roomId}`, { config: { broadcast: { self: false } } });
      channel.current = room;
      connection.onicecandidate = (event) => { if (event.candidate) room.send({ type: "broadcast", event: "signal", payload: { type: "ice", candidate: event.candidate.toJSON() } satisfies Signal }); };
      room.on("broadcast", { event: "signal" }, async ({ payload }: { payload: Signal }) => {
        if (!peer.current) return;
        if (payload.type === "join") {
          const offer = await peer.current.createOffer();
          await peer.current.setLocalDescription(offer);
          await room.send({ type: "broadcast", event: "signal", payload: { type: "offer", offer } satisfies Signal });
          if (mounted) setStatus("Invitation envoyée, connexion en cours...");
        } else if (payload.type === "offer" && payload.offer) {
          await peer.current.setRemoteDescription(payload.offer);
          const answer = await peer.current.createAnswer();
          await peer.current.setLocalDescription(answer);
          await room.send({ type: "broadcast", event: "signal", payload: { type: "answer", answer } satisfies Signal });
        } else if (payload.type === "answer" && payload.answer) await peer.current.setRemoteDescription(payload.answer);
        else if (payload.type === "ice" && payload.candidate) await peer.current.addIceCandidate(payload.candidate);
      });
      await room.subscribe(async (state) => { if (state === "SUBSCRIBED") { await room.send({ type: "broadcast", event: "signal", payload: { type: "join" } satisfies Signal }); if (mounted) setStatus("En attente de l'autre participant..."); } });
      connection.onconnectionstatechange = () => { if (mounted && connection.connectionState === "connected") setStatus("Appel vidéo connecté"); if (mounted && ["failed", "disconnected"].includes(connection.connectionState)) setStatus("Connexion vidéo interrompue"); };
    }
    void start();
    return () => { mounted = false; localStream.current?.getTracks().forEach((track) => track.stop()); peer.current?.close(); if (channel.current) void channel.current.unsubscribe(); };
  }, [roomId]);

  function toggleTrack(kind: "video" | "audio") { const track = localStream.current?.getTracks().find((item) => item.kind === kind); if (!track) return; track.enabled = !track.enabled; if (kind === "video") setCamera(track.enabled); else setMicrophone(track.enabled); }

  return <div className="mt-4"><div className="grid gap-3 sm:grid-cols-2"><div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-[#1b2c45]"><video ref={remoteVideo} autoPlay playsInline className="h-full w-full object-cover" /><span className="absolute bottom-3 left-3 rounded-lg bg-black/50 px-2 py-1 text-xs">Professeur</span></div><div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-[#1b2c45]"><video ref={localVideo} autoPlay muted playsInline className="h-full w-full object-cover" /><span className="absolute bottom-3 left-3 rounded-lg bg-black/50 px-2 py-1 text-xs">Vous</span></div></div><p className="mt-3 text-center text-sm text-slate-400">{status}</p><div className="mt-3 flex justify-center gap-2"><button onClick={() => toggleTrack("audio")} className="rounded-full bg-white/10 px-4 py-2 text-sm">{microphone ? "🎙 Micro" : "🔇 Muet"}</button><button onClick={() => toggleTrack("video")} className="rounded-full bg-white/10 px-4 py-2 text-sm">{camera ? "▣ Caméra" : "Caméra off"}</button></div></div>;
}
