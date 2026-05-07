import { useMemo, useState } from "react";
import { useDemoData } from "../state/useDemoData";

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

  const selectedEvidence = useMemo(() => {
    if (!selected) return [];
    const map = new Map(notes.map((n) => [n.id, n.text]));
    return selected.examples.map((ex) => ({ noteId: ex.noteId, text: map.get(ex.noteId) ?? ex.text }));
  }, [notes, selected]);

  return (
    <div className="grid cols-2">
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Кластеры</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Группировка похожих комментариев и паттернов. Новые заметки автоматически сопоставляются с существующими
          кластерами.
        </p>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span className="muted">Тема</span>
          <select className="select" style={{ width: 280 }} value={topic} onChange={(e) => setTopic(e.target.value)}>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <span className="badge">препаратов: {drugs.length}</span>
          <span className="badge">врачей: {doctors.length}</span>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {filtered.map((c) => (
            <button
              key={c.id}
              className="card"
              style={{
                padding: 12,
                cursor: "pointer",
                textAlign: "left",
                borderColor:
                  (selectedClusterId ?? filtered[0]?.id) === c.id ? "rgba(122,167,255,0.55)" : "rgba(255,255,255,0.12)",
              }}
              onClick={() => setSelectedClusterId(c.id)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{c.title}</div>
                  <div className="muted">
                    {c.topic} · {c.sentiment} · {c.count} заметок
                  </div>
                </div>
                <span className="badge">{c.emerging ? "растущий" : "стабильный"}</span>
              </div>
              <div style={{ marginTop: 10 }} className="muted">
                {c.summary}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Примеры и доказательства</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Контекст сохраняется: каждый паттерн подкреплён реальными цитатами.
        </p>
        <div style={{ display: "grid", gap: 10 }}>
          {selectedEvidence.map((ex) => (
            <div key={ex.noteId} className="card" style={{ padding: 12 }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                ID заметки: {ex.noteId}
              </div>
              <div>{ex.text}</div>
            </div>
          ))}
          {!selected && <div className="muted">Кластеры ещё не загружены.</div>}
        </div>
      </section>
    </div>
  );
}

