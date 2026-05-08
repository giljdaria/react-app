import { useMemo, useState } from "react";
import { z } from "zod";
import { useDemoData } from "../state/useDemoData";
import { analyzeNote, type AnalyzeResponse } from "../services/api";

const FormSchema = z.object({
  doctorId: z.string().min(1),
  drugId: z.string().min(1),
  date: z.string().min(1),
  text: z.string().min(10),
});

const TOPIC_LABELS: Record<string, string> = {
  efficacy: "Эффективность",
  safety: "Безопасность",
  price: "Цена",
  convenience: "Удобство",
  competition: "Конкуренты",
  other: "Прочее",
};

const SENTIMENT_LABELS: Record<string, string> = {
  positive: "позитивный",
  neutral: "нейтральный",
  negative: "негативный",
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#3ee6b0",
  neutral: "#7aa7ff",
  negative: "#ff5d7a",
};

const TOPIC_ICONS: Record<string, string> = {
  efficacy: "📊",
  safety: "🛡️",
  price: "💰",
  convenience: "⚡",
  competition: "⚔️",
  other: "📝",
};

function AnalysisResult({ result }: { result: AnalyzeResponse }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 18 }}>✅</span>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Анализ завершён</span>
        <span className="badge" style={{ marginLeft: "auto", fontSize: 11 }}>
          ID заметки: {result.noteId}
        </span>
      </div>

      {result.topics.length === 0 && (
        <div className="muted">Темы не найдены. Попробуйте более подробную заметку.</div>
      )}

      {result.topics.map((t, idx) => {
        const sentimentColor = SENTIMENT_COLORS[t.sentiment] ?? "#7aa7ff";
        return (
          <div
            key={idx}
            className="card"
            style={{
              padding: "14px 16px",
              borderLeft: "3px solid " + sentimentColor,
              borderRadius: 12,
              gap: 6,
              display: "grid",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>{TOPIC_ICONS[t.topic] ?? "📝"}</span>
                <span style={{ fontWeight: 800, fontSize: 15 }}>
                  {TOPIC_LABELS[t.topic] ?? t.topic}
                </span>
              </div>
              <span
                className="badge"
                style={{
                  color: sentimentColor,
                  borderColor: sentimentColor,
                  background: sentimentColor + "18",
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                {SENTIMENT_LABELS[t.sentiment] ?? t.sentiment}
              </span>
            </div>
            {t.rationale && (
              <div className="muted" style={{ fontSize: 13, lineHeight: 1.5, marginTop: 2, paddingLeft: 28 }}>
                {t.rationale}
              </div>
            )}
          </div>
        );
      })}

      {result.topics.length > 0 && (
        <div className="muted" style={{ fontSize: 12, textAlign: "right", marginTop: 4 }}>
          Найдено тем: {result.topics.length}
        </div>
      )}
    </div>
  );
}

export function ImportPage() {
  const { doctors, drugs, notes, addLocalNote } = useDemoData();
  const [doctorId, setDoctorId] = useState("");
  const [drugId, setDrugId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return FormSchema.safeParse({ doctorId, drugId, date, text }).success;
  }, [doctorId, drugId, date, text]);

  // Только заметки добавленные вручную (source === "manual")
  const manualNotes = useMemo(() => {
    return notes.filter((n) => n.source === "manual").slice().reverse();
  }, [notes]);

  const doctorMap = useMemo(() => new Map(doctors.map((d) => [d.id, d])), [doctors]);
  const drugMap = useMemo(() => new Map(drugs.map((d) => [d.id, d])), [drugs]);

  async function onSubmit() {
    setStatus("loading");
    setError(null);
    setResult(null);

    const parsed = FormSchema.safeParse({ doctorId, drugId, date, text });
    if (!parsed.success) {
      setStatus("error");
      setError("Проверьте поля формы.");
      return;
    }

    try {
      const note = addLocalNote({ doctorId, drugId, date, text, source: "manual" });
      const analyzed = await analyzeNote({ noteId: note.id, text: note.text });
      setResult(analyzed);
      setStatus("done");
      // Сброс формы после успеха
      setText("");
      setDoctorId("");
      setDrugId("");
    } catch (e: any) {
      setStatus("error");
      setError(e?.message ?? "Ошибка запроса к AI.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Верхняя строка: форма + результат */}
      <div className="grid cols-2">
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Импорт / ручной ввод</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Заметка сохраняется в браузере и сразу видна на других экранах. При следующем деплое данные сбрасываются до демо-набора.
          </p>

          <div className="grid" style={{ gap: 10 }}>
            <div>
              <label className="muted">Врач</label>
              <select className="select" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
                <option value="">— выберите врача —</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {d.specialty} · {d.region}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="muted">Препарат</label>
              <select className="select" value={drugId} onChange={(e) => setDrugId(e.target.value)}>
                <option value="">— выберите препарат —</option>
                {drugs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {d.drugClass}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="muted">Дата визита</label>
              <input className="input" value={date} onChange={(e) => setDate(e.target.value)} type="date" />
            </div>

            <div>
              <label className="muted">Заметка</label>
              <textarea
                className="textarea"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Опишите визит: вопросы врача, возражения по цене или безопасности, положительные комментарии..."
              />
            </div>

            <button className="btn" disabled={!canSubmit || status === "loading"} onClick={onSubmit}>
              {status === "loading" ? "⏳ Анализируем..." : "🔍 Сохранить и проанализировать"}
            </button>

            {status === "error" && (
              <div
                style={{
                  color: "#ff8fa1",
                  background: "rgba(255,93,122,0.1)",
                  border: "1px solid rgba(255,93,122,0.3)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 14,
                }}
              >
                ⚠️ {error}
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <h2 style={{ marginTop: 0 }}>Результат AI</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Темы и тональность, выявленные в заметке.
          </p>

          {status === "idle" && (
            <div
              className="muted"
              style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 160, textAlign: "center" }}
            >
              <span style={{ fontSize: 40 }}>🤖</span>
              <span>Результаты появятся здесь после анализа</span>
            </div>
          )}

          {status === "loading" && (
            <div
              className="muted"
              style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 160 }}
            >
              <span style={{ fontSize: 32 }}>⏳</span>
              <span>Анализируем заметку...</span>
            </div>
          )}

          {status === "done" && result && <AnalysisResult result={result} />}

          {status === "error" && (
            <div
              className="muted"
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, minHeight: 120, justifyContent: "center" }}
            >
              <span style={{ fontSize: 32 }}>❌</span>
              <span>Анализ не удался. Проверьте форму и попробуйте снова.</span>
            </div>
          )}
        </section>
      </div>

      {/* Нижний блок: список добавленных заметок */}
      {manualNotes.length > 0 && (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>
            Добавленные заметки{" "}
            <span className="badge" style={{ fontSize: 13, verticalAlign: "middle" }}>
              {manualNotes.length}
            </span>
          </h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Сохранены в вашем браузере — видны на всех экранах. Сбрасываются при обновлении демо-данных.
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            {manualNotes.map((note) => {
              const doctor = doctorMap.get(note.doctorId);
              const drug = drugMap.get(note.drugId);
              return (
                <div key={note.id} className="card" style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>
                        {doctor?.name ?? note.doctorId}
                      </span>
                      {doctor && (
                        <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>
                          {doctor.specialty} · {doctor.region}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      {drug && (
                        <span className="badge" style={{ fontSize: 11 }}>
                          {drug.name}
                        </span>
                      )}
                      <span className="badge" style={{ fontSize: 11 }}>
                        {note.date}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(234,240,255,0.85)" }}>
                    {note.text}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
