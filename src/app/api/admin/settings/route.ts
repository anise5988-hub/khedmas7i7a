import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { logAdminAction } from "@/lib/server/audit-log";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const settings = await prisma.platformSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    });
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to load platform settings", error);
    return NextResponse.json({ error: "Impossible de charger les paramètres." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { commissionRate, minWithdrawalTnd, supportEmail, supportPhone } = body;

    const settings = await prisma.platformSettings.upsert({
      where: { id: "default" },
      update: {
        ...(typeof commissionRate === "number" ? { commissionRate } : {}),
        ...(typeof minWithdrawalTnd === "number" ? { minWithdrawalTnd } : {}),
        ...(typeof supportEmail === "string" ? { supportEmail } : {}),
        ...(typeof supportPhone === "string" ? { supportPhone } : {}),
      },
      create: {
        id: "default",
        commissionRate: typeof commissionRate === "number" ? commissionRate : 10,
        minWithdrawalTnd: typeof minWithdrawalTnd === "number" ? minWithdrawalTnd : 10,
        supportEmail: typeof supportEmail === "string" ? supportEmail : "profyspace@gmail.com",
        supportPhone: typeof supportPhone === "string" ? supportPhone : "+216 58 249 938",
      },
    });

    await logAdminAction({
      actor: user,
      action: "PLATFORM_SETTINGS_UPDATED",
      targetType: "PlatformSettings",
      targetId: settings.id,
      metadata: { changedFields: Object.keys(body) },
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("Failed to update platform settings", error);
    return NextResponse.json({ error: "Impossible d'enregistrer les paramètres." }, { status: 500 });
  }
}
