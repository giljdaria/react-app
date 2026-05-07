import { useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useDemoData } from "../state/useDemoData";

export function TrendsPage() {
  const { trends } = useDemoData();
  const [window, setWindow] = useState<"3m" | "6m" | "12m">("6m");

  const series = useMemo(() => {
    const all = trends?.topicSentimentSeries ?? [];
    const last = window === "3m" ? 3 : window === "6m" ? 6 : 12;
    return all.slice(-last);
  }, [trends, window]);

  return (
    <div className="grid cols-2">
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Тренды 3 / 6 / 12 месяцев</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Пример: доля негативных упоминаний по ключевым темам в динамике.
        </p>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn" onClick={() => setWindow("3m")} disabled={window === "3m"}>
            3 мес.
          </button>
          <button className="btn" onClick={() => setWindow("6m")} disabled={window === "6m"}>
            6 мес.
          </button>
          <button className="btn" onClick={() => setWindow("12m")} disabled={window === "12m"}>
            12 мес.
          </button>
        </div>

        <div style={{ height: 320, marginTop: 12 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ left: 8, right: 8, top: 10 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="month" stroke="rgba(234,240,255,0.7)" interval={0} minTickGap={0} tickMargin={8} />
              <YAxis stroke="rgba(234,240,255,0.7)" />
              <Tooltip
                contentStyle={{
                  background: "rgba(11,16,32,0.95)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 12,
                }}
              />
              <Line type="monotone" dataKey="efficacyNeg" stroke="#ff5d7a" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="safetyNeg" stroke="#ffcc66" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="priceNeg" stroke="#7aa7ff" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Новые паттерны</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Кластеры, которые “всплыли” недавно и растут по частоте.
        </p>
        <div style={{ display: "grid", gap: 10 }}>
          {(trends?.emergingClusters ?? []).map((x) => (
            <div key={x.clusterId} className="card" style={{ padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontWeight: 800 }}>{x.title}</div>
                <span className="badge">+{x.growthPct}%</span>
              </div>
              <div className="muted">{x.reason}</div>
            </div>
          ))}
          {!trends && <div className="muted">Тренды ещё не загружены.</div>}
        </div>
      </section>
    </div>
  );
}

