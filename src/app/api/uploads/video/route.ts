import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Réservé aux enseignants" }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_VIDEO_BUCKET || "course-videos";
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Le stockage vidéo n'est pas configuré." }, { status: 503 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier vidéo manquant." }, { status: 400 });
  }
  if (!file.type.startsWith("video/")) {
    return NextResponse.json({ error: "Le fichier doit être une vidéo." }, { status: 400 });
  }
  if (file.size > 500 * 1024 * 1024) {
    return NextResponse.json({ error: "La vidéo ne doit pas dépasser 500 MB." }, { status: 413 });
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "mp4";
  const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await supabase.storage.from(bucket).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (result.error) {
    console.error("Video upload failed", result.error);
    return NextResponse.json({ error: "Impossible d'envoyer la vidéo. Vérifiez le bucket Supabase." }, { status: 502 });
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path, name: file.name });
}