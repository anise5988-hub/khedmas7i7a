import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { coursesStore } from "@/lib/server/courses-store";


export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ courses: [] });
  try {
    const purchased = coursesStore.getStudentPurchasedCourses(user.id);
    const publicCourses = coursesStore.getAllCourses({ visibility: "PUBLIC" });
    const purchasedIds = new Set(purchased.map((entry) => entry.course.id));
    return NextResponse.json({ courses: [
      ...purchased.map((entry) => ({ course: entry.course, access: entry.access })),
      ...publicCourses.filter((course) => !purchasedIds.has(course.id)).map((course) => ({
        course,
        access: { id: `free_${course.id}`, courseId: course.id, studentId: user.id, purchasedAt: course.createdAt, amountPaidTnd: 0 },
      })),
    ] });
  } catch (error) {
    console.error("My learning courses fetch error", error);
    return NextResponse.json({ courses: [] });
  }
}