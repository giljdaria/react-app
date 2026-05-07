import { z } from "zod";

const RequestSchema = z.object({
  noteId: z.string().min(1),
  text: z.string().min(1),
});

type Env = {
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
  OPENROUTER_SITE_URL?: string;
  OPENROUTER_APP_NAME?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

async function callOpenRouter(env: Env, prompt: string) {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY (set as Cloudflare secret).");

  const model = env.OPENROUTER_MODEL ?? "anthropic/claude-3.5-sonnet";

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      ...(env.OPENROUTER_SITE_URL ? { "HTTP-Referer": env.OPENROUTER_SITE_URL } : {}),
      ...(env.OPENROUTER_APP_NAME ? { "X-Title": env.OPENROUTER_APP_NAME } : {}),
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            [
              "You are an analytics assistant for pharma field feedback.",
              "Task: classify unstructured visit notes into themes and sentiment per theme.",
              "Return ONLY valid JSON. No markdown.",
              "Output must strictly follow the schema provided by the user message.",
              "Use multi-label topics when multiple themes are present.",
            ].join(" "),
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouter error: ${res.status} ${text}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("Empty model response.");
  return content;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const raw = await context.request.json();
    const { noteId, text } = RequestSchema.parse(raw);

    const prompt = [
      "Classify the note into pharma themes and sentiment per theme.",
      "Themes: efficacy, safety, price, convenience, competition, other.",
      "Sentiment per theme: positive | neutral | negative.",
      "Return JSON with schema:",
      '{ "noteId": string, "topics": [{ "topic": "...", "sentiment": "...", "rationale": string }] }',
      "Constraints:",
      "- Return 1..6 topics. Do not invent extra keys.",
      "- rationale should be short and grounded in the note text.",
      "",
      `noteId: ${noteId}`,
      `text: ${text}`,
    ].join("\n");

    const content = await callOpenRouter(context.env, prompt);

    // Best-effort JSON parse; validate lightly.
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      return errorResponse("Model returned non-JSON. Adjust prompt or model.", 502);
    }

    if (parsed?.noteId !== noteId) parsed.noteId = noteId;

    return jsonResponse(parsed, 200);
  } catch (e: any) {
    return errorResponse(e?.message ?? "Unknown error", 500);
  }
}

