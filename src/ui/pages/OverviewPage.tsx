import { useMemo } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useDemoData } from "../state/useDemoData";

export function OverviewPage() {
  const { dashboard, insights } = useDemoData();

  const topObjections = useMemo(() => {
    return dashboard?.topObjections?.slice(0, 5) ?? [];
  }, [dashboard]);

  const topBenefits = useMemo(() => {
    return dashboard?.topBenefits?.slice(0, 5) ?? [];
  }, [dashboard]);

  return (
    <div className="grid cols-2">
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Сентимент по времени</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Агрегация по всем заметкам (включая добавленные вами).
        </p>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dashboard?.sentimentSeries ?? []} margin={{ left: 8, right: 8, top: 10 }}>
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
              <Area type="monotone" dataKey="positive" stackId="1" stroke="#3ee6b0" fill="#3ee6b0" fillOpacity={0.35} />
              <Area type="monotone" dataKey="neutral" stackId="1" stroke="#7aa7ff" fill="#7aa7ff" fillOpacity={0.22} />
              <Area type="monotone" dataKey="negative" stackId="1" stroke="#ff5d7a" fill="#ff5d7a" fillOpacity={0.25} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Топ возражений</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Самые частые негативные паттерны.
        </p>
        <ol>
          {topObjections.map((x) => (
            <li key={x.clusterId} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700 }}>{x.title}</div>
              <div className="muted">{x.evidence}</div>
            </li>
          ))}
        </ol>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Топ преимуществ</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Самые частые позитивные паттерны.
        </p>
        <ol>
          {topBenefits.map((x) => (
            <li key={x.clusterId} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700 }}>{x.title}</div>
              <div className="muted">{x.evidence}</div>
            </li>
          ))}
        </ol>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Рекомендации</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Сформулированные выводы, действия и подтверждающие цитаты из заметок.
        </p>
        <div style={{ display: "grid", gap: 12 }}>
          {(insights?.insights ?? []).slice(0, 3).map((ins) => (
            <div key={ins.title} className="card" style={{ padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontWeight: 800 }}>{ins.title}</div>
                <span className="badge">уверенность {Math.round(ins.confidence * 100)}%</span>
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                {ins.observation}
              </div>
              <div style={{ marginTop: 10 }}>
                <div className="muted" style={{ fontWeight: 700, marginBottom: 6 }}>
                  Действия
                </div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {ins.recommendedActions.slice(0, 4).map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
              <div style={{ marginTop: 10 }}>
                <div className="muted" style={{ fontWeight: 700, marginBottom: 6 }}>
                  Доказательства
                </div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {ins.evidence.slice(0, 3).map((e, idx) => (
                    <li key={`${e.noteId}_${idx}`}>{e.quote}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
          {!insights && <div className="muted">Инсайты ещё не загружены.</div>}
        </div>
      </section>
    </div>
  );
}

