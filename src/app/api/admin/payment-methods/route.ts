import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { logAdminAction } from "@/lib/server/audit-log";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const methods = await prisma.paymentMethod.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return NextResponse.json({ methods });
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const recipientTitle = typeof body?.recipientTitle === "string" ? body.recipientTitle.trim() : "";
  const recipientValue = typeof body?.recipientValue === "string" ? body.recipientValue.trim() : "";
  const instructions = typeof body?.instructions === "string" ? body.instructions.trim() : "";

  if (!name || name.length > 100) {
    return NextResponse.json({ error: "Nom de la méthode invalide (1 à 100 caractères)." }, { status: 400 });
  }
  if (!recipientTitle || recipientTitle.length > 100) {
    return NextResponse.json({ error: "Intitulé du champ destinataire invalide." }, { status: 400 });
  }
  if (!instructions || instructions.length > 1000) {
    return NextResponse.json({ error: "Instructions invalides (1 à 1000 caractères)." }, { status: 400 });
  }

  try {
    const maxOrder = await prisma.paymentMethod.aggregate({ _max: { sortOrder: true } });
    const method = await prisma.paymentMethod.create({
      data: {
        name,
        recipientTitle,
        recipientValue: recipientValue || null,
        instructions,
        enabled: typeof body?.enabled === "boolean" ? body.enabled : true,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });

    await logAdminAction({ actor: user, action: "PAYMENT_METHOD_CREATED", targetType: "PaymentMethod", targetId: method.id, metadata: { name } });

    return NextResponse.json({ method }, { status: 201 });
  } catch (error) {
    console.error("Failed to create payment method", error);
    return NextResponse.json({ error: "Impossible de créer la méthode de paiement." }, { status: 500 });
  }
}
