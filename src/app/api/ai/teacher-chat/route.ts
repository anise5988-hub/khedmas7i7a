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
import { callClaude, isClaudeConfigured, type ClaudeTool } from "@/lib/server/claude";
import { buildSystemPrompt } from "@/lib/server/assistant-knowledge";

const SLOT_LABELS: Record<ReturnType<typeof missingSlots>[number], string> = {
  subject: "la matière",
  level: "le niveau scolaire",
  budget: "votre budget par heure",
  mode: "en ligne ou en présentiel",
};

/**
 * Un seul tool, deux usages : Claude l'appelle pour chercher des professeurs,
 * et répond en texte libre pour tout le reste (FAQ, conseils, aide).
 * C'est ce qui remplace les 11 phrases figées d'assistant-replies.ts.
 */
const SEARCH_TOOL: ClaudeTool = {
  name: "rechercher_professeurs",
  description:
    "Cherche des professeurs sur la plateforme à partir de critères extraits du message de l'élève. À appeler dès que la personne exprime un besoin de cours (matière, niveau, budget, ville, format). À NE PAS appeler pour une simple question sur le fonctionnement du site.",
  input_schema: {
    type: "object",
    properties: {
      subjects: {
        type: "array",
        items: { type: "string" },
        description:
          "Matières demandées, telles qu'elles apparaissent dans le catalogue ProfySpace. Ex : 'Mathématiques', 'Français', 'English', 'Sciences physiques', 'SVT', 'Philosophie'.",
      },
      levelCycle: {
        type: ["string", "null"],
        enum: ["PRIMARY", "BASIC", "SECONDARY", "UNIVERSITY", "PROFESSIONAL", null],
        description:
          "Cycle scolaire. PRIMARY=primaire, BASIC=collège, SECONDARY=lycée, UNIVERSITY=université, PROFESSIONAL=formation professionnelle.",
      },
      wantsBac: {
        type: "boolean",
        description: "Vrai si la personne prépare spécifiquement le Baccalauréat.",
      },
      budgetMax: {
        type: ["number", "null"],
        description: "Budget maximum par heure, EN DINARS. Ex : 30 pour '30 DT/h'. Null si non mentionné.",
      },
      mode: {
        type: ["string", "null"],
        enum: ["online", "in_person", null],
        description: "Format souhaité : 'online' (en ligne) ou 'in_person' (présentiel/domicile).",
      },
      timeOfDay: {
        type: ["string", "null"],
        enum: ["morning", "afternoon", "evening", null],
        description: "Moment de la journée souhaité pour les cours.",
      },
      wantsWeekend: {
        type: "boolean",
        description: "Vrai si la personne veut des cours le week-end (samedi/dimanche).",
      },
      city: {
        type: ["string", "null"],
        description: "Gouvernorat ou ville en Tunisie, sans accents. Ex : 'Tunis', 'Sfax', 'Sousse'.",
      },
      reply: {
        type: "string",
        description:
          "Ta réponse à écrire à la personne, dans sa langue, 2 à 4 phrases. Si tu appelles ce tool pour chercher des professeurs, cette réponse introduit les résultats.",
      },
    },
    required: ["subjects", "reply"],
  },
};

const VALID_CYCLES = ["PRIMARY", "BASIC", "SECONDARY", "UNIVERSITY", "PROFESSIONAL"] as const;

function coerceIntent(input: unknown): ParsedIntent {
  if (!input || typeof input !== "object") return EMPTY_INTENT;
  const raw = input as Partial<ParsedIntent>;
  return {
    subjects: Array.isArray(raw.subjects) ? raw.subjects.filter((s) => typeof s === "string") : [],
    levelCycle: (VALID_CYCLES as readonly string[]).includes(raw.levelCycle as string)
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

/**
 * Claude renvoie les matières en texte libre ("maths", "math", "الرياضيات").
 * On les ramène sur les libellés exacts du catalogue via les alias déjà
 * utilisés par le moteur regex, puis on ne garde que ce qui matche vraiment.
 */
function alignSubjectsToCatalog(rawSubjects: string[]): ParsedIntent["subjects"] {
  const aligned = new Set<string>();
  for (const raw of rawSubjects) {
    const intent = parseQuery(raw);
    if (intent.subjects.length > 0) {
      intent.subjects.forEach((s) => aligned.add(s));
    } else {
      aligned.add(raw);
    }
  }
  return Array.from(aligned);
}

function intentFromToolInput(input: unknown): ParsedIntent {
  const base = coerceIntent(input);
  return { ...base, subjects: alignSubjectsToCatalog(base.subjects) };
}

function toolInputReply(input: unknown): string | null {
  if (!input || typeof input !== "object") return null;
  const reply = (input as { reply?: unknown }).reply;
  return typeof reply === "string" && reply.trim() ? reply.trim() : null;
}

/** Copie exacte du comportement du moteur d'origine, utilisé en repli. */
function composeRegexReply(mergedIntent: ParsedIntent): string {
  const summary = describeIntent(mergedIntent);
  const missing = missingSlots(mergedIntent);
  let reply = summary
    ? `Voici les professeurs qui correspondent le mieux à : ${summary}.`
    : "Voici les professeurs qui correspondent le mieux à votre demande.";
  if (4 - missing.length < 2 && missing.length > 0) {
    reply += ` Précisez aussi ${SLOT_LABELS[missing[0]]} pour affiner encore la recherche.`;
  }
  return reply;
}

/**
 * Repli sans IA : le moteur regex d'origine. Utilisé quand la clé Anthropic
 * manque, quand l'API tombe, ou quand elle dépasse le délai. L'assistant reste
 * dégradé mais fonctionnel — il ne renvoie jamais une erreur à l'élève.
 */
async function fallbackReply(message: string, priorIntent: ParsedIntent) {
  const teachers = await getApprovedTeachers();
  const incomingIntent = parseQuery(message);
  const mergedIntent = mergeIntent(priorIntent, incomingIntent);

  if (hasSignal(incomingIntent) && teachers.length > 0) {
    return {
      reply: composeRegexReply(mergedIntent),
      intent: mergedIntent,
      results: matchTeachersByIntent(mergedIntent, teachers, 5),
    };
  }

  if (hasSignal(priorIntent)) {
    return {
      reply:
        "Je n'ai pas bien compris 🤔 Ajoutez un détail (budget, niveau, ville...) pour affiner la recherche en cours, ou décrivez une nouvelle demande.",
      intent: priorIntent,
      results: [],
    };
  }

  return {
    reply:
      "Je n'ai pas encore assez d'informations 🤔 Précisez au moins la matière et le niveau scolaire (ex : \"Maths pour le Bac\", \"Anglais niveau collège\"). Vous pouvez aussi me poser une question sur le fonctionnement du site.",
    intent: mergedIntent,
    results: [],
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

    // Sans clé configurée, on ne tente même pas l'appel réseau : l'assistant
    // bascule directement sur le moteur regex.
    if (!isClaudeConfigured()) {
      return NextResponse.json(await fallbackReply(message, priorIntent));
    }

    let claude;
    try {
      claude = await callClaude({
        system: buildSystemPrompt({
          intentSummary: describeIntent(priorIntent),
          teacherNames: [],
        }),
        userMessage: message,
        tools: [SEARCH_TOOL],
      });
    } catch (error) {
      console.error("Claude call failed, falling back to regex engine", error);
      return NextResponse.json(await fallbackReply(message, priorIntent));
    }

    // Claude a répondu en texte libre : c'est une réponse FAQ / conseil,
    // pas une recherche. On ne touche pas aux critères accumulés.
    if (claude.type === "text") {
      return NextResponse.json({ reply: claude.text, intent: priorIntent, results: [] });
    }

    const incomingIntent = intentFromToolInput(claude.toolUse.input);
    const mergedIntent = mergeIntent(priorIntent, incomingIntent);
    const toolReply = toolInputReply(claude.toolUse.input);

    if (hasSignal(incomingIntent)) {
      const teachers = await getApprovedTeachers();
      if (teachers.length === 0) {
        return NextResponse.json({
          reply: "Nous n'avons pas encore de professeur disponible correspondant à votre demande. Revenez bientôt !",
          intent: mergedIntent,
          results: [],
        });
      }

      return NextResponse.json({
        reply: toolReply ?? composeRegexReply(mergedIntent),
        intent: mergedIntent,
        results: matchTeachersByIntent(mergedIntent, teachers, 5),
      });
    }

    // Tool appelé sans aucun critère exploitable : on garde le texte s'il y en
    // a un, sinon on demande une précision plutôt que d'afficher du vide.
    if (toolReply) {
      return NextResponse.json({ reply: toolReply, intent: priorIntent, results: [] });
    }

    return NextResponse.json({
      reply:
        "Je n'ai pas encore assez d'informations 🤔 Précisez au moins la matière et le niveau scolaire (ex : \"Maths pour le Bac\", \"Anglais niveau collège\").",
      intent: mergedIntent,
      results: [],
    });
  } catch (error) {
    console.error("AI teacher chat error", error);
    return NextResponse.json({ error: "Impossible de traiter votre message pour le moment." }, { status: 500 });
  }
}
