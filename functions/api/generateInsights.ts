import { z } from "zod";

type Env = {
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
  if (!res.ok) throw new Error(`OpenRouter error: ${res.status} ${await res.text().catch(() => "")}`);
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("Empty model response.");
  return content;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const raw = await context.request.json();
    const { scope, aggregates, evidence } = RequestSchema.parse(raw);

    const prompt = [
      "You are generating actionable insights for pharma marketing and product.",
      "Input: aggregated metrics + evidence quotes from field notes.",
      "Output: JSON schema:",
      '{ "insights": [{ "title": string, "observation": string, "evidence": [{ "noteId": string, "quote": string }], "recommendedActions": [string], "confidence": number }] }',
      "",
      `scope: ${JSON.stringify(scope)}`,
      `aggregates: ${JSON.stringify(aggregates)}`,
      `evidence_quotes: ${JSON.stringify(evidence)}`,
      "",
      "Rules:",
      "- Must include 2-5 evidence quotes per insight when possible.",
      "- Actions must be concrete (materials, studies, training, positioning, pricing, FAQ).",
      "- Preserve nuance: do not over-generalize beyond evidence.",
    ].join("\n");

    const content = await callOpenRouter(context.env, prompt);
    const parsed = JSON.parse(content);
    return jsonResponse(parsed, 200);
  } catch (e: any) {
    return jsonResponse({ error: e?.message ?? "Unknown error" }, 500);
  }
}

