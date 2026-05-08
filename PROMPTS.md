# PROMPTS.md

История промптов, используемых в проекте для вызовов LLM через OpenRouter.

---

## 1. Классификация темы + сентимент по заметке

**Endpoint:** `POST /api/analyzeNote`  
**Файл:** `functions/api/analyzeNote.ts`  
**Когда вызывается:** пользователь нажимает «Проанализировать» на экране «Импорт»

### System prompt

```
You are an analytics assistant for pharma field feedback.
Task: classify unstructured visit notes into themes and sentiment per theme.
Return ONLY valid JSON. No markdown, no backticks, no preamble.
Output must strictly follow the schema provided by the user message.
Use multi-label topics when multiple themes are present in one note.
```

### User prompt (шаблон)

```
Classify the note into pharma themes and sentiment per theme.

Themes: efficacy, safety, price, convenience, competition, other.
Sentiment per theme: positive | neutral | negative.

Return JSON with schema:
{ "noteId": string, "topics": [{ "topic": "...", "sentiment": "...", "rationale": string }] }

Constraints:
- Return 1..6 topics. Do not invent extra keys.
- rationale must be short (1–2 sentences) and grounded in the note text.
- Do not translate. Keep rationale in the same language as the note.

noteId: {{noteId}}
text: {{text}}
```

### Пример ответа

```json
{
  "noteId": "n_local_1746700000000",
  "topics": [
    {
      "topic": "price",
      "sentiment": "negative",
      "rationale": "Врач упоминает высокую стоимость для льготных пациентов и спрашивает о программах поддержки."
    },
    {
      "topic": "convenience",
      "sentiment": "positive",
      "rationale": "Положительно отмечает режим приёма один раз в день."
    }
  ]
}
```

### Почему именно такой промпт

- `Return ONLY valid JSON. No markdown.` — без этой инструкции многие LLM оборачивают ответ в ```json ... ```, что ломает `JSON.parse()`.
- `multi-label topics` — одна заметка может затрагивать сразу несколько тем; это важно для точной аналитики.
- `rationale` — позволяет объяснить пользователю, почему AI принял такое решение; повышает доверие к результату.
- Схема передаётся в user-части, а не только в system — это улучшает следование формату у моделей, которые сильнее реагируют на user-контекст.

---

## 2. Генерация actionable-инсайтов

**Endpoint:** `POST /api/generateInsights`  
**Файл:** `functions/api/analyzeNote.ts` (расширение) / отдельная функция  
**Когда вызывается:** фоновая генерация при накоплении новых заметок (в демо — данные статичны в `insights.json`)

### System prompt

```
You are generating actionable insights for pharma marketing and product managers.
Return ONLY valid JSON. No markdown, no backticks, no preamble.
Insights must be grounded in the provided aggregates and evidence quotes.
Preserve nuance: do not over-generalize beyond the evidence.
```

### User prompt (шаблон)

```
Generate actionable insights based on field visit data.

Output JSON schema:
{
  "insights": [{
    "title": string,
    "observation": string,
    "evidence": [{ "noteId": string, "quote": string }],
    "recommendedActions": [string],
    "confidence": number (0..1)
  }]
}

Rules:
- 2–5 insights total.
- Each insight must have 1–3 evidence quotes from real note texts.
- recommendedActions must be concrete: specific materials, studies, trainings, pricing programs, FAQ documents.
- confidence reflects how strongly the evidence supports the insight (0.6 = moderate, 0.8+ = strong).
- observation describes WHAT is happening; recommendedActions describe WHAT TO DO about it.
- Do not use internal IDs like doc_001 or drug_a in output text — use real names.

scope: {{scope_json}}
aggregates: {{aggregates_json}}
evidence_quotes: {{evidence_json}}
```

### Пример ответа

```json
{
  "insights": [
    {
      "title": "Кардиологи нуждаются в материалах по взаимодействиям препарата",
      "observation": "В заметках по КардиоФлексу нарастает число вопросов о совместимости с иАПФ, диуретиками и бета-блокаторами. Готового справочного материала нет.",
      "evidence": [
        {
          "noteId": "n_0004",
          "quote": "Всё чаще спрашивают про взаимодействие с ингибиторами АПФ и диуретиками. Нужны слайды."
        }
      ],
      "recommendedActions": [
        "Подготовить памятку по схеме титрации и частым нежелательным явлениям.",
        "Создать слайд по лекарственным взаимодействиям с практическими примерами."
      ],
      "confidence": 0.82
    }
  ]
}
```

### Почему именно такой промпт

- Разделение `observation` (что происходит) и `recommendedActions` (что делать) — ключевое для actionable-формата; без этого AI склонен смешивать описание и рекомендацию.
- `confidence` как число — позволяет сортировать инсайты по приоритету и визуально выделять цветом (зелёный / синий / красный в UI).
- Явный запрет использовать внутренние ID (`doc_001`, `drug_a`) в тексте — без этого ограничения модель иногда «протекает» техническими идентификаторами в пользовательский текст.

---

## 3. Валидация ответа (Zod-схема на клиенте и сервере)

Каждый ответ LLM проходит валидацию перед использованием. Это защищает от «галлюцинаций» структуры и неожиданных ключей.

```typescript
// Пример схемы для analyzeNote (src/ui/services/api.ts)
const TopicSchema = z.object({
  topic: z.enum(["efficacy", "safety", "price", "convenience", "competition", "other"]),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  rationale: z.string().optional(),
});

const AnalyzeResponseSchema = z.object({
  noteId: z.string(),
  topics: z.array(TopicSchema),
});
```

Если ответ не соответствует схеме — пользователь видит понятное сообщение об ошибке вместо краша приложения.

---

## История изменений промптов

| Версия | Изменение |
|---|---|
| v1 | Базовый промпт: классификация по одной теме на заметку |
| v2 | Добавлен multi-label: несколько тем на одну заметку |
| v2.1 | Добавлено поле `rationale` для объяснения решения AI |
| v2.2 | Добавлен явный запрет markdown-обёртки (`no backticks`) |
| v3 | Добавлен промпт для генерации инсайтов с `confidence` и разделением `observation` / `recommendedActions` |
| v3.1 | Добавлено ограничение: не использовать внутренние ID в тексте ответа |
