# AI-анализатор обратной связи (demo)

Сервис превращает заметки медпредставителей после визитов во врачей в **темы**, **сентимент по темам**, **кластеры**, **тренды 3/6/12м** и **actionable insights** (с действиями и цитатами‑доказательствами).

Демо‑данные синтетические.

## Возможности

- **Импорт заметок**: ручной ввод (привязка к врачу, препарату, дате)
- **AI‑классификация**: темы `efficacy | safety | price | convenience | competition | other`
- **AI‑sentiment**: `positive | neutral | negative` по каждой теме
- **Кластеризация**: примеры паттернов + evidence (цитаты)
- **Тренды**: 3/6/12 месяцев
- **AI‑инсайты**: observation → evidence → recommendedActions

## Архитектура (высокоуровнево)

- **Frontend**: React + Vite + TypeScript (`src/`)
- **Server-side API**: Cloudflare Pages Functions (`functions/api/`)
  - `POST /api/analyzeNote` — темы+сентимент по заметке
  - `POST /api/generateInsights` — инсайты по агрегатам и evidence
  - `GET /api/dashboard` — заготовка под серверную агрегацию (в демо UI читает `public/data/*`)
- **Seed/оффлайн пайплайн**: `scripts/analyze.mjs` генерирует синтетический набор и базовые агрегаты

## Запуск локально

Требования: Node.js 18+.

```bash
npm install
npm run dev
```

Откройте URL, который покажет Vite.

## Сборка ZIP архива проекта

На Windows (PowerShell):

```powershell
.\tools\make-zip.ps1
```

Архив создаётся в корне проекта как `ai-feedback-analyzer.zip` (без `node_modules`, `dist`, `.git`).

## Онлайн‑AI (Claude через Functions)

### Secrets

**Нельзя** хранить ключ в браузере. Ключ задаётся как secret на стороне Cloudflare:

- `ANTHROPIC_API_KEY` — ключ Anthropic (Claude)
- (опционально) `ANTHROPIC_MODEL` — например `claude-3-5-sonnet-latest`

Альтернатива (если вы используете OpenRouter вместо прямого Anthropic):

- `OPENROUTER_API_KEY` — ключ OpenRouter
- (опционально) `OPENROUTER_MODEL` — например `anthropic/claude-3.5-sonnet`
- (опционально) `OPENROUTER_SITE_URL`, `OPENROUTER_APP_NAME` — для заголовков OpenRouter

Локально (для тестов функций) можно использовать `.env`/wrangler, но **не коммитить**.

## Генерация синтетики (seed)

Скрипт генерирует большой синтетический набор и пишет файлы в `public/data/`:

```bash
npm run analyze
```

Что генерируется:
- `public/data/notes.json`
- `public/data/dashboard.json`
- `public/data/trends.json`

> `clusters.json`/`insights.json` в демо лежат как “пример формата” и будут расширены в дальнейшем.

## Деплой (Cloudflare Pages)

Общий подход:
- подключить репозиторий в Cloudflare Pages
- включить Pages Functions (папка `functions/`)
- добавить secrets (см. выше)

Build settings (по умолчанию):
- build command: `npm run build`
- output directory: `dist`

