import { prisma } from "@/lib/server/prisma";

type Actor = { id: string; firstName: string; lastName: string; role: string };

/**
 * Records an admin action for the audit trail. Never throws — a logging
 * failure must not block the action it's recording (e.g. a role change
 * that already succeeded shouldn't error out because the log write did).
 */
export async function logAdminAction(params: {
  actor: Actor;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actor.id,
        actorName: `${params.actor.firstName} ${params.actor.lastName}`.trim(),
        actorRole: params.actor.role,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        metadata: params.metadata as never,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}
