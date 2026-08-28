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

// Global in-memory storage to survive warm lambda reloads
const globalStore = globalThis as unknown as {
  __profyspace_users?: Map<string, StoredUser>;
  __profyspace_deposits?: StoredDeposit[];
  __profyspace_otps?: Map<string, { otp: string; expiresAt: Date; email: string }>;
};

if (!globalStore.__profyspace_users) {
  globalStore.__profyspace_users = new Map();
}
if (!globalStore.__profyspace_deposits) {
  globalStore.__profyspace_deposits = [];
}
if (!globalStore.__profyspace_otps) {
  globalStore.__profyspace_otps = new Map();
}

export const fallbackStore = {
  getSeedTeachers(): StoredUser[] {
    return [];
  },

  getAllUsers(): StoredUser[] {
    const list: StoredUser[] = [];
    const seen = new Set<string>();
    for (const u of globalStore.__profyspace_users!.values()) {
      if (!seen.has(u.id)) {
        seen.add(u.id);
        list.push(u);
      }
    }
    return list;
  },

  getAllTeachers(): StoredUser[] {
    const list: StoredUser[] = [];
    const seen = new Set<string>();

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
            verificationStatus: "PENDING",
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

  setOtp(email: string, otp: string) {
    const key = email.toLowerCase().trim();
    globalStore.__profyspace_otps!.set(key, {
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      email: key,
    });
  },

  verifyOtp(email: string, otp: string): boolean {
    const key = email.toLowerCase().trim();
    const record = globalStore.__profyspace_otps!.get(key);
    if (!record) return false;
    if (record.otp !== otp) return false;
    if (record.expiresAt < new Date()) {
      globalStore.__profyspace_otps!.delete(key);
      return false;
    }
    globalStore.__profyspace_otps!.delete(key);
    return true;
  },
};
