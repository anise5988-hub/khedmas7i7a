import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

const defaultTeachers = [
  {
    id: "teach_trabelsi_1",
    slug: "yassine-trabelsi",
    avatarUrl: null,
    initials: "YT",
    name: "Yassine Trabelsi",
    title: "Enseignant agrégé en Mathématiques",
    bio: "Plus de 10 ans d'expérience dans l'enseignement des mathématiques pour le lycée et la préparation aux examens de Baccalauréat.",
    subjects: ["Mathématiques", "Physique"],
    subject: "Mathématiques",
    level: "Lycée & Baccalauréat",
    city: "Tunis",
    governorate: "Tunis",
    rate: 35,
    hourlyRateMillimes: 35000,
    rating: 4.9,
    reviewsCount: 18,
    experience: 10,
    online: true,
    inPerson: true,
    verificationStatus: "APPROVED",
  },
  {
    id: "teach_mejri_2",
    slug: "sarra-mejri",
    avatarUrl: null,
    initials: "SM",
    name: "Sarra Mejri",
    title: "Professeure de Physique-Chimie",
    bio: "Spécialiste de la méthode expérimentale et soutien scolaire ciblé pour la réussite au Bac et cours universitaires.",
    subjects: ["Physique", "Chimie"],
    subject: "Physique",
    level: "Collège & Lycée",
    city: "Sousse",
    governorate: "Sousse",
    rate: 30,
    hourlyRateMillimes: 30000,
    rating: 4.8,
    reviewsCount: 14,
    experience: 6,
    online: true,
    inPerson: false,
    verificationStatus: "APPROVED",
  },
  {
    id: "teach_nasri_3",
    slug: "amine-nasri",
    avatarUrl: null,
    initials: "AN",
    name: "Amine Nasri",
    title: "Professeur de Français & Littérature",
    bio: "Préparation aux épreuves écrites et orales du Baccalauréat. Pédagogie active et progrès rapides garantis.",
    subjects: ["Français", "Littérature"],
    subject: "Français",
    level: "Tous niveaux",
    city: "Sfax",
    governorate: "Sfax",
    rate: 28,
    hourlyRateMillimes: 28000,
    rating: 5.0,
    reviewsCount: 22,
    experience: 8,
    online: true,
    inPerson: true,
    verificationStatus: "APPROVED",
  },
  {
    id: "teach_benali_4",
    slug: "meryem-ben-ali",
    avatarUrl: null,
    initials: "MB",
    name: "Meryem Ben Ali",
    title: "Professeure d'Informatique & Algo",
    bio: "Cours d'Algorithmique, Python et bases de données pour élèves de secondaire et étudiants.",
    subjects: ["Informatique", "Algorithmique", "Python"],
    subject: "Informatique",
    level: "Lycée & Supérieur",
    city: "Ariana",
    governorate: "Ariana",
    rate: 32,
    hourlyRateMillimes: 32000,
    rating: 4.9,
    reviewsCount: 11,
    experience: 5,
    online: true,
    inPerson: true,
    verificationStatus: "APPROVED",
  },
];

export async function GET() {
  try {
    const profiles = await prisma.teacherProfile.findMany({
      where: {
        OR: [
          { verificationStatus: "APPROVED" },
          { verificationStatus: "PENDING" },
        ],
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        subjects: { select: { subject: true } },
        reviews: { select: { rating: true } },
        availabilities: true,
      },
      orderBy: { id: "desc" },
    });

    if (!profiles || profiles.length === 0) {
      return NextResponse.json(defaultTeachers);
    }

    const dbTeachers = profiles.map((profile) => {
      const initials = `${profile.user?.firstName?.[0] ?? "P"}${profile.user?.lastName?.[0] ?? "R"}`.toUpperCase();
      const name = `${profile.user?.firstName || "Enseignant"} ${profile.user?.lastName || "ProfySpace"}`.trim();
      const avgRating =
        profile.reviews.length > 0
          ? Number((profile.reviews.reduce((acc, r) => acc + r.rating, 0) / profile.reviews.length).toFixed(1))
          : 5.0;

      return {
        id: profile.id,
        slug: profile.slug,
        avatarUrl: profile.avatarUrl,
        initials,
        name,
        title: profile.title ?? "Professeur particulier",
        bio: profile.bio ?? "",
        subjects: profile.subjects.map((s) => s.subject),
        subject: profile.subjects[0]?.subject ?? "Général",
        level: "Tous niveaux",
        city: profile.city ?? profile.governorate ?? "Tunisie",
        governorate: profile.governorate ?? "Tunis",
        rate: (profile.hourlyRateMillimes || 25000) / 1000,
        hourlyRateMillimes: profile.hourlyRateMillimes || 25000,
        rating: avgRating,
        reviewsCount: profile.reviews.length,
        experience: profile.experienceYears,
        online: profile.online,
        inPerson: profile.inPerson,
        availabilities: profile.availabilities,
        verificationStatus: profile.verificationStatus,
      };
    });

    return NextResponse.json(dbTeachers);
  } catch (error) {
    console.warn("Teachers fetch failed, returning default teachers", error);
    return NextResponse.json(defaultTeachers);
  }
}
