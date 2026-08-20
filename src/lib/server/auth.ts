/* eslint-disable @typescript-eslint/no-explicit-any */
import { cookies } from "next/headers";
import { prisma } from "@/lib/server/prisma";
import { fallbackStore } from "./fallback-store";

export async function getCurrentUser(request?: Request) {
  let userId: string | undefined;

  try {
    // 1. Check header if request is provided
    if (request) {
      const headerUserId = request.headers.get("x-user-id");
      if (headerUserId && headerUserId.trim()) {
        userId = headerUserId.trim();
      }
    }

    // 2. Check cookies
    if (!userId) {
      try {
        const cookieStore = await cookies();
        userId =
          cookieStore.get("profy_user_id")?.value ||
          cookieStore.get("profyspace_user_id")?.value ||
          cookieStore.get("user_id")?.value;
      } catch {
        // cookies() context unavailable
      }
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
  } catch (error) {
    console.error("Failed to get current user:", error);
    if (userId) {
      const fallbackUser = fallbackStore.getUserById(userId);
      if (fallbackUser) return fallbackUser as any;
    }
    return null;
  }
}
