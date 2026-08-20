/* eslint-disable @typescript-eslint/no-explicit-any */
import { cookies } from "next/headers";
import { prisma } from "@/lib/server/prisma";
import { fallbackStore } from "./fallback-store";
import { supabaseAuth } from "@/lib/server/supabase-auth";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getCurrentUser(..._args: [Request?]) {
  let userId: string | undefined;

  if (supabaseAuth) {
    try {
      const cookieStore = await cookies();
      const accessToken = cookieStore.get("profy_supabase_access_token")?.value;
      if (accessToken) {
        const { data } = await supabaseAuth.auth.getUser(accessToken);
        userId = data.user?.id;
      }
    } catch {
      // Fall through to the legacy server cookie lookup.
    }
  }

  try {
    // Authentication is established by a server-set cookie. Never trust a user ID
    // supplied by browser JavaScript: it can be changed by the caller.
    // Supabase bearer-token validation can be added here when SSR session cookies
    // are enabled; the legacy client ID header is intentionally ignored.

    // Check server cookies
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
