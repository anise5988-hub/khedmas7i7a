import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { registerSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Vérifie les informations saisies.", issues: parsed.error.flatten() }, { status: 400 });

  try {
    const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existingUser) return NextResponse.json({ error: "Cette adresse email est déjà utilisée." }, { status: 409 });

    const passwordHash = await hash(parsed.data.password, 12);
    const user = await prisma.user.create({
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        passwordHash,
        role: parsed.data.role,
        wallet: { create: {} },
        ...(parsed.data.role === "STUDENT"
          ? { student: { create: {} } }
          : {
              teacher: {
                create: {
                  slug: `${parsed.data.firstName}-${parsed.data.lastName}-${Date.now()}`
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, ""),
                  hourlyRateMillimes: 0,
                },
              },
            }),
      },
      select: { id: true, role: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Registration failed", error);
    return NextResponse.json({ error: "La base de données n'est pas configurée ou est temporairement indisponible." }, { status: 503 });
  }
}
