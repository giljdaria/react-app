import { z } from "zod";

const RequestSchema = z.object({
  noteId: z.string().min(1),
  text: z.string().min(1),
});

type Env = {
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
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

async function callAnthropic(env: Env, prompt: string) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Не задан ANTHROPIC_API_KEY (добавьте secret в Cloudflare).");

  const model = env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 800,
      temperature: 0.1,
      system: [
        "Ты аналитический ассистент: классифицируй заметку визита по темам и тональности по каждой теме.",
        "Возвращай ТОЛЬКО валидный JSON без markdown и без лишнего текста.",
        "Строго следуй схеме из пользовательского сообщения.",
      ].join(" "),
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ошибка Anthropic: ${res.status} ${text}`);
  }

  const json = await res.json();
  const content = json?.content?.[0]?.text;
  if (typeof content !== "string" || !content.trim()) throw new Error("Пустой ответ модели.");
  return content;
}

async function callOpenRouter(env: Env, prompt: string) {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Не задан OPENROUTER_API_KEY (добавьте secret в Cloudflare).");

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

    const content = context.env.ANTHROPIC_API_KEY
      ? await callAnthropic(context.env, prompt)
      : await callOpenRouter(context.env, prompt);

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

