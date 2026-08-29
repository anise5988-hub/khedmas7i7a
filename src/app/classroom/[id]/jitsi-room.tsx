"use client";

import { useEffect, useRef, useState } from "react";

type JitsiExternalApi = {
  addEventListener: (event: string, handler: (...args: unknown[]) => void) => void;
  dispose: () => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
};

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiExternalApi;
  }
}

const JITSI_DOMAIN = "meet.jit.si";

let scriptLoadPromise: Promise<void> | null = null;
function loadJitsiScript(): Promise<void> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://${JITSI_DOMAIN}/external_api.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("load failed"));
    document.body.appendChild(script);
  });
  return scriptLoadPromise;
}

export function JitsiRoom({
  bookingId,
  currentUserName,
  onStatusChange,
  onAudioMuteChange,
  onVideoMuteChange,
}: {
  bookingId: string;
  currentUserName: string;
  onStatusChange?: (status: "connecting" | "connected" | "error") => void;
  onAudioMuteChange?: (muted: boolean) => void;
  onVideoMuteChange?: (muted: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiExternalApi | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    onStatusChange?.("connecting");

    function sendLeave() {
      const url = `/api/classroom/${bookingId}/session/leave`;
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([], { type: "application/json" }));
      } else {
        fetch(url, { method: "POST", keepalive: true }).catch(() => {});
      }
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

        await loadJitsiScript();
        if (!mounted || !containerRef.current || !window.JitsiMeetExternalAPI) return;

        const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName: data.roomName,
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          userInfo: { displayName: currentUserName },
          configOverwrite: {
            prejoinPageEnabled: false,
            disableDeepLinking: true,
          },
        });
        apiRef.current = api;

        api.addEventListener("videoConferenceJoined", () => {
          if (!mounted) return;
          setConnected(true);
          onStatusChange?.("connected");
          fetch(`/api/classroom/${bookingId}/session/join`, { method: "POST" }).catch(() => {});
        });
        api.addEventListener("videoConferenceLeft", () => {
          sendLeave();
        });
        api.addEventListener("audioMuteStatusChanged", (payload: unknown) => {
          const muted = (payload as { muted?: boolean } | undefined)?.muted;
          if (typeof muted === "boolean") onAudioMuteChange?.(muted);
        });
        api.addEventListener("videoMuteStatusChanged", (payload: unknown) => {
          const muted = (payload as { muted?: boolean } | undefined)?.muted;
          if (typeof muted === "boolean") onVideoMuteChange?.(muted);
        });

        window.addEventListener("beforeunload", sendLeave);
      } catch {
        if (mounted) {
          setError("Erreur de connexion à la salle vidéo. Vérifiez votre connexion internet.");
          onStatusChange?.("error");
        }
      }
    }

    void start();

    return () => {
      mounted = false;
      window.removeEventListener("beforeunload", sendLeave);
      if (apiRef.current) {
        sendLeave();
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, currentUserName]);

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-slate-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-[400px]">
      {!connected && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0c1626]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#72d6bf] border-t-transparent" />
          <p className="text-sm text-slate-300">Connexion à la salle...</p>
        </div>
      )}
      <div ref={containerRef} className="h-full min-h-[400px] w-full" />
    </div>
  );
}
