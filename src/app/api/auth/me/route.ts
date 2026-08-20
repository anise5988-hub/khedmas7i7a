import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      teacher: user.teacher
        ? {
            id: user.teacher.id,
            slug: user.teacher.slug,
            avatarUrl: user.teacher.avatarUrl,
            title: user.teacher.title,
            bio: user.teacher.bio,
            experienceYears: user.teacher.experienceYears,
            hourlyRateMillimes: user.teacher.hourlyRateMillimes,
            governorate: user.teacher.governorate,
            city: user.teacher.city,
            online: user.teacher.online,
            inPerson: user.teacher.inPerson,
            verificationStatus: user.teacher.verificationStatus,
            subjects: user.teacher.subjects.map((s) => s.subject),
            availabilities: user.teacher.availabilities,
          }
        : null,
      student: user.student,
      wallet: user.wallet,
    },
  });
}
