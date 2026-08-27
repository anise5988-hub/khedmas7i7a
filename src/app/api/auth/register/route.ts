import { hash } from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
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
  const passwordHash = await hash(input.password, 12);

  if (supabaseAuth) {
    const { data, error } = await supabaseAuth.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin}/auth/callback`,
        data: { firstName: input.firstName, lastName: input.lastName, role: input.role, phone: input.phone || "" },
      },
    });

    // Supabase's own confirmation email is a separate, independently
    // flaky service (SMTP failures, its built-in send-rate limit) from
    // the rest of account creation. When it's the ONLY thing that failed,
    // don't block signup entirely — fall through to the direct-DB path
    // below, the same one used when Supabase Auth isn't configured at
    // all. A genuine validation failure (email taken, weak password,
    // etc.) still stops registration here. Matches on both the error
    // code (over_email_send_rate_limit) and the two message strings
    // actually observed from Supabase for this failure family — SMTP
    // failure ("Error sending confirmation email") and rate limiting
    // ("email rate limit exceeded").
    const isEmailDeliveryFailure =
      error?.code === "over_email_send_rate_limit" ||
      /error sending confirmation email|email rate limit/i.test(error?.message || "");

    if (error && !isEmailDeliveryFailure) {
      console.error("Supabase sign-up failed", { message: error?.message, status: error?.status, code: error?.code });
      return NextResponse.json({ error: error?.message || "Inscription impossible." }, { status: 400 });
    }

    if (data.user && !isEmailDeliveryFailure) {
      try {
        const user = await prisma.user.upsert({
          where: { id: data.user.id },
          update: { email: input.email, firstName: input.firstName, lastName: input.lastName, phone: input.phone || null, passwordHash },
          create: {
            id: data.user.id,
            email: input.email,
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone || null,
            passwordHash,
            role: input.role,
          },
        });

        await prisma.wallet.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });

        if (input.role === "STUDENT") {
          await prisma.studentProfile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
        } else {
          const slug = `${input.firstName}-${input.lastName}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          await prisma.teacherProfile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id, slug, hourlyRateMillimes: 25000, experienceYears: 1, verificationStatus: "APPROVED" } });
        }

        // Sync fallback store
        fallbackStore.updateUser(user.id, {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          passwordHash,
        });
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

    console.warn("Supabase sign-up email delivery failed — falling back to direct registration", error?.message);
    if (data.user) {
      // Supabase already created an auth user before the email step
      // failed; clean it up (needs the service-role key — the anon
      // client used for signUp can't do admin operations) so the
      // direct-DB path below doesn't leave an orphaned, duplicate auth
      // identity sitting alongside the real account.
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (serviceRoleKey && supabaseUrl) {
        const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
        await adminClient.auth.admin.deleteUser(data.user.id).catch(() => {});
      }
    }
  }

  // Fallback direct DB registration when Supabase Auth is not enabled,
  // or when it's configured but its confirmation email delivery failed.
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
                  hourlyRateMillimes: 25000,
                  experienceYears: 1,
                  verificationStatus: "APPROVED",
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
    // A real database write failure must never be silently swapped for a
    // fake in-memory account: that account looks like a success to the
    // user right now, then evaporates on the next server instance/cold
    // start (it isn't shared across serverless invocations), leaving them
    // locked out with no idea why. Fail loudly and let them retry instead.
    console.error("Registration failed — database write did not succeed", error);
    return NextResponse.json(
      { error: "Impossible de créer votre compte pour le moment. Veuillez réessayer dans quelques secondes." },
      { status: 503 },
    );
  }
}
