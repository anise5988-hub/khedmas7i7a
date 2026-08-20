import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const targetUrl = new URL("/auth/callback", request.url);
  targetUrl.search = url.search;
  targetUrl.hash = url.hash;
  return NextResponse.redirect(targetUrl);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const targetUrl = new URL("/auth/callback", request.url);
  targetUrl.search = url.search;
  return NextResponse.redirect(targetUrl);
}
