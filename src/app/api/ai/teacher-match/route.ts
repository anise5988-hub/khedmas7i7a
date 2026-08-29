import { NextResponse } from "next/server";
import { getApprovedTeachers } from "@/lib/server/teachers-directory";
import { matchTeachers } from "@/lib/server/teacher-match";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = typeof body?.query === "string" ? body.query.trim() : "";

    if (query.length < 5) {
      return NextResponse.json({ error: "Décrivez votre besoin en quelques mots (matière, niveau, budget...)." }, { status: 400 });
    }
    if (query.length > 600) {
      return NextResponse.json({ error: "Votre description est trop longue." }, { status: 400 });
    }

    const teachers = await getApprovedTeachers();
    const results = matchTeachers(query, teachers, 6);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("AI teacher match error", error);
    return NextResponse.json({ error: "Impossible d'analyser votre demande pour le moment." }, { status: 500 });
  }
}
