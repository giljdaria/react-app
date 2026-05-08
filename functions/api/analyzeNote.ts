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

function extractFirstJsonObject(text: string) {
  const s = text.indexOf("{");
  if (s === -1) return null;
  let depth = 0;
  for (let i = s; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(s, i + 1);
    }
  }
  return null;
}

async function callOpenRouter(env: Env, prompt: string) {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Не задан OPENROUTER_API_KEY (добавьте secret в Cloudflare).");

  // Default must match a model with active OpenRouter endpoints (3.5 sonnet slug often returns 404).
  const model = env.OPENROUTER_MODEL ?? "meta-llama/llama-3.2-3b-instruct:free";

  // #region agent log
  fetch("http://127.0.0.1:7874/ingest/6260229b-f3c3-48fa-a3ab-b0fe04c821c4", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "1b2d04" },
    body: JSON.stringify({
      sessionId: "1b2d04",
      runId: "free-model-iteration-1",
      hypothesisId: "H1",
      location: "functions/api/analyzeNote.ts:callOpenRouter",
      message: "selected OpenRouter model",
      data: { model },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

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
    // #region agent log
    fetch("http://127.0.0.1:7874/ingest/6260229b-f3c3-48fa-a3ab-b0fe04c821c4", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "1b2d04" },
      body: JSON.stringify({
        sessionId: "1b2d04",
        runId: "free-model-iteration-1",
        hypothesisId: "H2",
        location: "functions/api/analyzeNote.ts:callOpenRouter",
        message: "openrouter response not ok",
        data: { status: res.status },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    const text = await res.text().catch(() => "");
    throw new Error(`Ошибка OpenRouter: ${res.status} ${text}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("Пустой ответ модели.");
  return content;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const raw = await context.request.json();
    const { noteId, text } = RequestSchema.parse(raw);

    const prompt = [
      "Классифицируй заметку по темам и тональности по каждой теме.",
      "Темы: efficacy, safety, price, convenience, competition, other.",
      "Тональность по теме: positive | neutral | negative.",
      "Верни JSON по схеме:",
      '{ "noteId": string, "topics": [{ "topic": "...", "sentiment": "...", "rationale": string }] }',
      "Ограничения:",
      "- topics: 1..6. Не добавляй лишних ключей.",
      "- rationale: коротко и строго по тексту заметки.",
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
      const extracted = extractFirstJsonObject(content);
      if (!extracted) return errorResponse("Модель вернула не-JSON. Проверьте модель/промпт.", 502);
      try {
        parsed = JSON.parse(extracted);
      } catch {
        return errorResponse("Модель вернула невалидный JSON. Проверьте модель/промпт.", 502);
      }
    }

    if (parsed?.noteId !== noteId) parsed.noteId = noteId;

    return jsonResponse(parsed, 200);
  } catch (e: any) {
    return errorResponse(e?.message ?? "Unknown error", 500);
  }
}

