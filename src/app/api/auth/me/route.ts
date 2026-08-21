import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const response = NextResponse.json({
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
            subjects: (user.teacher.subjects as Array<{ subject: string } | string>).map((s) => (typeof s === "string" ? s : s.subject)),
            availabilities: user.teacher.availabilities,
          }
        : null,
      student: user.student,
      wallet: user.wallet,
    },
  });

  const cookieOptions = { path: "/", sameSite: "lax" as const, maxAge: 60 * 60 * 24 * 30 };
  response.cookies.set("profy_user_id", user.id, { ...cookieOptions, httpOnly: true });
  response.cookies.set("profy_role", user.role, { ...cookieOptions, httpOnly: true });
  response.cookies.set("profyspace_user_id", user.id, { ...cookieOptions, httpOnly: false });

  return response;
}
