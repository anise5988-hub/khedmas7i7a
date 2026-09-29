import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

/**
 * Public list of enabled deposit (wallet recharge) methods — admin-managed
 * via /admin/payment-methods, no fixed set baked into the code.
 */
export async function GET() {
  try {
    const methods = await prisma.paymentMethod.findMany({
      where: { enabled: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({
      methods: methods.map((m) => ({
        id: m.id,
        name: m.name,
        recipientTitle: m.recipientTitle,
        copyValue: m.recipientValue || "",
        displayValue: m.recipientValue || "Non configuré",
        instructions: m.instructions,
        enabled: m.enabled,
      })),
    });
  } catch (error) {
    console.error("Failed to load deposit methods", error);
    return NextResponse.json({ methods: [] });
  }
}
