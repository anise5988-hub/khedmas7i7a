import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  try {
    const profiles = await prisma.teacherProfile.findMany({ where: { verificationStatus: "APPROVED" }, orderBy: { id: "desc" } });
    const teachers = await Promise.all(profiles.map(async (profile) => {
      const [user, subjectRows] = await Promise.all([prisma.user.findUnique({ where: { id: profile.userId }, select: { firstName: true, lastName: true } }), prisma.teacherSubject.findMany({ where: { teacherId: profile.id }, select: { subject: true }, take: 1 })]);
      return { slug: profile.slug, initials: `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase(), name: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim(), subject: subjectRows[0]?.subject ?? "", level: "", city: profile.city ?? profile.governorate ?? "Tunisie", rate: profile.hourlyRateMillimes / 1000, rating: 0, experience: profile.experienceYears, online: profile.online, inPerson: profile.inPerson, language: "" };
    }));
    return NextResponse.json(teachers);
  } catch (error) { console.error("Teachers fetch failed", error); return NextResponse.json({ error: "Impossible de charger les professeurs." }, { status: 503 }); }
}
