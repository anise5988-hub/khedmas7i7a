import { NextResponse } from "next/server";
import { getApprovedTeachers } from "@/lib/server/teachers-directory";
import {
  EMPTY_INTENT,
  describeIntent,
  hasSignal,
  matchTeachersByIntent,
  mergeIntent,
  missingSlots,
  parseQuery,
  type ParsedIntent,
} from "@/lib/server/teacher-match";
import { detectCannedReply } from "@/lib/server/assistant-replies";

const SLOT_LABELS: Record<ReturnType<typeof missingSlots>[number], string> = {
  subject: "la matière",
  level: "le niveau scolaire",
  budget: "votre budget par heure",
  mode: "en ligne ou en présentiel",
};

function coerceIntent(input: unknown): ParsedIntent {
  if (!input || typeof input !== "object") return EMPTY_INTENT;
  const raw = input as Partial<ParsedIntent>;
  return {
    subjects: Array.isArray(raw.subjects) ? raw.subjects.filter((s) => typeof s === "string") : [],
    levelCycle: (["PRIMARY", "BASIC", "SECONDARY", "UNIVERSITY", "PROFESSIONAL"] as const).includes(
      raw.levelCycle as never,
    )
      ? (raw.levelCycle as ParsedIntent["levelCycle"])
      : null,
    wantsBac: Boolean(raw.wantsBac),
    budgetMax: typeof raw.budgetMax === "number" ? raw.budgetMax : null,
    mode: raw.mode === "online" || raw.mode === "in_person" ? raw.mode : null,
    timeOfDay: (["morning", "afternoon", "evening"] as const).includes(raw.timeOfDay as never)
      ? (raw.timeOfDay as ParsedIntent["timeOfDay"])
      : null,
    wantsWeekend: Boolean(raw.wantsWeekend),
    city: typeof raw.city === "string" ? raw.city : null,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const priorIntent = coerceIntent(body?.intent);

    if (message.length < 1) {
      return NextResponse.json({ error: "Écrivez un message." }, { status: 400 });
    }
    if (message.length > 600) {
      return NextResponse.json({ error: "Votre message est trop long." }, { status: 400 });
    }

    const incomingIntent = parseQuery(message);
    const mergedIntent = mergeIntent(priorIntent, incomingIntent);
    const canned = detectCannedReply(message);

    // A message only drives a search when IT carries search signal.
    // Otherwise accumulated context from earlier turns would keep routing
    // later, unrelated questions (e.g. an FAQ about payment) back into
    // stale search results instead of answering them.
    if (hasSignal(incomingIntent)) {
      const teachers = await getApprovedTeachers();

      if (teachers.length === 0) {
        return NextResponse.json({
          reply: "Nous n'avons pas encore de professeur disponible correspondant à votre demande. Revenez bientôt !",
          intent: mergedIntent,
          results: [],
        });
      }

      const results = matchTeachersByIntent(mergedIntent, teachers, 5);
      const summary = describeIntent(mergedIntent);
      const missing = missingSlots(mergedIntent);
      const filledCount = 4 - missing.length;

      let reply = summary
        ? `Voici les professeurs qui correspondent le mieux à : ${summary}.`
        : "Voici les professeurs qui correspondent le mieux à votre demande.";

      if (filledCount < 2 && missing.length > 0) {
        reply += ` Précisez aussi ${SLOT_LABELS[missing[0]]} pour affiner encore la recherche.`;
      }

      return NextResponse.json({ reply, intent: mergedIntent, results });
    }

    if (canned) {
      return NextResponse.json({ reply: canned, intent: priorIntent });
    }

    if (hasSignal(priorIntent)) {
      return NextResponse.json({
        reply:
          "Je n'ai pas bien compris 🤔 Ajoutez un détail (budget, niveau, ville...) pour affiner la recherche en cours, ou décrivez une nouvelle demande.",
        intent: priorIntent,
      });
    }

    return NextResponse.json({
      reply:
        "Je n'ai pas encore assez d'informations 🤔 Précisez au moins la matière et le niveau scolaire (ex : \"Maths pour le Bac\", \"Anglais niveau collège\").",
      intent: mergedIntent,
    });
  } catch (error) {
    console.error("AI teacher chat error", error);
    return NextResponse.json({ error: "Impossible de traiter votre message pour le moment." }, { status: 500 });
  }
}
