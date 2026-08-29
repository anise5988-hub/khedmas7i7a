import { NextResponse } from "next/server";
import { getApprovedTeachers } from "@/lib/server/teachers-directory";

export async function GET() {
  const teachers = await getApprovedTeachers();
  return NextResponse.json(teachers);
}
