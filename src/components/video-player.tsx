"use client";

import { parseVideoSource } from "@/lib/video-utils";

type VideoPlayerProps = {
  src: string | null | undefined;
  title?: string;
  className?: string;
};

export function VideoPlayer({ src, title = "Vidéo du cours", className = "" }: VideoPlayerProps) {
  if (!src || !src.trim()) {
    return (
      <div className={`flex items-center justify-center bg-slate-900 text-white text-xs p-6 ${className}`}>
        Aucune vidéo associée à cette leçon.
      </div>
    );
  }

  const parsed = parseVideoSource(src);

  if (parsed.type === "youtube") {
    return (
      <div className={`relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-inner ${className}`}>
        <iframe
          src={parsed.embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </div>
    );
  }

  if (parsed.type === "vimeo") {
    return (
      <div className={`relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-inner ${className}`}>
        <iframe
          src={parsed.embedUrl}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </div>
    );
  }

  return (
    <div className={`relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-inner ${className}`}>
      <video
        controls
        playsInline
        className="h-full w-full object-contain"
        src={parsed.directUrl}
      >
        Votre navigateur ne prend pas en charge la lecture de cette vidéo.
      </video>
    </div>
  );
}
