import { prisma } from "@/lib/server/prisma";
import { sendTransactionalEmail } from "@/lib/server/email";

export const notificationTypes = {
  NEW_MESSAGE: "NEW_MESSAGE",
  NEW_BOOKING: "NEW_BOOKING",
  BOOKING_CONFIRMED: "BOOKING_CONFIRMED",
  BOOKING_CANCELLED: "BOOKING_CANCELLED",
  PAYMENT_SUCCESS: "PAYMENT_SUCCESS",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  NEW_REVIEW: "NEW_REVIEW",
  PROFESSOR_VERIFIED: "PROFESSOR_VERIFIED",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  EMAIL_CHANGED: "EMAIL_CHANGED",
  ADMIN_ANNOUNCEMENT: "ADMIN_ANNOUNCEMENT",
} as const;

export type NotificationEvent = keyof typeof notificationTypes;

type NotifyInput = { userId: string; type: NotificationEvent; title: string; message: string; link?: string; emailSubject?: string; emailMessage?: string; dedupeKey?: string };

export async function notifyUser(input: NotifyInput) {
  const dedupeKey = input.dedupeKey || `notification:${input.userId}:${input.type}:${Date.now()}`;
  try {
    const notification = await prisma.notification.upsert({
      where: { dedupeKey },
      create: { userId: input.userId, type: input.type, title: input.title, message: input.message, link: input.link || null, dedupeKey },
      update: {},
    });
    const recipient = await prisma.user.findUnique({ where: { id: input.userId }, select: { email: true, firstName: true } });
    if (recipient && input.emailSubject) {
      await sendTransactionalEmail({ to: recipient.email, name: recipient.firstName, subject: input.emailSubject, title: input.title, message: input.emailMessage || input.message, link: input.link });
    }
    return notification;
  } catch (error) {
    console.error("Notification delivery failed", { type: input.type, userId: input.userId, error });
    return null;
  }
}
