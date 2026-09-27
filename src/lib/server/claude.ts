/**
 * Client minimal pour l'API Messages d'Anthropic (Claude).
 *
 * Écrit à la main plutôt qu'avec le SDK officiel : le projet n'a aucune
 * dépendance IA, et l'assistant n'a besoin que d'un POST avec un tool.
 * Ajouter @anthropic-ai/sdk pour ça alourdirait le build sans rien apporter.
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

/**
 * Sonnet plutôt que Haiku : l'assistant doit comprendre du français et de
 * l'arabe tunisien écrit, souvent mal orthographié ("math", "3eme année",
 * "نحوس على أستاذ"). Haiku rate trop de ces formulations.
 */
const MODEL = "claude-sonnet-4-5";

function apiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not configured.");
  return key;
}

export function isClaudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type ClaudeTool = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

export type ClaudeToolUse = {
  id: string;
  name: string;
  input: unknown;
};

export type ClaudeResult =
  | { type: "text"; text: string }
  | { type: "tool_use"; toolUse: ClaudeToolUse; text: string | null };

/**
 * Un seul aller-retour suffit : on ne demande à Claude que d'extraire des
 * critères (tool_use) ou de répondre (text). Pas de boucle multi-tours, donc
 * pas d'historique à rejouer — la latence et le coût restent bornés.
 */
export async function callClaude(params: {
  system: string;
  userMessage: string;
  tools: ClaudeTool[];
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<ClaudeResult> {
  const controller = new AbortController();
  // Sans plafond, une API qui ne répond pas laisserait l'élève devant les
  // trois points de chargement indéfiniment.
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs ?? 12_000);

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey(),
        "anthropic-version": ANTHROPIC_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: params.maxTokens ?? 700,
        system: params.system,
        messages: [{ role: "user", content: params.userMessage }],
        tools: params.tools,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Claude request failed (${res.status}): ${body.slice(0, 500)}`);
    }

    const data = await res.json();
    const blocks: Array<{ type: string; text?: string; id?: string; name?: string; input?: unknown }> =
      Array.isArray(data?.content) ? data.content : [];

    const textBlock = blocks.find((b) => b.type === "text");
    const toolBlock = blocks.find((b) => b.type === "tool_use");

    if (toolBlock?.name && toolBlock.id) {
      return {
        type: "tool_use",
        toolUse: { id: toolBlock.id, name: toolBlock.name, input: toolBlock.input },
        text: textBlock?.text ?? null,
      };
    }

    if (textBlock?.text) {
      return { type: "text", text: textBlock.text };
    }

    throw new Error("Claude returned no usable content block.");
  } finally {
    clearTimeout(timeout);
  }
}