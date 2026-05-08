# PROMPTS.md

История промптов, используемых в проекте для вызовов LLM через OpenRouter.

---

## 1. Классификация темы + сентимент по заметке

**Endpoint:** `POST /api/analyzeNote`  
**Файл:** `functions/api/analyzeNote.ts`  
**Когда вызывается:** пользователь нажимает «Сохранить и проанализировать» на экране «Импорт»

### System prompt

```
You are an analytics assistant for pharma field feedback.
Task: classify unstructured visit notes into themes and sentiment per theme.
Return ONLY valid JSON. No markdown, no backticks, no preamble.
Output must strictly follow the schema provided by the user message.
Use multi-label topics when multiple themes are present in one note.
```

### User prompt (актуальный шаблон, v3.1)

```
Классифицируй заметку по темам и тональности по каждой теме.
Темы: efficacy, safety, price, convenience, competition, other.
Тональность по теме: positive | neutral | negative.
Верни JSON по схеме:
{ "noteId": string, "topics": [{ "topic": "...", "sentiment": "...", "rationale": string }] }
Ограничения:
- topics: 1..6. Не добавляй лишних ключей.
- rationale: коротко и строго по тексту заметки.

noteId: {{noteId}}
text: {{text}}
```

### Пример ответа

```json
{
  "noteId": "note_1a2b3c_18f4e2a1b",
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

- **Промпт на русском** — язык заметок русский, модель стабильнее следует инструкциям на том же языке что и входные данные.
- **`Return ONLY valid JSON. No markdown.`** в system — без этой инструкции многие LLM оборачивают ответ в ` ```json ... ``` `, что ломает `JSON.parse()`. Дополнительная защита — функция `extractFirstJsonObject`, которая извлекает первый `{...}` из ответа если прямой парсинг не удался.
- **Multi-label topics** — одна заметка может затрагивать сразу несколько тем; классификация по одной теме теряла бы нюансы.
- **`rationale`** — объяснение решения AI на языке заметки; повышает доверие пользователя к результату и отображается в карточке темы.
- **Схема в user-части, а не только в system** — улучшает следование формату у моделей, которые сильнее реагируют на user-контекст.
- **Названия тем на английском** (`efficacy`, `safety` и т.д.) — английские enum-значения модель знает лучше и реже допускает опечатки; перевод на русский происходит на стороне UI через словари в компонентах.
- **Температура 0.1** — минимальная случайность; классификация должна быть детерминированной, не творческой.

---

## 2. Генерация actionable-инсайтов

**Endpoint:** `POST /api/generateInsights`  
**Файл:** `functions/api/generateInsights.ts`  
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

- **Разделение `observation` и `recommendedActions`** — ключевое для actionable-формата; без явного разделения AI склонен смешивать описание ситуации и рекомендацию в одном поле.
- **`confidence` как число 0..1** — позволяет сортировать инсайты по приоритету и визуально выделять цветом в UI (≥0.7 → зелёный, 0.5–0.7 → синий, <0.5 → красный).
- **Запрет на внутренние ID** (`doc_001`, `drug_a`) — без этого ограничения модель иногда «протекает» техническими идентификаторами в пользовательский текст (такой баг был обнаружен и исправлен в v3.1).
- **Требование конкретных действий** (материалы, исследования, FAQ) — предотвращает расплывчатые рекомендации вроде «улучшить коммуникацию».

---

## 3. Валидация ответов (Zod-схема)

Каждый ответ LLM проходит двойную валидацию: сначала попытка прямого `JSON.parse()`, при неудаче — извлечение первого `{...}` из текста функцией `extractFirstJsonObject`. После этого — проверка структуры через Zod.

```typescript
// src/ui/services/api.ts — клиентская валидация
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

Если ответ не соответствует схеме — пользователь видит понятное сообщение об ошибке («Анализ не удался. Проверьте форму и попробуйте снова.») вместо краша приложения.

---

## 4. Отображение результатов в UI

Названия тем и тональностей переводятся на русский через словари непосредственно в компонентах, а не в промпте. Это позволяет модели работать со стабильными английскими enum-значениями, а пользователю видеть локализованный интерфейс.

```typescript
// src/ui/pages/ImportPage.tsx
const TOPIC_LABELS: Record<string, string> = {
  efficacy:    "Эффективность",
  safety:      "Безопасность",
  price:       "Цена",
  convenience: "Удобство",
  competition: "Конкуренты",
  other:       "Прочее",
};

const SENTIMENT_LABELS: Record<string, string> = {
  positive: "позитивный",
  neutral:  "нейтральный",
  negative: "негативный",
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#3ee6b0",  // зелёный
  neutral:  "#7aa7ff",  // синий
  negative: "#ff5d7a",  // красный
};
```

Аналогичные словари используются в `ClustersPage.tsx` и `TrendsPage.tsx`.

---

## История изменений промптов

| Версия | Изменение |
|---|---|
| v1 | Базовый промпт на английском: классификация по одной теме на заметку |
| v2 | Добавлен multi-label: несколько тем на одну заметку |
| v2.1 | Добавлено поле `rationale` для объяснения решения AI |
| v2.2 | Добавлен явный запрет markdown-обёртки (`no backticks`) |
| v3 | Добавлен промпт для генерации инсайтов с `confidence` и разделением `observation` / `recommendedActions` |
| v3.1 | Добавлено ограничение: не использовать внутренние ID в тексте ответа |
| v3.2 | User prompt переведён на русский язык; добавлен `extractFirstJsonObject` как fallback-парсер |
| v3.3 | Добавлен раздел перевода enum-значений в UI; сообщение ошибки 500 переведено на русский |
