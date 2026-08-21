import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { loginSchema } from "@/lib/validation/login";
import { fallbackStore } from "@/lib/server/fallback-store";
import { supabaseAuth } from "@/lib/server/supabase-auth";
import { ensureUserProfile } from "@/lib/server/profile-sync";

async function safeComparePassword(plainPassword: string, hashInDb: string): Promise<boolean> {
  if (!hashInDb) return false;
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

  if (supabaseAuth) {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
    if (!error && data.user) {
      if (!data.user.email_confirmed_at) return NextResponse.json({ error: "Veuillez confirmer votre adresse email avant de vous connecter.", requiresEmailConfirmation: true }, { status: 403 });
      const metadata = (data.user?.user_metadata || {}) as { firstName?: string; lastName?: string; phone?: string; role?: string };
      try {
        const profile = await ensureUserProfile({ id: data.user.id, email: data.user.email || parsed.data.email, firstName: metadata.firstName, lastName: metadata.lastName, phone: metadata.phone });
        const response = NextResponse.json({ success: true, user: { id: profile.id, firstName: profile.firstName, lastName: profile.lastName, email: profile.email, role: profile.role }, role: profile.role });
        const cookieOptions = { path: "/", sameSite: "lax" as const, maxAge: 60 * 60 * 24 * 30 };
        response.cookies.set("profy_supabase_access_token", data.session?.access_token || "", { ...cookieOptions, httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 });
        response.cookies.set("profy_user_id", profile.id, { ...cookieOptions, httpOnly: true });
        response.cookies.set("profy_role", profile.role, { ...cookieOptions, httpOnly: true });
        response.cookies.set("profyspace_user_id", profile.id, { ...cookieOptions, httpOnly: false });
        return response;
      } catch (profileError) {
        console.error("Supabase login profile synchronization failed", profileError);
        return NextResponse.json({ error: "Connexion réussie, mais votre profil n'est pas encore initialisé. Réessayez." }, { status: 503 });
      }
    }
    // Keep legacy Prisma accounts usable while Supabase migration is in progress.
    console.warn("Supabase login failed; trying legacy account", { message: error?.message, code: error?.code });
  }

  const cookieOptions = {
    path: "/",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  };

  try {
    const cleanEmail = parsed.data.email.trim();
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

    if (user && (await safeComparePassword(parsed.data.password, user.passwordHash))) {
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
  } catch (dbError) {
    console.warn("Prisma login query failed, checking fallback store", dbError);
  }

  // Check in-memory store
  const fallbackUser = fallbackStore.getUserByEmail(parsed.data.email);
  if (fallbackUser && (await safeComparePassword(parsed.data.password, fallbackUser.passwordHash))) {
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
