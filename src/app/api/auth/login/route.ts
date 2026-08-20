import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { loginSchema } from "@/lib/validation/login";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Email ou mot de passe invalide." }, { status: 400 });

  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, role: true, passwordHash: true } });
    if (!user || !(await compare(parsed.data.password, user.passwordHash))) return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 401 });

    const response = NextResponse.json({ role: user.role }, { status: 200 });
    response.cookies.set("profy_user_id", user.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 7, path: "/" });
    response.cookies.set("profy_role", user.role, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 7, path: "/" });
    return response;
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "La base de données est indisponible." }, { status: 503 });
  }
}
