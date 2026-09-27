import type { MetadataRoute } from "next";
import { prisma } from "@/lib/server/prisma";
import { getApprovedTeachers } from "@/lib/server/teachers-directory";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://profyspace.online";

  const staticRoutes: {
    path: string;
    priority: number;
    changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  }[] = [
    { path: "", priority: 1, changeFrequency: "daily" },
    { path: "/teachers", priority: 0.9, changeFrequency: "daily" },
    { path: "/courses", priority: 0.9, changeFrequency: "daily" },
    { path: "/subjects", priority: 0.7, changeFrequency: "weekly" },
    { path: "/levels", priority: 0.7, changeFrequency: "weekly" },
    { path: "/how-it-works", priority: 0.5, changeFrequency: "monthly" },
    { path: "/about", priority: 0.5, changeFrequency: "monthly" },
    { path: "/faq", priority: 0.5, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.4, changeFrequency: "monthly" },
    { path: "/login", priority: 0.3, changeFrequency: "yearly" },
    { path: "/register", priority: 0.3, changeFrequency: "yearly" },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const [teachers, courses] = await Promise.all([
    getApprovedTeachers().catch(() => []),
    prisma.course
      .findMany({
        where: { visibility: { in: ["PUBLIC", "LOCKED"] } },
        select: { id: true, updatedAt: true },
      })
      .catch(() => []),
  ]);

  const teacherEntries: MetadataRoute.Sitemap = teachers.map((teacher) => ({
    url: `${baseUrl}/teachers/${teacher.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const courseEntries: MetadataRoute.Sitemap = courses.map((course) => ({
    url: `${baseUrl}/courses/${course.id}`,
    lastModified: course.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticEntries, ...teacherEntries, ...courseEntries];
}
