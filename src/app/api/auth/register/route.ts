import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { registerSchema } from "@/lib/validation/auth";
import { fallbackStore } from "@/lib/server/fallback-store";
import { supabaseAuth } from "@/lib/server/supabase-auth";
import { sendTransactionalEmail } from "@/lib/server/email";

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Vérifie les informations saisies.", issues: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;

  if (supabaseAuth) {
    const { data, error } = await supabaseAuth.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin}/auth/callback`,
        data: { firstName: input.firstName, lastName: input.lastName, role: input.role, phone: input.phone || "" },
      },
    });

    if (error || !data.user) {
      console.error("Supabase sign-up failed", { message: error?.message, status: error?.status, code: error?.code });
      return NextResponse.json({ error: error?.message || "Inscription impossible." }, { status: 400 });
    }

    try {
      const user = await prisma.user.upsert({
        where: { id: data.user.id },
        update: { email: input.email, firstName: input.firstName, lastName: input.lastName, phone: input.phone || null },
        create: {
          id: data.user.id,
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone || null,
          passwordHash: "supabase_auth",
          role: input.role,
        },
      });

      await prisma.wallet.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });

      if (input.role === "STUDENT") {
        await prisma.studentProfile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
      } else {
        const slug = `${input.firstName}-${input.lastName}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        await prisma.teacherProfile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id, slug, hourlyRateMillimes: 25000, experienceYears: 1, verificationStatus: "PENDING" } });
      }
    } catch (profileError) {
      console.error("Supabase user profile sync failed", profileError);
      return NextResponse.json({ error: "Votre compte email existe, mais l'initialisation du profil a échoué. Cliquez sur Réessayer ou contactez le support.", retryProfileSync: true }, { status: 503 });
    }

    // Also send welcome / confirmation email via Brevo transactional email
    await sendTransactionalEmail({
      to: input.email,
      name: input.firstName,
      subject: "Bienvenue sur Profy ! Confirmez votre adresse email",
      title: "Bienvenue sur ProfySpace.tn",
      message: `Bonjour ${input.firstName}, votre compte ${input.role === "TEACHER" ? "Professeur" : "Élève"} a été créé avec succès. Veuillez confirmer votre adresse email pour profiter de toutes les fonctionnalités.`,
      link: "/login",
    });

    return NextResponse.json({
      success: true,
      user: data.user,
      requiresEmailConfirmation: !data.session,
      message: "Compte créé. Consultez votre email pour confirmer votre adresse.",
    }, { status: 201 });
  }

  // Fallback direct DB registration when Supabase Auth is not enabled
  const passwordHash = await hash(input.password, 12);

  try {
    const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
    if (existingUser) return NextResponse.json({ error: "Cette adresse email est déjà utilisée." }, { status: 409 });

    const user = await prisma.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone || null,
        passwordHash,
        role: input.role,
        wallet: { create: {} },
        ...(input.role === "STUDENT"
          ? { student: { create: {} } }
          : {
              teacher: {
                create: {
                  slug: `${input.firstName}-${input.lastName}-${Date.now()}`
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

    await sendTransactionalEmail({
      to: input.email,
      name: input.firstName,
      subject: "Bienvenue sur Profy !",
      title: "Bienvenue sur ProfySpace.tn",
      message: `Bonjour ${input.firstName}, votre compte ${input.role === "TEACHER" ? "Professeur" : "Élève"} a été créé avec succès.`,
      link: "/login",
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

    const fallbackUser = await fallbackStore.createUser({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      passwordHash,
      role: input.role,
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
