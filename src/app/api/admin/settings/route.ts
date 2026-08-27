import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { logAdminAction } from "@/lib/server/audit-log";

export async function PATCH(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      commissionRate,
      minWithdrawalTnd,
      d17Enabled,
      flouciEnabled,
      bankTransferEnabled,
      supportEmail,
      supportPhone,
      d17Recipient,
      flouciRecipient,
      bankRib,
    } = body;

    const settings = await prisma.platformSettings.upsert({
      where: { id: "default" },
      update: {
        ...(typeof commissionRate === "number" ? { commissionRate } : {}),
        ...(typeof minWithdrawalTnd === "number" ? { minWithdrawalTnd } : {}),
        ...(typeof d17Enabled === "boolean" ? { d17Enabled } : {}),
        ...(typeof flouciEnabled === "boolean" ? { flouciEnabled } : {}),
        ...(typeof bankTransferEnabled === "boolean" ? { bankTransferEnabled } : {}),
        ...(typeof supportEmail === "string" ? { supportEmail } : {}),
        ...(typeof supportPhone === "string" ? { supportPhone } : {}),
        ...(typeof d17Recipient === "string" ? { d17Recipient } : {}),
        ...(typeof flouciRecipient === "string" ? { flouciRecipient } : {}),
        ...(typeof bankRib === "string" ? { bankRib } : {}),
      },
      create: {
        id: "default",
        commissionRate: typeof commissionRate === "number" ? commissionRate : 10,
        minWithdrawalTnd: typeof minWithdrawalTnd === "number" ? minWithdrawalTnd : 10,
        d17Enabled: typeof d17Enabled === "boolean" ? d17Enabled : true,
        flouciEnabled: typeof flouciEnabled === "boolean" ? flouciEnabled : true,
        bankTransferEnabled: typeof bankTransferEnabled === "boolean" ? bankTransferEnabled : true,
        supportEmail: typeof supportEmail === "string" ? supportEmail : "profyspace@gmail.com",
        supportPhone: typeof supportPhone === "string" ? supportPhone : "+216 58 249 938",
        d17Recipient: typeof d17Recipient === "string" ? d17Recipient : null,
        flouciRecipient: typeof flouciRecipient === "string" ? flouciRecipient : null,
        bankRib: typeof bankRib === "string" ? bankRib : null,
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
