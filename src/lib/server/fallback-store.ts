export type StoredDeposit = {
  id: string;
  userId: string;
  method: string;
  amountMillimes: number;
  amountTnd: number;
  reference: string;
  status: string;
  createdAt: Date;
};

export type StoredTransaction = {
  id: string;
  type: string;
  amountMillimes: number;
  reference?: string | null;
  createdAt: Date;
};

export type StoredTeacherReview = {
  id: string;
  studentName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type StoredUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  passwordHash: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  createdAt: Date;
  student?: {
    id: string;
    userId: string;
    levelSlug?: string | null;
    governorate?: string | null;
  } | null;
  teacher?: {
    id: string;
    userId: string;
    slug: string;
    avatarUrl?: string | null;
    title?: string | null;
    bio?: string | null;
    experienceYears: number;
    hourlyRateMillimes: number;
    governorate?: string | null;
    city?: string | null;
    online: boolean;
    inPerson: boolean;
    verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
    subjects: string[];
    rating?: number;
    reviewsCount?: number;
    reviews?: StoredTeacherReview[];
    availabilities: { id: string; dayOfWeek: number; startTime: string; endTime: string }[];
  } | null;
  wallet?: {
    id: string;
    userId: string;
    availableMillimes: number;
    pendingMillimes: number;
    deposits: StoredDeposit[];
    transactions: StoredTransaction[];
  } | null;
};

const SEED_TEACHERS: StoredUser[] = [
  {
    id: "user_teacher_mehdi_ben_amor",
    email: "mehdi.benamor@profyspace.tn",
    firstName: "Mehdi",
    lastName: "Ben Amor",
    phone: "+216 98 123 456",
    passwordHash: "seed_hash_profy",
    role: "TEACHER",
    createdAt: new Date("2025-01-15T08:00:00Z"),
    teacher: {
      id: "teach_mehdi_ben_amor",
      userId: "user_teacher_mehdi_ben_amor",
      slug: "mehdi-ben-amor",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
      title: "Professeur de Mathématiques - Spécialiste Bac & Supérieur",
      bio: "Professeur agrégé avec plus de 12 ans d'expérience dans l'enseignement des mathématiques. Préparation intensive aux épreuves du Baccalauréat (Sections Maths, Sciences, Technique) et prépa. Pédagogie méthodique et exercices d'application corrigés.",
      experienceYears: 12,
      hourlyRateMillimes: 35000,
      governorate: "Tunis",
      city: "Centre Urbain Nord / Ennasr",
      online: true,
      inPerson: true,
      verificationStatus: "APPROVED",
      subjects: ["Mathématiques", "Probabilités & Statistiques"],
      rating: 4.9,
      reviewsCount: 48,
      reviews: [
        {
          id: "rev_mehdi_1",
          studentName: "Amine G.",
          rating: 5,
          comment: "Excellente pédagogie ! Grâce à Si Mehdi, j'ai obtenu 18.25 au Bac Mathématiques. Explications très claires sur l'analyse et les nombres complexes.",
          createdAt: new Date("2026-01-20").toISOString(),
        },
        {
          id: "rev_mehdi_2",
          studentName: "Sarra K.",
          rating: 5,
          comment: "Professeur très ponctuel et disponible. Les résumés de cours et les fiches d'exercices sont d'une grande aide.",
          createdAt: new Date("2026-02-05").toISOString(),
        },
      ],
      availabilities: [
        { id: "av_1", dayOfWeek: 1, startTime: "17:00", endTime: "20:00" },
        { id: "av_2", dayOfWeek: 3, startTime: "16:00", endTime: "20:00" },
        { id: "av_3", dayOfWeek: 6, startTime: "09:00", endTime: "18:00" },
        { id: "av_4", dayOfWeek: 0, startTime: "10:00", endTime: "16:00" },
      ],
    },
  },
  {
    id: "user_teacher_sonia_gharbi",
    email: "sonia.gharbi@profyspace.tn",
    firstName: "Sonia",
    lastName: "Gharbi",
    phone: "+216 97 654 321",
    passwordHash: "seed_hash_profy",
    role: "TEACHER",
    createdAt: new Date("2025-02-10T09:00:00Z"),
    teacher: {
      id: "teach_sonia_gharbi",
      userId: "user_teacher_sonia_gharbi",
      slug: "sonia-gharbi",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
      title: "Docteure en Sciences Physiques & Chimie - Experte Bac",
      bio: "Enseignante universitaire et tutrice privée chevronnée avec 9 ans d'expérience. Accompagnement en Physique et Chimie pour 3ème et Bac (Sciences, Maths et Technique). Méthodes éprouvées pour maîtriser l'électricité, mécanique et chimie.",
      experienceYears: 9,
      hourlyRateMillimes: 30000,
      governorate: "Ariana",
      city: "Ariana Ville / Menzah",
      online: true,
      inPerson: true,
      verificationStatus: "APPROVED",
      subjects: ["Physique-Chimie", "Physique", "Chimie"],
      rating: 5.0,
      reviewsCount: 39,
      reviews: [
        {
          id: "rev_sonia_1",
          studentName: "Mohamed R.",
          rating: 5,
          comment: "Docteure Sonia simplifie les chapitres les plus complexes comme les oscillations et le dipôle RLC. Je recommande vivement !",
          createdAt: new Date("2026-01-28").toISOString(),
        },
      ],
      availabilities: [
        { id: "av_s1", dayOfWeek: 2, startTime: "17:00", endTime: "20:00" },
        { id: "av_s2", dayOfWeek: 4, startTime: "17:00", endTime: "20:00" },
        { id: "av_s3", dayOfWeek: 6, startTime: "14:00", endTime: "19:00" },
      ],
    },
  },
  {
    id: "user_teacher_youssef_trabelsi",
    email: "youssef.trabelsi@profyspace.tn",
    firstName: "Youssef",
    lastName: "Trabelsi",
    phone: "+216 95 888 777",
    passwordHash: "seed_hash_profy",
    role: "TEACHER",
    createdAt: new Date("2025-03-01T10:00:00Z"),
    teacher: {
      id: "teach_youssef_trabelsi",
      userId: "user_teacher_youssef_trabelsi",
      slug: "youssef-trabelsi",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
      title: "Ingénieur Logiciel & Tuteur Algorithmique / Python / Web",
      bio: "Ingénieur informatique INSAT et formateur. Préparation aux épreuves d'algorithmique et programmation Python du Bac Info et Supérieur. Cours interactifs avec partage de code et projets réels.",
      experienceYears: 6,
      hourlyRateMillimes: 25000,
      governorate: "Sousse",
      city: "Sousse Ville / Kantaoui",
      online: true,
      inPerson: true,
      verificationStatus: "APPROVED",
      subjects: ["Informatique", "Algorithmique", "Python"],
      rating: 4.8,
      reviewsCount: 26,
      reviews: [
        {
          id: "rev_youssef_1",
          studentName: "Khadija B.",
          rating: 5,
          comment: "Super prof d'algo ! Grâce aux séances pratiques et aux révisions en direct, j'ai enfin compris la récursivité et les fichiers.",
          createdAt: new Date("2026-02-12").toISOString(),
        },
      ],
      availabilities: [
        { id: "av_y1", dayOfWeek: 1, startTime: "18:00", endTime: "21:00" },
        { id: "av_y2", dayOfWeek: 3, startTime: "18:00", endTime: "21:00" },
        { id: "av_y3", dayOfWeek: 5, startTime: "18:00", endTime: "21:00" },
        { id: "av_y4", dayOfWeek: 6, startTime: "10:00", endTime: "18:00" },
      ],
    },
  },
  {
    id: "user_teacher_leila_mansouri",
    email: "leila.mansouri@profyspace.tn",
    firstName: "Leila",
    lastName: "Mansouri",
    phone: "+216 93 444 333",
    passwordHash: "seed_hash_profy",
    role: "TEACHER",
    createdAt: new Date("2025-01-20T11:00:00Z"),
    teacher: {
      id: "teach_leila_mansouri",
      userId: "user_teacher_leila_mansouri",
      slug: "leila-mansouri",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80",
      title: "Professeure Agrégée de Français & Littérature",
      bio: "14 ans d'expérience en lycée pilote et soutien scolaire. Méthodologie rigoureuse pour l'essai littéraire, le commentaire composé et la maîtrise de la langue française pour tous les niveaux.",
      experienceYears: 14,
      hourlyRateMillimes: 30000,
      governorate: "Sfax",
      city: "Sfax Ville",
      online: true,
      inPerson: false,
      verificationStatus: "APPROVED",
      subjects: ["Français", "Littérature"],
      rating: 4.9,
      reviewsCount: 52,
      reviews: [
        {
          id: "rev_leila_1",
          studentName: "Nour M.",
          rating: 5,
          comment: "Madame Leila m'a énormément aidée pour structurer mes essais et enrichir mon vocabulaire. Une enseignante d'exception.",
          createdAt: new Date("2026-01-14").toISOString(),
        },
      ],
      availabilities: [
        { id: "av_l1", dayOfWeek: 2, startTime: "16:00", endTime: "19:00" },
        { id: "av_l2", dayOfWeek: 4, startTime: "16:00", endTime: "19:00" },
        { id: "av_l3", dayOfWeek: 6, startTime: "09:00", endTime: "14:00" },
      ],
    },
  },
  {
    id: "user_teacher_mohamed_karray",
    email: "mohamed.karray@profyspace.tn",
    firstName: "Mohamed",
    lastName: "Karray",
    phone: "+216 92 111 222",
    passwordHash: "seed_hash_profy",
    role: "TEACHER",
    createdAt: new Date("2025-02-18T10:00:00Z"),
    teacher: {
      id: "teach_mohamed_karray",
      userId: "user_teacher_mohamed_karray",
      slug: "mohamed-karray",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80",
      title: "Enseignant d'Économie & Gestion / Comptabilité Financière",
      bio: "Master en Finance et Enseignant spécialisé en Économie et Gestion pour la section Éco-Gestion (Bac et Supérieur). Explications concrètes des mécanismes macroéconomiques et de la comptabilité financière.",
      experienceYears: 8,
      hourlyRateMillimes: 30000,
      governorate: "Monastir",
      city: "Monastir",
      online: true,
      inPerson: true,
      verificationStatus: "APPROVED",
      subjects: ["Économie / Gestion", "Comptabilité", "Économie"],
      rating: 4.7,
      reviewsCount: 21,
      reviews: [
        {
          id: "rev_mk_1",
          studentName: "Wassim H.",
          rating: 5,
          comment: "Cours très clair et axé sur les sujets du Bac. J'ai progressé de 5 points en économie en seulement 1 mois !",
          createdAt: new Date("2026-02-01").toISOString(),
        },
      ],
      availabilities: [
        { id: "av_mk1", dayOfWeek: 1, startTime: "17:00", endTime: "20:00" },
        { id: "av_mk2", dayOfWeek: 5, startTime: "17:00", endTime: "20:00" },
        { id: "av_mk3", dayOfWeek: 6, startTime: "14:00", endTime: "18:00" },
      ],
    },
  },
  {
    id: "user_teacher_sarah_bouslama",
    email: "sarah.bouslama@profyspace.tn",
    firstName: "Sarah",
    lastName: "Bouslama",
    phone: "+216 99 333 444",
    passwordHash: "seed_hash_profy",
    role: "TEACHER",
    createdAt: new Date("2025-02-25T14:00:00Z"),
    teacher: {
      id: "teach_sarah_bouslama",
      userId: "user_teacher_sarah_bouslama",
      slug: "sarah-bouslama",
      avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80",
      title: "Professeure d'Anglais Certifiée CELTA / Préparation Bac & IELTS",
      bio: "Professeure bilingue expérimentée, spécialisée dans le renforcement scolaire en Anglais, la préparation aux épreuves du Baccalauréat et aux certifications internationales (TOEFL, IELTS).",
      experienceYears: 7,
      hourlyRateMillimes: 30000,
      governorate: "Tunis",
      city: "La Marsa / Carthage",
      online: true,
      inPerson: true,
      verificationStatus: "APPROVED",
      subjects: ["Anglais", "English"],
      rating: 5.0,
      reviewsCount: 31,
      reviews: [
        {
          id: "rev_sb_1",
          studentName: "Ines D.",
          rating: 5,
          comment: "Miss Sarah est dynamique, motivante et ses cours m'ont permis de décrocher 19/20 en anglais au Bac. Thank you so much !",
          createdAt: new Date("2026-02-15").toISOString(),
        },
      ],
      availabilities: [
        { id: "av_sb1", dayOfWeek: 2, startTime: "17:00", endTime: "20:00" },
        { id: "av_sb2", dayOfWeek: 4, startTime: "17:00", endTime: "20:00" },
        { id: "av_sb3", dayOfWeek: 6, startTime: "10:00", endTime: "16:00" },
      ],
    },
  },
];

// Global in-memory storage to survive warm lambda reloads
const globalStore = globalThis as unknown as {
  __profyspace_users?: Map<string, StoredUser>;
  __profyspace_deposits?: StoredDeposit[];
};

if (!globalStore.__profyspace_users) {
  globalStore.__profyspace_users = new Map();
  // Initialize with seed teachers
  for (const t of SEED_TEACHERS) {
    globalStore.__profyspace_users.set(t.email, t);
    globalStore.__profyspace_users.set(t.id, t);
    if (t.teacher?.slug) {
      globalStore.__profyspace_users.set(t.teacher.slug, t);
    }
  }
}
if (!globalStore.__profyspace_deposits) {
  globalStore.__profyspace_deposits = [];
}

export const fallbackStore = {
  getSeedTeachers(): StoredUser[] {
    return SEED_TEACHERS;
  },

  getAllTeachers(): StoredUser[] {
    const list: StoredUser[] = [];
    const seen = new Set<string>();

    // Seed teachers first
    for (const t of SEED_TEACHERS) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        list.push(t);
      }
    }

    // Any dynamically created teachers in memory
    for (const u of globalStore.__profyspace_users!.values()) {
      if (u.role === "TEACHER" && u.teacher && !seen.has(u.id)) {
        seen.add(u.id);
        list.push(u);
      }
    }

    return list;
  },

  getTeacherBySlug(slug: string): StoredUser | null {
    const normalizedSlug = slug.toLowerCase().trim();
    for (const u of this.getAllTeachers()) {
      if (u.teacher && u.teacher.slug.toLowerCase() === normalizedSlug) {
        return u;
      }
    }
    return globalStore.__profyspace_users!.get(normalizedSlug) || null;
  },

  async createUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    passwordHash: string;
    role: "STUDENT" | "TEACHER" | "ADMIN";
  }): Promise<StoredUser> {
    const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const slug = `${data.firstName}-${data.lastName}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const user: StoredUser = {
      id,
      email: data.email.toLowerCase().trim(),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      phone: data.phone || null,
      passwordHash: data.passwordHash,
      role: data.role,
      createdAt: new Date(),
      student: data.role === "STUDENT" ? { id: `stud_${id}`, userId: id } : null,
      teacher:
        data.role === "TEACHER"
          ? {
            id: `teach_${id}`,
            userId: id,
            slug,
            experienceYears: 2,
            hourlyRateMillimes: 25000,
            online: true,
            inPerson: false,
            verificationStatus: "APPROVED",
            subjects: ["Mathématiques"],
            availabilities: [],
            rating: 5.0,
            reviewsCount: 0,
            reviews: [],
          }
          : null,
      wallet: {
        id: `wall_${id}`,
        userId: id,
        availableMillimes: 0,
        pendingMillimes: 0,
        deposits: [],
        transactions: [],
      },
    };

    globalStore.__profyspace_users!.set(user.email, user);
    globalStore.__profyspace_users!.set(user.id, user);
    if (slug) {
      globalStore.__profyspace_users!.set(slug, user);
    }
    return user;
  },

  getUserByEmail(email: string): StoredUser | null {
    return globalStore.__profyspace_users!.get(email.toLowerCase().trim()) || null;
  },

  getUserById(id: string): StoredUser | null {
    return globalStore.__profyspace_users!.get(id) || null;
  },

  updateUser(id: string, updates: Partial<StoredUser>): StoredUser | null {
    const existing = globalStore.__profyspace_users!.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    globalStore.__profyspace_users!.set(updated.id, updated);
    globalStore.__profyspace_users!.set(updated.email, updated);
    if (updated.teacher?.slug) {
      globalStore.__profyspace_users!.set(updated.teacher.slug, updated);
    }
    return updated;
  },

  addDeposit(deposit: StoredDeposit) {
    globalStore.__profyspace_deposits!.unshift(deposit);
  },

  getDeposits(): StoredDeposit[] {
    return globalStore.__profyspace_deposits!;
  },
};
