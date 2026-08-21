import { compare, hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { loginSchema } from "@/lib/validation/login";
import { fallbackStore } from "@/lib/server/fallback-store";
import { supabaseAuth } from "@/lib/server/supabase-auth";
import { ensureUserProfile } from "@/lib/server/profile-sync";

async function safeComparePassword(plainPassword: string, hashInDb?: string | null): Promise<boolean> {
  if (!hashInDb || hashInDb === "supabase_auth" || hashInDb === "google_oauth") return false;
  try {
    return await compare(plainPassword, hashInDb);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email ou mot de passe invalide." }, { status: 400 });
  }

  const cleanEmail = parsed.data.email.toLowerCase().trim();
  const password = parsed.data.password;

  const cookieOptions = {
    path: "/",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  };

  // 1. Direct database authentication via Prisma first (Fast & Reliable)
  try {
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: cleanEmail,
          mode: "insensitive",
        },
      },
      include: {
        wallet: true,
        teacher: true,
        student: true,
      },
    });

    if (user) {
      if (user.passwordHash === "google_oauth") {
        return NextResponse.json(
          { error: "Ce compte a été créé via Google. Veuillez vous connecter avec le bouton 'Continuer avec Google'." },
          { status: 400 }
        );
      }

      const isPasswordValid = await safeComparePassword(password, user.passwordHash);

      if (isPasswordValid) {
        // Auto-create wallet if missing
        let wallet = user.wallet;
        if (!wallet) {
          try {
            wallet = await prisma.wallet.create({
              data: { userId: user.id, availableMillimes: 0, pendingMillimes: 0 },
            });
          } catch {}
        }

        const userData = {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          availableTnd: (wallet?.availableMillimes ?? 0) / 1000,
        };

        const response = NextResponse.json({
          success: true,
          role: user.role,
          user: userData,
        }, { status: 200 });

        response.cookies.set("profy_user_id", user.id, { ...cookieOptions, httpOnly: true });
        response.cookies.set("profy_role", user.role, { ...cookieOptions, httpOnly: true });
        response.cookies.set("profyspace_user_id", user.id, { ...cookieOptions, httpOnly: false });

        return response;
      }
    }
  } catch (dbError) {
    console.warn("Prisma login query error", dbError);
  }

  // 2. Try Supabase Auth if direct bcrypt did not match
  if (supabaseAuth) {
    try {
      const { data, error } = await supabaseAuth.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (!error && data.user) {
        const metadata = (data.user?.user_metadata || {}) as {
          firstName?: string;
          lastName?: string;
          phone?: string;
          role?: "STUDENT" | "TEACHER" | "ADMIN";
        };

        const profile = await ensureUserProfile({
          id: data.user.id,
          email: data.user.email || cleanEmail,
          firstName: metadata.firstName,
          lastName: metadata.lastName,
          phone: metadata.phone,
          role: metadata.role,
        });

        // Synchronize bcrypt hash in database for fast subsequent logins
        try {
          const freshHash = await hash(password, 12);
          await prisma.user.update({
            where: { id: profile.id },
            data: { passwordHash: freshHash },
          });
          fallbackStore.updateUser(profile.id, { passwordHash: freshHash });
        } catch {}

        const response = NextResponse.json({
          success: true,
          user: {
            id: profile.id,
            firstName: profile.firstName,
            lastName: profile.lastName,
            email: profile.email,
            role: profile.role,
          },
          role: profile.role,
        });

        response.cookies.set("profy_supabase_access_token", data.session?.access_token || "", {
          ...cookieOptions,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60,
        });
        response.cookies.set("profy_user_id", profile.id, { ...cookieOptions, httpOnly: true });
        response.cookies.set("profy_role", profile.role, { ...cookieOptions, httpOnly: true });
        response.cookies.set("profyspace_user_id", profile.id, { ...cookieOptions, httpOnly: false });
        return response;
      }
    } catch (supabaseErr) {
      console.warn("Supabase signInWithPassword failed", supabaseErr);
    }
  }

  // 3. Check in-memory fallback store
  const fallbackUser = fallbackStore.getUserByEmail(cleanEmail);
  if (fallbackUser && (await safeComparePassword(password, fallbackUser.passwordHash))) {
    const userData = {
      id: fallbackUser.id,
      firstName: fallbackUser.firstName,
      lastName: fallbackUser.lastName,
      email: fallbackUser.email,
      role: fallbackUser.role,
      availableTnd: 0,
    };

    const response = NextResponse.json({
      success: true,
      role: fallbackUser.role,
      user: userData,
    }, { status: 200 });

    response.cookies.set("profy_user_id", fallbackUser.id, { ...cookieOptions, httpOnly: true });
    response.cookies.set("profy_role", fallbackUser.role, { ...cookieOptions, httpOnly: true });
    response.cookies.set("profyspace_user_id", fallbackUser.id, { ...cookieOptions, httpOnly: false });

    return response;
  }

  return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 401 });
}

