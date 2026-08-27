import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const content = await prisma.homepageContent.findFirst();
  return NextResponse.json({ content });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Données requises manquantes." }, { status: 400 });

  try {
    const existing = await prisma.homepageContent.findFirst();
    const data = {
      ...(typeof body.heroTitlePrefix === "string" ? { heroTitlePrefix: body.heroTitlePrefix.trim() } : {}),
      ...(typeof body.heroTitleHighlight === "string" ? { heroTitleHighlight: body.heroTitleHighlight.trim() } : {}),
      ...(typeof body.heroDescription === "string" ? { heroDescription: body.heroDescription.trim() } : {}),
      ...(typeof body.bannerMessage === "string" ? { bannerMessage: body.bannerMessage.trim() || null } : {}),
      ...(typeof body.bannerLinkUrl === "string" ? { bannerLinkUrl: body.bannerLinkUrl.trim() || null } : {}),
      ...(typeof body.bannerLinkLabel === "string" ? { bannerLinkLabel: body.bannerLinkLabel.trim() || null } : {}),
      ...(typeof body.bannerActive === "boolean" ? { bannerActive: body.bannerActive } : {}),
    };

    const content = existing
      ? await prisma.homepageContent.update({ where: { id: existing.id }, data })
      : await prisma.homepageContent.create({ data });

    return NextResponse.json({ success: true, content });
  } catch (error) {
    console.error("Homepage content update failed", error);
    return NextResponse.json({ error: "Impossible d'enregistrer le contenu." }, { status: 500 });
  }
}
