import { useMemo, useState } from "react";
import { useDemoData } from "../state/useDemoData";

const TOPIC_LABELS: Record<string, string> = {
  efficacy: "Эффективность",
  safety: "Безопасность",
  price: "Цена",
  convenience: "Удобство",
  competition: "Конкуренты",
  other: "Прочее",
  "Безопасность": "Безопасность",
  "Эффективность": "Эффективность",
  "Удобство": "Удобство",
  "Цена": "Цена",
  "Конкуренты": "Конкуренты",
  "Прочее": "Прочее",
};

const SENTIMENT_LABELS: Record<string, string> = {
  positive: "позитивный",
  neutral: "нейтральный",
  negative: "негативный",
  "позитивный": "позитивный",
  "нейтральный": "нейтральный",
  "негативный": "негативный",
};

const SENTIMENT_DOT: Record<string, string> = {
  positive: "#3ee6b0",
  negative: "#ff5d7a",
  neutral: "#7aa7ff",
  "позитивный": "#3ee6b0",
  "негативный": "#ff5d7a",
  "нейтральный": "#7aa7ff",
};

export function ClustersPage() {
  const { clusters, drugs, doctors, notes } = useDemoData();
  const [topic, setTopic] = useState<string>("all");
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);

  const topics = useMemo(() => {
    const set = new Set<string>();
    for (const c of clusters) set.add(c.topic);
    return ["all", ...Array.from(set)];
  }, [clusters]);

  const filtered = useMemo(() => {
    const list = topic === "all" ? clusters : clusters.filter((c) => c.topic === topic);
    return list.slice().sort((a, b) => b.count - a.count);
  }, [clusters, topic]);

  const selected = useMemo(() => {
    const id = selectedClusterId ?? filtered[0]?.id ?? null;
    if (!id) return null;
    return clusters.find((c) => c.id === id) ?? null;
  }, [clusters, filtered, selectedClusterId]);

  const noteMap = useMemo(() => new Map(notes.map((n) => [n.id, n])), [notes]);

  const selectedEvidence = useMemo(() => {
    if (!selected) return [];
    return selected.examples.map((ex, idx) => {
      const note = noteMap.get(ex.noteId);
      return {
        noteId: ex.noteId,
        text: note?.text ?? ex.text,
        noteNum: idx + 1,
        found: !!note,
      };
    });
  }, [noteMap, selected]);

  const topicLabel = (t: string) => TOPIC_LABELS[t] ?? t;
  const sentimentLabel = (s: string) => SENTIMENT_LABELS[s] ?? s;
  const sentimentColor = (s: string) => SENTIMENT_DOT[s] ?? "#7aa7ff";

  if (clusters.length === 0) {
    return (
      <div className="muted" style={{ textAlign: "center", padding: "48px 0", fontSize: 16 }}>
        Загрузка данных...
      </div>
    );
  }

  return (
    <div className="grid cols-2">
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Кластеры</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Группировка похожих комментариев и паттернов. Новые заметки автоматически сопоставляются с существующими кластерами.
        </p>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span className="muted">Тема:</span>
          <select className="select" style={{ width: 220 }} value={topic} onChange={(e) => setTopic(e.target.value)}>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t === "all" ? "Все темы" : topicLabel(t)}
              </option>
            ))}
          </select>
          <span className="badge">препаратов: {drugs.length}</span>
          <span className="badge">врачей: {doctors.length}</span>
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          {filtered.map((c) => {
            const isActive = (selectedClusterId ?? filtered[0]?.id) === c.id;
            const dotColor = sentimentColor(c.sentiment);
            return (
              <button
                key={c.id}
                className="card"
                style={{
                  padding: 12,
                  cursor: "pointer",
                  textAlign: "left",
                  borderColor: isActive ? "rgba(122,167,255,0.55)" : "rgba(255,255,255,0.12)",
                  background: isActive ? "rgba(122,167,255,0.07)" : "rgba(255,255,255,0.06)",
                }}
                onClick={() => setSelectedClusterId(c.id)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{c.title}</div>
                    <div className="muted" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                      <span>{topicLabel(c.topic)}</span>
                      <span>·</span>
                      <span style={{ color: dotColor, display: "flex", alignItems: "center", gap: 4 }}>
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: dotColor,
                            display: "inline-block",
                          }}
                        />
                        {sentimentLabel(c.sentiment)}
                      </span>
                      <span>·</span>
                      <span>{c.count} заметок</span>
                    </div>
                  </div>
                  <span className="badge" style={{ flexShrink: 0, alignSelf: "flex-start" }}>
                    {c.emerging ? "🔥 растущий" : "📊 стабильный"}
                  </span>
                </div>
                <div style={{ marginTop: 10 }} className="muted">
                  {c.summary}
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="muted">По выбранной теме кластеров нет.</div>
          )}
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Примеры и доказательства</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Контекст сохраняется: каждый паттерн подкреплён реальными цитатами из заметок.
        </p>

        {selected && (
          <div
            className="muted"
            style={{ marginBottom: 14, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}
          >
            <span style={{ fontWeight: 700, color: "#eaf0ff" }}>{selected.title}</span>
            <span>·</span>
            <span>{selectedEvidence.length} {selectedEvidence.length === 1 ? "цитата" : "цитаты"}</span>
          </div>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          {selectedEvidence.map((ex, idx) => (
            <div key={idx} className="card" style={{ padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span
                  className="badge"
                  style={{ fontSize: 11, background: "rgba(122,167,255,0.1)", borderColor: "rgba(122,167,255,0.3)" }}
                >
                  Цитата #{idx + 1}
                </span>
                {!ex.found && (
                  <span className="badge" style={{ fontSize: 11, color: "#ff8fa1", borderColor: "#ff8fa1" }}>
                    из архива кластера
                  </span>
                )}
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.55 }}>{ex.text}</div>
            </div>
          ))}
          {!selected && <div className="muted">Выберите кластер слева, чтобы увидеть цитаты.</div>}
          {selected && selectedEvidence.length === 0 && (
            <div className="muted">Примеры для этого кластера не найдены.</div>
          )}
        </div>
      </section>
    </div>
  );
}
