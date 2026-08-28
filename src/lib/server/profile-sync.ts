/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/server/prisma";
import { fallbackStore } from "@/lib/server/fallback-store";

export async function ensureUserProfile(input: {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: "STUDENT" | "TEACHER" | "ADMIN";
}) {
  const cleanEmail = input.email.toLowerCase().trim();
  const firstName = (input.firstName || "Utilisateur").trim();
  const lastName = (input.lastName || "Profy").trim();
  const phone = input.phone ? input.phone.trim() : null;

  try {
    // 1. Check if user already exists by ID or Email to strictly preserve their persistent role
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ id: input.id }, { email: cleanEmail }],
      },
      include: {
        teacher: true,
        student: true,
        wallet: true,
      },
    });

    if (existingUser) {
      const preservedRole =
        existingUser.role === "ADMIN"
          ? "ADMIN"
          : existingUser.teacher || input.role === "TEACHER"
          ? "TEACHER"
          : existingUser.role;

      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          email: cleanEmail,
          firstName: input.firstName || existingUser.firstName,
          lastName: input.lastName || existingUser.lastName,
          phone: phone || existingUser.phone,
          role: preservedRole,
        },
        include: {
          teacher: true,
          student: true,
          wallet: true,
        },
      });

      // Ensure corresponding profile exists
      if (preservedRole === "TEACHER" && !updatedUser.teacher) {
        const slug = `${updatedUser.firstName}-${updatedUser.lastName}-${Date.now()}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        const teacherProfile = await prisma.teacherProfile.create({
          data: {
            userId: updatedUser.id,
            slug,
            hourlyRateMillimes: 25000,
            experienceYears: 1,
            verificationStatus: "PENDING",
            online: true,
          },
        });
        updatedUser.teacher = teacherProfile as any;
      } else if (preservedRole === "STUDENT" && !updatedUser.student) {
        const studentProfile = await prisma.studentProfile.create({
          data: { userId: updatedUser.id },
        });
        updatedUser.student = studentProfile as any;
      }

      if (!updatedUser.wallet) {
        await prisma.wallet.create({
          data: { userId: updatedUser.id, availableMillimes: 0, pendingMillimes: 0 },
        });
      }

      // Sync fallback store
      fallbackStore.updateUser(updatedUser.id, {
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: preservedRole,
      });

      return updatedUser;
    }

    // 2. New user creation: role is assigned from input registration choice
    const assignedRole = input.role === "TEACHER" ? "TEACHER" : input.role === "ADMIN" ? "ADMIN" : "STUDENT";

    const newUser = await prisma.user.create({
      data: {
        id: input.id,
        email: cleanEmail,
        firstName,
        lastName,
        phone,
        passwordHash: "supabase_auth",
        role: assignedRole,
        wallet: { create: { availableMillimes: 0, pendingMillimes: 0 } },
        ...(assignedRole === "STUDENT"
          ? { student: { create: {} } }
          : assignedRole === "TEACHER"
          ? {
              teacher: {
                create: {
                  slug: `${firstName}-${lastName}-${Date.now()}`
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, ""),
                  hourlyRateMillimes: 25000,
                  experienceYears: 1,
                  verificationStatus: "PENDING",
                  online: true,
                },
              },
            }
          : {}),
      },
      include: {
        teacher: true,
        student: true,
        wallet: true,
      },
    });

    return newUser;
  } catch (error) {
    console.warn("Prisma profile sync failed, checking fallback store", error);

    // Fallback store handling
    const existingFallback = fallbackStore.getUserById(input.id) || fallbackStore.getUserByEmail(cleanEmail);
    if (existingFallback) {
      const updatedFallback = fallbackStore.updateUser(existingFallback.id, {
        email: cleanEmail,
        firstName: input.firstName || existingFallback.firstName,
        lastName: input.lastName || existingFallback.lastName,
        phone: phone || existingFallback.phone,
      });
      return (updatedFallback || existingFallback) as any;
    }

    const assignedRole = input.role === "TEACHER" ? "TEACHER" : input.role === "ADMIN" ? "ADMIN" : "STUDENT";
    const newFallback = await fallbackStore.createUser({
      firstName,
      lastName,
      email: cleanEmail,
      phone,
      passwordHash: "supabase_auth",
      role: assignedRole,
    });

    return newFallback as any;
  }
}
