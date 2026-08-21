import { prisma } from "@/lib/server/prisma";

export type NewsItem = {
  id: string;
  title: string;
  shortDescription: string;
  content: string;
  imageUrl?: string | null;
  published: boolean;
  authorId?: string | null;
  createdAt: string;
  updatedAt: string;
};

const globalNewsStore = globalThis as unknown as {
  __profy_news?: NewsItem[];
};

if (!globalNewsStore.__profy_news) {
  globalNewsStore.__profy_news = [];
}
export const newsStore = {
  async getAllNews(publishedOnly = false): Promise<NewsItem[]> {
    try {
      const items = await prisma.news.findMany({
        where: publishedOnly ? { published: true } : undefined,
        orderBy: { createdAt: "desc" },
      });
      if (items) {
        return items.map((item) => ({
          id: item.id,
          title: item.title,
          shortDescription: item.shortDescription,
          content: item.content,
          imageUrl: item.imageUrl,
          published: item.published,
          authorId: item.authorId,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        }));
      }
    } catch (err) {
      console.warn("Prisma news lookup failed, using fallback store", err);
    }

    let memoryList = [...globalNewsStore.__profy_news!];
    if (publishedOnly) {
      memoryList = memoryList.filter((n) => n.published);
    }
    return memoryList.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async getNewsById(id: string): Promise<NewsItem | null> {
    try {
      const item = await prisma.news.findUnique({ where: { id } });
      if (item) {
        return {
          id: item.id,
          title: item.title,
          shortDescription: item.shortDescription,
          content: item.content,
          imageUrl: item.imageUrl,
          published: item.published,
          authorId: item.authorId,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        };
      }
    } catch (err) {
      console.warn("Prisma news getById failed, using fallback store", err);
    }

    return globalNewsStore.__profy_news!.find((n) => n.id === id) || null;
  },

  async createNews(data: {
    title: string;
    shortDescription: string;
    content: string;
    imageUrl?: string | null;
    published?: boolean;
    authorId?: string | null;
  }): Promise<NewsItem> {
    const published = Boolean(data.published);
    try {
      const item = await prisma.news.create({
        data: {
          title: data.title,
          shortDescription: data.shortDescription,
          content: data.content,
          imageUrl: data.imageUrl || null,
          published,
          authorId: data.authorId || null,
        },
      });

      const formatted: NewsItem = {
        id: item.id,
        title: item.title,
        shortDescription: item.shortDescription,
        content: item.content,
        imageUrl: item.imageUrl,
        published: item.published,
        authorId: item.authorId,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      };
      globalNewsStore.__profy_news!.unshift(formatted);
      return formatted;
    } catch (err) {
      console.warn("Prisma createNews failed, using fallback store", err);
    }

    const id = `news_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newItem: NewsItem = {
      id,
      title: data.title,
      shortDescription: data.shortDescription,
      content: data.content,
      imageUrl: data.imageUrl || null,
      published,
      authorId: data.authorId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    globalNewsStore.__profy_news!.unshift(newItem);
    return newItem;
  },

  async updateNews(
    id: string,
    updates: Partial<{
      title: string;
      shortDescription: string;
      content: string;
      imageUrl?: string | null;
      published: boolean;
    }>
  ): Promise<NewsItem | null> {
    try {
      const item = await prisma.news.update({
        where: { id },
        data: updates,
      });
      if (item) {
        const formatted: NewsItem = {
          id: item.id,
          title: item.title,
          shortDescription: item.shortDescription,
          content: item.content,
          imageUrl: item.imageUrl,
          published: item.published,
          authorId: item.authorId,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        };
        const idx = globalNewsStore.__profy_news!.findIndex((n) => n.id === id);
        if (idx !== -1) globalNewsStore.__profy_news![idx] = formatted;
        return formatted;
      }
    } catch (err) {
      console.warn("Prisma updateNews failed, using fallback store", err);
    }

    const idx = globalNewsStore.__profy_news!.findIndex((n) => n.id === id);
    if (idx === -1) return null;
    const existing = globalNewsStore.__profy_news![idx];
    const updated: NewsItem = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    globalNewsStore.__profy_news![idx] = updated;
    return updated;
  },

  async deleteNews(id: string): Promise<boolean> {
    try {
      await prisma.news.delete({ where: { id } });
    } catch (err) {
      console.warn("Prisma deleteNews failed", err);
    }

    const initialLen = globalNewsStore.__profy_news!.length;
    globalNewsStore.__profy_news = globalNewsStore.__profy_news!.filter((n) => n.id !== id);
    return globalNewsStore.__profy_news.length < initialLen || true;
  },
};
