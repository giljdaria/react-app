import { useMemo, useState } from "react";
import { z } from "zod";
import { useDemoData } from "../state/useDemoData";
import { analyzeNote } from "../services/api";

const FormSchema = z.object({
  doctorId: z.string().min(1),
  drugId: z.string().min(1),
  date: z.string().min(1),
  text: z.string().min(10),
});

export function ImportPage() {
  const { doctors, drugs, addLocalNote } = useDemoData();
  const [doctorId, setDoctorId] = useState("");
  const [drugId, setDrugId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return FormSchema.safeParse({ doctorId, drugId, date, text }).success;
  }, [doctorId, drugId, date, text]);

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
      const note = addLocalNote({
        doctorId,
        drugId,
        date,
        text,
        source: "manual",
      });
      const analyzed = await analyzeNote({ noteId: note.id, text: note.text });
      setResult(analyzed);
      setStatus("done");
    } catch (e: any) {
      setStatus("error");
      setError(e?.message ?? "Ошибка запроса к AI.");
    }
  }

  return (
    <div className="grid cols-2">
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Импорт / ручной ввод</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Для новых заметок сервис делает онлайн‑анализ через серверное API (Cloudflare Functions). Ключ доступа к
          OpenRouter хранится на сервере и в браузер не попадает.
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
                  {d.name}
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
            <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} />
          </div>

          <button className="btn" disabled={!canSubmit || status === "loading"} onClick={onSubmit}>
            {status === "loading" ? "Анализируем..." : "Проанализировать"}
          </button>

          {status === "error" && <div style={{ color: "#ff8fa1" }}>{error}</div>}
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Результат AI</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Темы и тональность по каждой теме в JSON.
        </p>
        <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
          {result ? JSON.stringify(result, null, 2) : "Пока нет результатов. Добавьте заметку и нажмите «Проанализировать»."}
        </pre>
      </section>
    </div>
  );
}

