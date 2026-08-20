import { cookies } from "next/headers";
import { prisma } from "@/lib/server/prisma";

export async function getCurrentUser() {
  try {
    let cookieStore;
    try {
      cookieStore = await cookies();
    } catch {
      return null;
    }
    const userId = cookieStore?.get("profy_user_id")?.value;
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

    return user;
  } catch (error) {
    console.error("Failed to get current user:", error);
    return null;
  }
}
