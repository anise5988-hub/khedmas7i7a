import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { registerSchema } from "@/lib/validation/auth";
import { fallbackStore } from "@/lib/server/fallback-store";
import { supabaseAuth } from "@/lib/server/supabase-auth";

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Vérifie les informations saisies.", issues: parsed.error.flatten() }, { status: 400 });

  if (supabaseAuth) {
    const { data, error } = await supabaseAuth.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin}/auth/callback`, data: { firstName: parsed.data.firstName, lastName: parsed.data.lastName, role: parsed.data.role, phone: parsed.data.phone || "" } },
    });
    if (error || !data.user) return NextResponse.json({ error: error?.message || "Inscription impossible." }, { status: 400 });
    try {
      await prisma.user.create({
        data: {
          id: data.user.id,
          email: parsed.data.email,
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          phone: parsed.data.phone || null,
          passwordHash: "supabase_auth",
          role: parsed.data.role,
          wallet: { create: {} },
          ...(parsed.data.role === "STUDENT"
            ? { student: { create: {} } }
            : {
                teacher: {
                  create: {
                    slug: `${parsed.data.firstName}-${parsed.data.lastName}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
                    hourlyRateMillimes: 0,
                  },
                },
              }),
        },
      });
    } catch (profileError) {
      console.error("Supabase user profile sync failed", profileError);
      return NextResponse.json({ error: "Compte créé, mais votre profil n'a pas pu être initialisé. Réessayez." }, { status: 503 });
    }
    return NextResponse.json({ success: true, user: data.user, requiresEmailConfirmation: !data.session, message: "Compte créé. Consultez votre email pour confirmer votre adresse." }, { status: 201 });
  }

  const passwordHash = await hash(parsed.data.password, 12);

  try {
    const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existingUser) return NextResponse.json({ error: "Cette adresse email est déjà utilisée." }, { status: 409 });

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
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
    });

    const response = NextResponse.json({
      success: true,
      user,
      message: "Compte créé avec succès !",
    }, { status: 201 });

    const cookieOptions = {
      path: "/",
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 30,
    };

    response.cookies.set("profy_user_id", user.id, { ...cookieOptions, httpOnly: true });
    response.cookies.set("profy_role", user.role, { ...cookieOptions, httpOnly: true });
    response.cookies.set("profyspace_user_id", user.id, { ...cookieOptions, httpOnly: false });

    return response;
  } catch (error) {
    console.warn("Prisma registration failed, falling back to in-memory store", error);

    // Fallback in-memory user creation so user is never blocked
    const fallbackUser = await fallbackStore.createUser({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      passwordHash,
      role: parsed.data.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: fallbackUser.id,
        firstName: fallbackUser.firstName,
        lastName: fallbackUser.lastName,
        email: fallbackUser.email,
        role: fallbackUser.role,
      },
      message: "Compte créé avec succès !",
    }, { status: 201 });

    const cookieOptions = {
      path: "/",
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 30,
    };

    response.cookies.set("profy_user_id", fallbackUser.id, { ...cookieOptions, httpOnly: true });
    response.cookies.set("profy_role", fallbackUser.role, { ...cookieOptions, httpOnly: true });
    response.cookies.set("profyspace_user_id", fallbackUser.id, { ...cookieOptions, httpOnly: false });

    return response;
  }
}
