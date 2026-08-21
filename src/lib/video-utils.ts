export type ParsedVideo = {
  type: "youtube" | "vimeo" | "direct" | "unknown";
  embedUrl: string;
  directUrl: string;
  rawUrl: string;
};

export function parseVideoSource(url: string | null | undefined): ParsedVideo {
  if (!url || !url.trim()) {
    return { type: "unknown", embedUrl: "", directUrl: "", rawUrl: "" };
  }

  const clean = url.trim();

  // 1. YouTube Matcher
  // Matches:
  // https://www.youtube.com/watch?v=dQw4w9WgXcQ
  // https://youtu.be/dQw4w9WgXcQ
  // https://www.youtube.com/embed/dQw4w9WgXcQ
  // https://www.youtube.com/shorts/dQw4w9WgXcQ
  // https://m.youtube.com/watch?v=dQw4w9WgXcQ
  const ytRegex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const ytMatch = clean.match(ytRegex);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      type: "youtube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`,
      directUrl: clean,
      rawUrl: clean,
    };
  }

  // 2. Vimeo Matcher
  const vimeoRegex = /(?:vimeo\.com\/)(\d+)/i;
  const vimeoMatch = clean.match(vimeoRegex);
  if (vimeoMatch && vimeoMatch[1]) {
    const vimeoId = vimeoMatch[1];
    return {
      type: "vimeo",
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
      directUrl: clean,
      rawUrl: clean,
    };
  }

  // 3. Direct Video File (MP4, WebM, blob:, data:video/...)
  return {
    type: "direct",
    embedUrl: clean,
    directUrl: clean,
    rawUrl: clean,
  };
}
