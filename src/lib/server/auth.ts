/* eslint-disable @typescript-eslint/no-explicit-any */
import { cookies } from "next/headers";
import { prisma } from "@/lib/server/prisma";
import { fallbackStore } from "./fallback-store";
import { supabaseAuth } from "@/lib/server/supabase-auth";

export async function getCurrentUser(request?: Request) {
  let userId: string | undefined;

  // 1. Try to read from request headers if passed
  if (request) {
    const headerUserId = request.headers.get("x-user-id");
    if (headerUserId && headerUserId !== "undefined" && headerUserId !== "null") {
      userId = headerUserId;
    }

    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ") && supabaseAuth) {
      const token = authHeader.substring(7);
      try {
        const { data } = await supabaseAuth.auth.getUser(token);
        if (data?.user?.id) userId = data.user.id;
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
        userId =
          cookiesMap["profy_user_id"] ||
          cookiesMap["profyspace_user_id"] ||
          cookiesMap["user_id"];

        if (!userId && cookiesMap["profy_supabase_access_token"] && supabaseAuth) {
          try {
            const { data } = await supabaseAuth.auth.getUser(cookiesMap["profy_supabase_access_token"]);
            if (data?.user?.id) userId = data.user.id;
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
          if (data?.user?.id) userId = data.user.id;
        } catch {}
      }

      if (!userId) {
        userId =
          cookieStore.get("profy_user_id")?.value ||
          cookieStore.get("profyspace_user_id")?.value ||
          cookieStore.get("user_id")?.value;
      }
    } catch {}
  }

  if (!userId) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    if (user) {
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
