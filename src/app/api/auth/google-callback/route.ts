import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { fallbackStore } from "@/lib/server/fallback-store";
import { supabaseAuth } from "@/lib/server/supabase-auth";
import { ensureUserProfile } from "@/lib/server/profile-sync";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || !body.email) {
    return NextResponse.json({ error: "Email requis." }, { status: 400 });
  }

  const email = String(body.email).toLowerCase().trim();
  const firstName = String(body.firstName || "Utilisateur").trim();
  const lastName = String(body.lastName || "Google").trim();
  const requestedRole = body.role === "TEACHER" ? "TEACHER" : "STUDENT";

  if (supabaseAuth && body.accessToken) {
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(String(body.accessToken));
    if (authError || !authData.user || authData.user.email?.toLowerCase() !== email) return NextResponse.json({ error: "Session Google invalide." }, { status: 401 });
    try {
      const metadata = ((authData as unknown as { user_metadata?: unknown }).user_metadata || {}) as { firstName?: string; lastName?: string; phone?: string; role?: string };
      const syncedUser = await ensureUserProfile({ id: authData.user.id, email, firstName: String(metadata.firstName || firstName), lastName: String(metadata.lastName || lastName), phone: String(metadata.phone || ""), role: metadata.role === "TEACHER" ? "TEACHER" : requestedRole });
      const response = NextResponse.json({ success: true, role: syncedUser.role, user: { id: syncedUser.id, firstName: syncedUser.firstName, lastName: syncedUser.lastName, email: syncedUser.email, role: syncedUser.role }, needsPasswordSetup: false });
      response.cookies.set("profy_supabase_access_token", String(body.accessToken), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 });
      return response;
    } catch (error) {
      console.error("Google profile synchronization failed", error);
      return NextResponse.json({ error: "Connexion Google réussie, mais votre profil n'a pas pu être initialisé. Réessayez." }, { status: 503 });
    }
  }

  const cookieOptions = {
    path: "/",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  };

  try {
    let isNewUser = false;
    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        wallet: true,
        teacher: true,
        student: true,
      },
    });

    if (!user) {
      isNewUser = true;
      // Create user if does not exist
      user = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          passwordHash: "google_oauth_user",
          role: requestedRole,
          student: requestedRole === "STUDENT" ? { create: {} } : undefined,
          teacher:
            requestedRole === "TEACHER"
              ? {
                  create: {
                    slug: `${firstName}-${lastName}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                    experienceYears: 1,
                    hourlyRateMillimes: 25000,
                    online: true,
                    inPerson: false,
                    verificationStatus: "PENDING",
                  },
                }
              : undefined,
          wallet: { create: { availableMillimes: 0, pendingMillimes: 0 } },
        },
        include: {
          wallet: true,
          teacher: true,
          student: true,
        },
      });
    }

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

    const needsPasswordSetup = isNewUser || user.passwordHash === "google_oauth_user";

    const response = NextResponse.json({
      success: true,
      role: user.role,
      user: userData,
      needsPasswordSetup,
    });

    response.cookies.set("profy_user_id", user.id, { ...cookieOptions, httpOnly: true });
    response.cookies.set("profy_role", user.role, { ...cookieOptions, httpOnly: true });
    response.cookies.set("profyspace_user_id", user.id, { ...cookieOptions, httpOnly: false });

    return response;
  } catch (dbError) {
    console.warn("Prisma Google callback failed, using fallback store", dbError);
  }

  // Fallback Store support
  let isFallbackNewUser = false;
  let fallbackUser = fallbackStore.getUserByEmail(email);
  if (!fallbackUser) {
    isFallbackNewUser = true;
    fallbackUser = await fallbackStore.createUser({
      firstName,
      lastName,
      email,
      passwordHash: "google_oauth_user",
      role: requestedRole,
    });
  }

  const userData = {
    id: fallbackUser.id,
    firstName: fallbackUser.firstName,
    lastName: fallbackUser.lastName,
    email: fallbackUser.email,
    role: fallbackUser.role,
    availableTnd: 0,
  };

  const needsPasswordSetup = isFallbackNewUser || fallbackUser.passwordHash === "google_oauth_user";

  const response = NextResponse.json({
    success: true,
    role: fallbackUser.role,
    user: userData,
    needsPasswordSetup,
  });

  response.cookies.set("profy_user_id", fallbackUser.id, { ...cookieOptions, httpOnly: true });
  response.cookies.set("profy_role", fallbackUser.role, { ...cookieOptions, httpOnly: true });
  response.cookies.set("profyspace_user_id", fallbackUser.id, { ...cookieOptions, httpOnly: false });

  return response;
}
