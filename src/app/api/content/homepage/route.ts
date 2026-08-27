import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  try {
    const [content, faqs] = await Promise.all([
      prisma.homepageContent.findFirst(),
      prisma.faqItem.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    ]);

    return NextResponse.json({
      hero: {
        titlePrefix: content?.heroTitlePrefix ?? null,
        titleHighlight: content?.heroTitleHighlight ?? null,
        description: content?.heroDescription ?? null,
      },
      banner:
        content?.bannerActive && content.bannerMessage
          ? { message: content.bannerMessage, linkUrl: content.bannerLinkUrl, linkLabel: content.bannerLinkLabel }
          : null,
      faqs: faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer })),
    });
  } catch (error) {
    console.error("Homepage content fetch failed", error);
    return NextResponse.json({ hero: { titlePrefix: null, titleHighlight: null, description: null }, banner: null, faqs: [] });
  }
}
