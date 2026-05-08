import { useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { useDemoData } from "../state/useDemoData";

// Названия линий для тултипа и легенды
const LINE_NAMES: Record<string, string> = {
  efficacyNeg: "Эффективность (негатив)",
  safetyNeg: "Безопасность (негатив)",
  priceNeg: "Цена (негатив)",
};

export function TrendsPage() {
  const { trends } = useDemoData();
  const [timeRange, setTimeRange] = useState<"3m" | "6m" | "12m">("6m");

  const totalPoints = trends?.topicSentimentSeries?.length ?? 0;

  const series = useMemo(() => {
    const all = trends?.topicSentimentSeries ?? [];
    const last = timeRange === "3m" ? 3 : timeRange === "6m" ? 6 : 12;
    return all.slice(-last);
  }, [trends, timeRange]);

  return (
    <div className="grid cols-2">
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Тренды 3 / 6 / 12 месяцев</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Доля негативных упоминаний по ключевым темам в динамике.
        </p>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            className="btn"
            onClick={() => setTimeRange("3m")}
            disabled={timeRange === "3m"}
            style={timeRange === "3m" ? { borderColor: "rgba(122,167,255,0.6)", background: "rgba(122,167,255,0.12)" } : {}}
          >
            3 мес.
          </button>
          <button
            className="btn"
            onClick={() => setTimeRange("6m")}
            disabled={timeRange === "6m"}
            style={timeRange === "6m" ? { borderColor: "rgba(122,167,255,0.6)", background: "rgba(122,167,255,0.12)" } : {}}
          >
            6 мес.
          </button>
          <button
            className="btn"
            onClick={() => setTimeRange("12m")}
            disabled={timeRange === "12m" || totalPoints < 12}
            style={timeRange === "12m" ? { borderColor: "rgba(122,167,255,0.6)", background: "rgba(122,167,255,0.12)" } : {}}
            title={totalPoints < 12 ? "Недостаточно данных для отображения 12 месяцев" : ""}
          >
            12 мес.{totalPoints < 12 && <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.6 }}>—</span>}
          </button>
        </div>

        {!trends && (
          <div className="muted" style={{ marginTop: 16, textAlign: "center" }}>Загрузка...</div>
        )}

        <div style={{ height: 320, marginTop: 12 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ left: 8, right: 8, top: 10 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" />
              <XAxis
                dataKey="month"
                stroke="rgba(234,240,255,0.7)"
                interval={0}
                tick={{ fill: "rgba(234,240,255,0.7)", fontSize: 11, angle: -90, textAnchor: "end", dy: 4 }}
                height={56}
              />
              <YAxis
                stroke="rgba(234,240,255,0.7)"
                tickFormatter={(v) => `${Math.round(v * 100)}%`}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(11,16,32,0.95)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 12,
                }}
                formatter={(value: number, name: string) => [
                  `${Math.round(value * 100)}%`,
                  LINE_NAMES[name] ?? name,
                ]}
              />
              <Legend
                formatter={(value) => (
                  <span style={{ color: "rgba(234,240,255,0.8)", fontSize: 12 }}>
                    {LINE_NAMES[value] ?? value}
                  </span>
                )}
              />
              <Line type="monotone" dataKey="efficacyNeg" stroke="#ff5d7a" dot={false} strokeWidth={2} name="efficacyNeg" />
              <Line type="monotone" dataKey="safetyNeg" stroke="#ffcc66" dot={false} strokeWidth={2} name="safetyNeg" />
              <Line type="monotone" dataKey="priceNeg" stroke="#7aa7ff" dot={false} strokeWidth={2} name="priceNeg" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Новые паттерны</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Кластеры, которые «всплыли» недавно и растут по частоте.
        </p>

        {!trends && (
          <div className="muted" style={{ textAlign: "center", padding: "24px 0" }}>Загрузка...</div>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          {(trends?.emergingClusters ?? []).map((x) => (
            <div key={x.clusterId} className="card" style={{ padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontWeight: 800 }}>{x.title}</div>
                <span
                  className="badge"
                  style={{ color: "#3ee6b0", borderColor: "#3ee6b0", background: "rgba(62,230,176,0.1)", whiteSpace: "nowrap" }}
                >
                  +{x.growthPct}%
                </span>
              </div>
              <div className="muted" style={{ marginTop: 6 }}>{x.reason}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
