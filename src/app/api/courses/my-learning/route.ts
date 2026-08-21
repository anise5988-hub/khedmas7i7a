import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { coursesStore } from "@/lib/server/courses-store";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ courses: [] });
  }

  try {
    const purchased = coursesStore.getStudentPurchasedCourses(user.id);
    const publicCourses = coursesStore.getAllCourses({ visibility: "PUBLIC" });

    const allMyCourses = [
      ...purchased.map((p) => ({ course: p.course, access: p.access })),
      ...publicCourses
        .filter((c) => !purchased.some((p) => p.course.id === c.id))
        .map((c) => ({
          course: c,
          access: { id: `free_${c.id}`, courseId: c.id, studentId: user.id, purchasedAt: c.createdAt, amountPaidTnd: 0 },
        })),
    ];

    return NextResponse.json({ courses: allMyCourses });
  } catch (err) {
    console.error("My learning courses fetch error", err);
    return NextResponse.json({ courses: [] });
  }
}
