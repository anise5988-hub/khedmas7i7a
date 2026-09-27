import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getTeacherAchievements } from "@/lib/server/achievements";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || !user.teacher) {
    return NextResponse.json({ error: "Réservé aux enseignants" }, { status: 403 });
  }

  try {
    const achievements = await getTeacherAchievements(user.teacher.id, user.createdAt);
    return NextResponse.json({ achievements });
  } catch (error) {
    console.error("Teacher achievements fetch failed", error);
    return NextResponse.json({ error: "Impossible de charger vos badges." }, { status: 500 });
  }
}
