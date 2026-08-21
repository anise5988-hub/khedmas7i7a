/* eslint-disable @typescript-eslint/no-explicit-any */
import { cookies } from "next/headers";
import { prisma } from "@/lib/server/prisma";
import { fallbackStore } from "./fallback-store";
import { supabaseAuth } from "@/lib/server/supabase-auth";
import { ensureUserProfile } from "./profile-sync";

export async function getCurrentUser(request?: Request) {
  let userId: string | undefined;
  let supabaseUserData: any = null;

  // 1. Resolve identity from server-controlled session material only.
  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ") && supabaseAuth) {
      const token = authHeader.substring(7);
      try {
        const { data } = await supabaseAuth.auth.getUser(token);
        if (data?.user?.id) {
          userId = data.user.id;
          supabaseUserData = data.user;
        }
      } catch {}
    }

    if (!userId) {
      const cookieHeader = request.headers.get("cookie");
      if (cookieHeader) {
        const cookiesMap = Object.fromEntries(
          cookieHeader.split(";").map((c) => {
            const [k, ...v] = c.trim().split("=");
            return [k, decodeURIComponent(v.join("="))];
          })
        );
        userId = cookiesMap["profy_user_id"];

        if (!userId && cookiesMap["profy_supabase_access_token"] && supabaseAuth) {
          try {
            const { data } = await supabaseAuth.auth.getUser(cookiesMap["profy_supabase_access_token"]);
            if (data?.user?.id) {
              userId = data.user.id;
              supabaseUserData = data.user;
            }
          } catch {}
        }
      }
    }
  }

  // 2. Try next/headers cookies()
  if (!userId) {
    try {
      const cookieStore = await cookies();
      const accessToken = cookieStore.get("profy_supabase_access_token")?.value;
      if (accessToken && supabaseAuth) {
        try {
          const { data } = await supabaseAuth.auth.getUser(accessToken);
          if (data?.user?.id) {
            userId = data.user.id;
            supabaseUserData = data.user;
          }
        } catch {}
      }

      if (!userId) {
        userId = cookieStore.get("profy_user_id")?.value;
      }
    } catch {}
  }

  if (!userId) return null;

  try {
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          ...(supabaseUserData?.email ? [{ email: supabaseUserData.email.toLowerCase().trim() }] : []),
        ],
      },
      include: {
        student: true,
        teacher: {
          include: {
            subjects: true,
            availabilities: true,
          },
        },
        wallet: true,
      },
    });

    // Auto-sync if authenticated in Supabase but not yet synced to Prisma
    if (!user && supabaseUserData) {
      const meta = supabaseUserData.user_metadata || {};
      user = (await ensureUserProfile({
        id: supabaseUserData.id,
        email: supabaseUserData.email || "",
        firstName: meta.firstName,
        lastName: meta.lastName,
        phone: meta.phone,
        role: meta.role === "TEACHER" ? "TEACHER" : "STUDENT",
      })) as any;
    }

    if (user) {
      // If user has a teacher profile, ensure their role is TEACHER
      if (user.teacher && user.role !== "ADMIN" && user.role !== "TEACHER") {
        user.role = "TEACHER";
        try {
          await prisma.user.update({ where: { id: user.id }, data: { role: "TEACHER" } });
        } catch {}
      }

      // If user role is TEACHER but teacher profile missing, create it
      if (user.role === "TEACHER" && !user.teacher) {
        try {
          const slug = `${user.firstName}-${user.lastName}-${Date.now()}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
          const teacher = await prisma.teacherProfile.create({
            data: {
              userId: user.id,
              slug,
              hourlyRateMillimes: 25000,
              experienceYears: 1,
              verificationStatus: "PENDING",
              online: true,
            },
            include: { subjects: true, availabilities: true },
          });
          user.teacher = teacher;
        } catch {}
      }

      // Auto-create wallet if missing
      if (!user.wallet) {
        try {
          const createdWallet = await prisma.wallet.create({
            data: { userId: user.id, availableMillimes: 0, pendingMillimes: 0 },
          });
          user.wallet = createdWallet;
        } catch {}
      }
      return user;
    }
  } catch (dbError) {
    console.warn("Prisma user lookup failed, using fallback store", dbError);
  }

  // Fallback in-memory lookup
  const fallbackUser = fallbackStore.getUserById(userId);
  if (fallbackUser) {
    return fallbackUser as any;
  }

  return null;
}

