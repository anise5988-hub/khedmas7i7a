import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || undefined;
  const cursor = searchParams.get("cursor") || undefined;

  const logs = await prisma.auditLog.findMany({
    where: action ? { action } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const distinctActions = await prisma.auditLog.findMany({
    distinct: ["action"],
    select: { action: true },
    orderBy: { action: "asc" },
  });

  return NextResponse.json({
    logs,
    nextCursor: logs.length === 50 ? logs[logs.length - 1].id : null,
    actions: distinctActions.map((a) => a.action),
  });
}
