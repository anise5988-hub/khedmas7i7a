import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  try {
    let settings = await prisma.platformSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      settings = await prisma.platformSettings.create({
        data: {
          id: "default",
          commissionRate: 10,
          minWithdrawalTnd: 10,
          d17Enabled: true,
          flouciEnabled: true,
          bankTransferEnabled: true,
          supportEmail: "profyspace@gmail.com",
          supportPhone: "+216 58 249 938",
        },
      });
    }

    const methods = [
      {
        id: "D17",
        name: "La Poste Tunisienne (D17)",
        recipientTitle: "Numéro D17",
        copyValue: settings.d17Recipient || "",
        displayValue: settings.d17Recipient || "Non configuré",
        instructions: "Effectuez le transfert depuis votre application D17 vers ce numéro, puis saisissez le numéro de transaction reçu par SMS.",
        enabled: settings.d17Enabled,
      },
      {
        id: "FLOUCI",
        name: "Flouci Wallet",
        recipientTitle: "Numéro Flouci",
        copyValue: settings.flouciRecipient || "",
        displayValue: settings.flouciRecipient || "Non configuré",
        instructions: "Transférez le montant vers ce numéro sur Flouci puis collez la référence de transfert.",
        enabled: settings.flouciEnabled,
      },
      {
        id: "BANK_TRANSFER",
        name: "Virement Bancaire (RIB)",
        recipientTitle: "RIB Bancaire",
        copyValue: settings.bankRib || "",
        displayValue: settings.bankRib || "Non configuré",
        instructions: "Effectuez votre virement vers ce RIB et mentionnez votre Nom & Prénom en libellé.",
        enabled: settings.bankTransferEnabled,
      },
    ];

    return NextResponse.json({ methods: methods.filter((m) => m.enabled) });
  } catch (error) {
    console.error("Failed to load deposit methods", error);
    return NextResponse.json({
      methods: [
        {
          id: "D17",
          name: "La Poste Tunisienne (D17)",
          recipientTitle: "Numéro D17",
          copyValue: "",
          displayValue: "Non disponible",
          instructions: "Veuillez contacter le support pour obtenir les coordonnées de paiement.",
          enabled: true,
        },
      ],
    });
  }
}
