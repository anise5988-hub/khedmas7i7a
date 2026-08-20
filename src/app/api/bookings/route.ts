import { NextResponse } from "next/server";
import { bookingRequestSchema } from "@/lib/validation/booking";

export async function POST(request: Request) {
  const parsed = bookingRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Données de réservation invalides.", issues: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.startsAt <= new Date()) return NextResponse.json({ error: "La séance doit être programmée dans le futur." }, { status: 400 });
  return NextResponse.json({ status: "PENDING", paymentStatus: "PENDING", ...parsed.data }, { status: 201 });
}
