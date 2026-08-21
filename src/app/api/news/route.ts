import { NextResponse } from "next/server";
import { newsStore } from "@/lib/server/news-store";

export async function GET() {
  try {
    const news = await newsStore.getAllNews(true);
    return NextResponse.json({ news });
  } catch (err) {
    console.error("Public news fetch failed", err);
    return NextResponse.json({ news: [] });
  }
}
