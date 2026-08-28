import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { getVerificationDocumentSignedUrl } from "@/lib/server/verification-storage";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { id } = await params;
  const documents = await prisma.teacherVerificationDocument.findMany({
    where: { teacherId: id },
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
