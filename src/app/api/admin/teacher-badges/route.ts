import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { logAdminAction } from "@/lib/server/audit-log";

const GRANTABLE_SLUGS = [
  "premier-cours-donne",
  "professeur-populaire",
  "excellence-pedagogique",
  "veteran-profyspace",
] as const;

async function requireAdmin(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });

  const grants = await prisma.teacherManualBadge.findMany({
    orderBy: { createdAt: "desc" },
    include: { teacher: { include: { user: { select: { firstName: true, lastName: true, email: true } } } } },
  });
  return NextResponse.json({
    grants: grants.map((g) => ({
      id: g.id,
      slug: g.slug,
      reason: g.reason,
      createdAt: g.createdAt,
      teacherProfileId: g.teacherProfileId,
      teacherName: `${g.teacher.user.firstName} ${g.teacher.user.lastName}`.trim(),
      teacherEmail: g.teacher.user.email,
    })),
    grantableSlugs: GRANTABLE_SLUGS,
  });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const slug = typeof body?.slug === "string" ? body.slug : "";
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 300) : "";

  if (!email) return NextResponse.json({ error: "Email du professeur requis." }, { status: 400 });
  if (!(GRANTABLE_SLUGS as readonly string[]).includes(slug)) {
    return NextResponse.json({ error: "Badge inconnu." }, { status: 400 });
  }

  const teacher = await prisma.teacherProfile.findFirst({
    where: { user: { email } },
    select: { id: true, user: { select: { firstName: true, lastName: true } } },
  });
  if (!teacher) return NextResponse.json({ error: "Aucun professeur avec cet email." }, { status: 404 });

  const grant = await prisma.teacherManualBadge.upsert({
    where: { teacherProfileId_slug: { teacherProfileId: teacher.id, slug } },
    create: { teacherProfileId: teacher.id, slug, reason: reason || null, grantedById: admin.id },
    update: { reason: reason || null, grantedById: admin.id },
  });

  await logAdminAction({
    actor: admin,
    action: "TEACHER_BADGE_GRANTED",
    targetType: "TeacherProfile",
    targetId: teacher.id,
    metadata: { slug, reason: reason || null },
  });

  return NextResponse.json({ grant }, { status: 201 });
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });

  const existing = await prisma.teacherManualBadge.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Attribution introuvable." }, { status: 404 });

  await prisma.teacherManualBadge.delete({ where: { id } });
  await logAdminAction({
    actor: admin,
    action: "TEACHER_BADGE_REVOKED",
    targetType: "TeacherProfile",
    targetId: existing.teacherProfileId,
    metadata: { slug: existing.slug },
  });

  return NextResponse.json({ success: true });
}
