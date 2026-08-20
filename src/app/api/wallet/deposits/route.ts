import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/server/prisma";
import { depositSchema } from "@/lib/validation/deposit";

export async function POST(request: Request) {
  const userId = (await cookies()).get("profy_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const parsed = depositSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Montant, méthode ou référence invalide." }, { status: 400 });
  try {
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return NextResponse.json({ error: "Wallet introuvable." }, { status: 404 });
    const deposit = await prisma.walletDeposit.create({ data: { walletId: wallet.id, ...parsed.data } });
    return NextResponse.json({ status: deposit.status, id: deposit.id, message: "Demande reçue. Le solde sera crédité après vérification." }, { status: 201 });
  } catch (error) { console.error("Wallet deposit failed", error); return NextResponse.json({ error: "Cette référence existe déjà ou le service est indisponible." }, { status: 409 }); }
}
