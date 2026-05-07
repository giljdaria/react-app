import { z } from "zod";

const AnalyzeResponseSchema = z.object({
  noteId: z.string(),
  topics: z.array(
    z.object({
      topic: z.enum(["efficacy", "safety", "price", "convenience", "competition", "other"]),
      sentiment: z.enum(["positive", "neutral", "negative"]),
      rationale: z.string().optional(),
    }),
  ),
});

export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;

export async function analyzeNote(input: { noteId: string; text: string }): Promise<AnalyzeResponse> {
  const res = await fetch("/api/analyzeNote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API error: ${res.status} ${body}`);
  }

  const json = await res.json();
  return AnalyzeResponseSchema.parse(json);
}

