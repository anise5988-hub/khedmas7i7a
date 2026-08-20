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
};

if (!globalStore.__profyspace_users) {
  globalStore.__profyspace_users = new Map();
}
if (!globalStore.__profyspace_deposits) {
  globalStore.__profyspace_deposits = [];
}

export const fallbackStore = {
  async createUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    passwordHash: string;
    role: "STUDENT" | "TEACHER" | "ADMIN";
  }): Promise<StoredUser> {
    const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
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
              slug: `${data.firstName}-${data.lastName}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              experienceYears: 2,
              hourlyRateMillimes: 25000,
              online: true,
              inPerson: false,
              verificationStatus: "PENDING",
              subjects: ["Mathématiques"],
              availabilities: [],
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
    return updated;
  },

  addDeposit(deposit: StoredDeposit) {
    globalStore.__profyspace_deposits!.unshift(deposit);
  },

  getDeposits(): StoredDeposit[] {
    return globalStore.__profyspace_deposits!;
  },
};
