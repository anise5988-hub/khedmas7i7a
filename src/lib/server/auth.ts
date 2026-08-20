import { cookies } from "next/headers";
import { prisma } from "@/lib/server/prisma";

export async function getCurrentUser(request?: Request) {
  try {
    let userId: string | undefined;

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

    if (!user) return null;

    // Auto-create wallet if missing
    if (!user.wallet) {
      const createdWallet = await prisma.wallet.create({
        data: { userId: user.id, availableMillimes: 0, pendingMillimes: 0 },
      });
      user.wallet = createdWallet;
    }

    return user;
  } catch (error) {
    console.error("Failed to get current user:", error);
    return null;
  }
}
