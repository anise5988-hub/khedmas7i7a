import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Le stockage vidéo n'est pas configuré." }, { status: 503 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier vidéo manquant." }, { status: 400 });
  }
  const kind = String(formData.get("kind") || "video");

  // Images (avatars, news thumbnails, review photos, portfolio previews) are
  // fine coming from any authenticated user; video/PDF course material stays
  // teacher/admin only.
  if (kind !== "image" && kind !== "attachment" && user.role !== "TEACHER" && user.role !== "ADMIN" && !user.teacher) {
    return NextResponse.json({ error: "Réservé aux enseignants" }, { status: 403 });
  }
  // Avatars must be publicly viewable by anyone browsing a teacher's
  // profile, unlike paid lesson videos/PDFs — so they go in their own
  // public bucket instead of the private course-videos bucket, whose
  // getPublicUrl() output 404s for anonymous visitors. Message attachments
  // (homework photos, small PDFs) are public too but get their own folder,
  // both to keep the avatars bucket tidy and to make them easy to purge.
  // Portfolio videos are the same case as avatars, not paid course videos —
  // a portfolio exists to be shown to visitors deciding whether to book, so
  // it went through "video" (the private bucket) and 403'd for every
  // visitor who clicked one, portfolio owner included. They get their own
  // public bucket rather than "avatars", which is capped at images only.
  const bucket =
    kind === "image" || kind === "attachment"
      ? process.env.SUPABASE_AVATAR_BUCKET || "avatars"
      : kind === "portfolio-video"
      ? process.env.SUPABASE_PORTFOLIO_VIDEO_BUCKET || "portfolio-videos"
      : process.env.SUPABASE_VIDEO_BUCKET || "course-videos";
  const allowed =
    kind === "pdf" || kind === "attachment"
      ? file.type === "application/pdf" || file.type.startsWith("image/")
      : kind === "image"
      ? file.type.startsWith("image/")
      : file.type.startsWith("video/");
  if (!allowed) {
    return NextResponse.json(
      {
        error:
          kind === "pdf"
            ? "Le fichier doit être un PDF."
            : kind === "image"
            ? "Le fichier doit être une image."
            : kind === "attachment"
            ? "La pièce jointe doit être une image ou un PDF."
            : "Le fichier doit être une vidéo.",
      },
      { status: 400 },
    );
  }
  // 50MB is the actual Supabase project cap on both video buckets (checked
  // directly against the storage API) - the videos here were previously
  // sized against a 500MB limit that doesn't exist on this plan, so an
  // upload between 50 and 500MB passed this check and then failed at
  // Supabase with a generic, confusing error.
  const maxSize =
    kind === "video" || kind === "portfolio-video" ? 50 * 1024 * 1024 : kind === "pdf" ? 25 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json({ error: `Le fichier ne doit pas dépasser ${kind === "video" || kind === "portfolio-video" ? "50" : kind === "pdf" ? "25" : "10"} MB.` }, { status: 413 });
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || (kind === "pdf" ? "pdf" : kind === "image" ? "jpg" : "mp4");
  // Attachments are grouped by conversation later on; the flat per-user
  // folder keeps ownership obvious in the bucket.
  const folder = kind === "attachment" ? "attachments" : kind;
  const path = `${user.id}/${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await supabase.storage.from(bucket).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (result.error) {
    console.error("Video upload failed", result.error);
    return NextResponse.json({ error: "Impossible d'envoyer la vidéo. Vérifiez le bucket Supabase." }, { status: 502 });
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path, name: file.name, kind });
}