import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN" && !user.teacher)) {
    return NextResponse.json({ error: "Réservé aux enseignants" }, { status: 403 });
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
  // Avatars must be publicly viewable by anyone browsing a teacher's
  // profile, unlike paid lesson videos/PDFs — so they go in their own
  // public bucket instead of the private course-videos bucket, whose
  // getPublicUrl() output 404s for anonymous visitors.
  const bucket = kind === "image" ? process.env.SUPABASE_AVATAR_BUCKET || "avatars" : process.env.SUPABASE_VIDEO_BUCKET || "course-videos";
  const allowed = kind === "pdf" ? file.type === "application/pdf" : kind === "image" ? file.type.startsWith("image/") : file.type.startsWith("video/");
  if (!allowed) {
    return NextResponse.json({ error: kind === "pdf" ? "Le fichier doit être un PDF." : kind === "image" ? "Le fichier doit être une image." : "Le fichier doit être une vidéo." }, { status: 400 });
  }
  const maxSize = kind === "video" ? 500 * 1024 * 1024 : kind === "pdf" ? 25 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json({ error: `Le fichier ne doit pas dépasser ${kind === "video" ? "500" : kind === "pdf" ? "25" : "10"} MB.` }, { status: 413 });
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || (kind === "pdf" ? "pdf" : kind === "image" ? "jpg" : "mp4");
  const path = `${user.id}/${kind}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await supabase.storage.from(bucket).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (result.error) {
    console.error("Video upload failed", result.error);
    return NextResponse.json({ error: "Impossible d'envoyer la vidéo. Vérifiez le bucket Supabase." }, { status: 502 });
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path, name: file.name, kind });
}