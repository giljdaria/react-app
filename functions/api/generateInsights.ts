import { z } from "zod";

type Env = {
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
  OPENROUTER_SITE_URL?: string;
  OPENROUTER_APP_NAME?: string;
};

const RequestSchema = z.object({
  scope: z.object({
    drugId: z.string().optional(),
    specialty: z.string().optional(),
    windowMonths: z.number().int().min(1).max(24).default(6),
  }),
  aggregates: z.any(),
  evidence: z.array(z.object({ noteId: z.string(), text: z.string() })).max(50).default([]),
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function callOpenRouter(env: Env, prompt: string) {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Не задан OPENROUTER_API_KEY (добавьте secret в Cloudflare).");
  const model = env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-latest";

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
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: [
            "You are generating actionable insights for pharma marketing and product managers.",
            "Return ONLY valid JSON. No markdown.",
            "Insights must be grounded in provided aggregates and evidence quotes; preserve nuance.",
          ].join(" "),
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Ошибка OpenRouter: ${res.status} ${await res.text().catch(() => "")}`);
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("Пустой ответ модели.");
  return content;
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
      max_tokens: 1200,
      temperature: 0.2,
      system: [
        "Ты формируешь рекомендации по полевым заметкам.",
        "Возвращай ТОЛЬКО валидный JSON, без markdown и лишнего текста.",
        "Инсайты должны быть основаны на агрегатах и предоставленных цитатах.",
      ].join(" "),
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Ошибка Anthropic: ${res.status} ${await res.text().catch(() => "")}`);
  const json = await res.json();
  const content = json?.content?.[0]?.text;
  if (typeof content !== "string" || !content.trim()) throw new Error("Пустой ответ модели.");
  return content;
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

export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const raw = await context.request.json();
    const { scope, aggregates, evidence } = RequestSchema.parse(raw);

    const prompt = [
      "Сгенерируй рекомендации для маркетинга/продукта на основе агрегатов и цитат из полевых заметок.",
      "Вход: агрегированные метрики + цитаты-доказательства.",
      "Выход: JSON по схеме:",
      '{ "insights": [{ "title": string, "observation": string, "evidence": [{ "noteId": string, "quote": string }], "recommendedActions": [string], "confidence": number }] }',
      "",
      `scope: ${JSON.stringify(scope)}`,
      `aggregates: ${JSON.stringify(aggregates)}`,
      `evidence_quotes: ${JSON.stringify(evidence)}`,
      "",
      "Правила:",
      "- По возможности 2-5 цитат-доказательств на инсайт.",
      "- Действия должны быть конкретными (материалы, исследования, обучение, позиционирование, цена, FAQ).",
      "- Не обобщай сильнее, чем позволяют доказательства.",
    ].join("\n");

    const content = context.env.ANTHROPIC_API_KEY
      ? await callAnthropic(context.env, prompt)
      : await callOpenRouter(context.env, prompt);

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const extracted = extractFirstJsonObject(content);
      if (!extracted) throw new Error("Модель вернула не-JSON. Проверьте модель/промпт.");
      parsed = JSON.parse(extracted);
    }
    return jsonResponse(parsed, 200);
  } catch (e: any) {
    return jsonResponse({ error: e?.message ?? "Unknown error" }, 500);
  }
}

