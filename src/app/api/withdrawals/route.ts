import { NextResponse } from "next/server";
import { calculateTeacherWithdrawal } from "@/lib/finance/withdrawal";
import { withdrawalRequestSchema } from "@/lib/validation/withdrawal";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = withdrawalRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données de retrait invalides.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const breakdown = calculateTeacherWithdrawal(parsed.data.amountInMillimes);

  // Persistence and authentication belong here when the database adapter is connected.
  return NextResponse.json(
    {
      status: "PENDING",
      method: parsed.data.method,
      ...breakdown,
    },
    { status: 201 },
  );
}
