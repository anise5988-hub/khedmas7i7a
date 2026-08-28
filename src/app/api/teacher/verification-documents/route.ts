import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import {
  uploadVerificationDocument,
  getVerificationDocumentSignedUrl,
} from "@/lib/server/verification-storage";

export const runtime = "nodejs";

const ALLOWED_TYPES = ["NATIONAL_ID", "DIPLOMA", "CERTIFICATE", "OTHER"];
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user?.teacher) {
    return NextResponse.json({ error: "Réservé aux enseignants." }, { status: 403 });
  }

  const documents = await prisma.teacherVerificationDocument.findMany({
    where: { teacherId: user.teacher.id },
    orderBy: { createdAt: "desc" },
  });

  const withUrls = await Promise.all(
    documents.map(async (doc) => ({
      id: doc.id,
      type: doc.type,
      fileName: doc.fileName,
      createdAt: doc.createdAt,
      url: await getVerificationDocumentSignedUrl(doc.storagePath),
    })),
  );

  return NextResponse.json({ documents: withUrls });
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user?.teacher) {
    return NextResponse.json({ error: "Réservé aux enseignants." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const type = String(formData.get("type") || "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: "Type de document invalide." }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Le fichier doit être un PDF, JPG, PNG ou WebP." }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Le fichier ne doit pas dépasser 10 MB." }, { status: 413 });
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const path = `${user.teacher.id}/${type}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const uploadResult = await uploadVerificationDocument(path, bytes, file.type);
  if (uploadResult.error) {
    console.error("Verification document upload failed", uploadResult.error);
    return NextResponse.json({ error: "Impossible d'envoyer le document. Réessayez." }, { status: 502 });
  }

  const document = await prisma.$transaction(async (tx) => {
    const created = await tx.teacherVerificationDocument.create({
      data: {
        teacherId: user.teacher!.id,
        type: type as "NATIONAL_ID" | "DIPLOMA" | "CERTIFICATE" | "OTHER",
        storagePath: path,
        fileName: file.name,
        mimeType: file.type,
      },
    });

    // Uploading evidence moves a fresh application out of PENDING and into
    // the admin review queue. Don't touch it if it's already been reviewed
    // (APPROVED/REJECTED/SUSPENDED) — re-uploading a document shouldn't
    // silently reset an admin's prior decision.
    await tx.teacherProfile.updateMany({
      where: { id: user.teacher!.id, verificationStatus: "PENDING" },
      data: { verificationStatus: "UNDER_REVIEW" },
    });

    return created;
  });

  const url = await getVerificationDocumentSignedUrl(path);

  return NextResponse.json(
    {
      success: true,
      document: { id: document.id, type: document.type, fileName: document.fileName, createdAt: document.createdAt, url },
    },
    { status: 201 },
  );
}
