import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getStudentAchievements } from "@/lib/server/achievements";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const achievements = await getStudentAchievements(user.id);
    return NextResponse.json({ achievements });
  } catch (error) {
    console.error("Student achievements fetch failed", error);
    return NextResponse.json({ error: "Impossible de charger vos badges." }, { status: 500 });
  }
}
