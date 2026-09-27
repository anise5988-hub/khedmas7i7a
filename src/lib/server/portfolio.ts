import { prisma } from "@/lib/server/prisma";

/**
 * Server-side read model for a teacher's public portfolio (examples of their
 * work: past papers, corrections, exercises, previews, videos).
 *
 * Reads are public — a portfolio is what convinces a future student — but
 * they only ever expose work whose owner is an APPROVED teacher and that is
 * itself flagged public. Drafts and rejected/suspended authors stay hidden.
 */

export type PortfolioItemType = "IMAGE" | "DOCUMENT" | "VIDEO" | "LINK";

export type PortfolioItem = {
  id: string;
  title: string;
  description: string | null;
  type: PortfolioItemType;
  subject: string | null;
  level: string | null;
  mediaUrl: string;
  thumbnailUrl: string | null;
  externalUrl: string | null;
  sortOrder: number;
  createdAt: Date;
};

export const PORTFOLIO_TYPES: readonly PortfolioItemType[] = ["IMAGE", "DOCUMENT", "VIDEO", "LINK"];

export const PORTFOLIO_TYPE_LABELS: Record<PortfolioItemType, string> = {
  IMAGE: "Image",
  DOCUMENT: "Document (PDF)",
  VIDEO: "Vidéo",
  LINK: "Lien externe",
};

/**
 * SQL-free, dead-simple validator shared by the API route: keeps a malformed
 * payload far away from `prisma.create` without dragging zod into a server
 * helper that unit tests import directly.
 */
export function parsePortfolioInput(body: unknown): {
  ok: true;
  value: {
    title: string;
    description: string | null;
    type: PortfolioItemType;
    subject: string | null;
    level: string | null;
    mediaUrl: string;
    thumbnailUrl: string | null;
    externalUrl: string | null;
  };
} | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Données manquantes." };
  }

  const raw = body as Record<string, unknown>;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (title.length < 3) {
    return { ok: false, error: "Le titre doit contenir au moins 3 caractères." };
  }
  if (title.length > 120) {
    return { ok: false, error: "Le titre ne doit pas dépasser 120 caractères." };
  }

  const description = typeof raw.description === "string" ? raw.description.trim() : "";
  if (description.length > 1200) {
    return { ok: false, error: "La description ne doit pas dépasser 1200 caractères." };
  }

  const type = String(raw.type || "").toUpperCase() as PortfolioItemType;
  if (!PORTFOLIO_TYPES.includes(type)) {
    return { ok: false, error: "Type de réalisation invalide." };
  }

  const mediaUrl = typeof raw.mediaUrl === "string" ? raw.mediaUrl.trim() : "";
  const externalUrl = typeof raw.externalUrl === "string" ? raw.externalUrl.trim() : "";

  if (type === "LINK") {
    if (!/^https?:\/\/\S+$/i.test(externalUrl)) {
      return { ok: false, error: "Un lien externe doit commencer par http:// ou https://." };
    }
  } else if (!mediaUrl) {
    return { ok: false, error: "Veuillez téléverser un fichier avant d'enregistrer." };
  }

  const thumbnailUrl = typeof raw.thumbnailUrl === "string" ? raw.thumbnailUrl.trim() : "";

  return {
    ok: true,
    value: {
      title,
      description: description || null,
      type,
      subject: typeof raw.subject === "string" && raw.subject.trim() ? raw.subject.trim() : null,
      level: typeof raw.level === "string" && raw.level.trim() ? raw.level.trim() : null,
      mediaUrl: type === "LINK" ? externalUrl : mediaUrl,
      thumbnailUrl: thumbnailUrl || null,
      externalUrl: type === "LINK" ? externalUrl : null,
    },
  };
}

export async function getPublicPortfolio(teacherProfileId: string): Promise<PortfolioItem[]> {
  try {
    const items = await prisma.teacherPortfolioItem.findMany({
      where: { teacherId: teacherProfileId, isPublic: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        subject: true,
        level: true,
        mediaUrl: true,
        thumbnailUrl: true,
        externalUrl: true,
        sortOrder: true,
        createdAt: true,
      },
    });
    return items as PortfolioItem[];
  } catch (error) {
    console.warn("Portfolio lookup failed", error);
    return [];
  }
}