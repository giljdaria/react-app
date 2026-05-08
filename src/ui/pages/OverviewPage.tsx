import { useMemo } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useDemoData } from "../state/useDemoData";

const CONFIDENCE_COLOR = (conf: number) => {
  if (conf >= 0.7) return "#3ee6b0";
  if (conf >= 0.5) return "#7aa7ff";
  return "#ff5d7a";
};

const ACTION_ICONS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];

export function OverviewPage() {
  const { dashboard, insights } = useDemoData();

  const topObjections = useMemo(() => {
    return dashboard?.topObjections?.slice(0, 5) ?? [];
  }, [dashboard]);

  const topBenefits = useMemo(() => {
    return dashboard?.topBenefits?.slice(0, 5) ?? [];
  }, [dashboard]);

  if (!dashboard) {
    return (
      <div className="muted" style={{ textAlign: "center", padding: "48px 0", fontSize: 16 }}>
        Загрузка данных...
      </div>
    );
  }

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
              <Area type="monotone" dataKey="positive" stackId="1" stroke="#3ee6b0" fill="#3ee6b0" fillOpacity={0.35} name="Позитивный" />
              <Area type="monotone" dataKey="neutral" stackId="1" stroke="#7aa7ff" fill="#7aa7ff" fillOpacity={0.22} name="Нейтральный" />
              <Area type="monotone" dataKey="negative" stackId="1" stroke="#ff5d7a" fill="#ff5d7a" fillOpacity={0.25} name="Негативный" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Топ возражений</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Самые частые негативные паттерны.
        </p>
        <ol style={{ paddingLeft: 20, margin: 0 }}>
          {topObjections.map((x) => (
            <li key={x.clusterId} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700 }}>{x.title}</div>
              <div className="muted">{x.evidence}</div>
            </li>
          ))}
          {topObjections.length === 0 && (
            <div className="muted">Данные загружаются...</div>
          )}
        </ol>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Топ преимуществ</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Самые частые позитивные паттерны.
        </p>
        <ol style={{ paddingLeft: 20, margin: 0 }}>
          {topBenefits.map((x) => (
            <li key={x.clusterId} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700 }}>{x.title}</div>
              <div className="muted">{x.evidence}</div>
            </li>
          ))}
          {topBenefits.length === 0 && (
            <div className="muted">Данные загружаются...</div>
          )}
        </ol>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Рекомендации</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Приоритетные действия на основе анализа обратной связи — с уровнем уверенности и подтверждающими цитатами.
        </p>

        {!insights && (
          <div className="muted" style={{ textAlign: "center", padding: "24px 0" }}>Загрузка...</div>
        )}

        <div style={{ display: "grid", gap: 16 }}>
          {(insights?.insights ?? []).slice(0, 3).map((ins) => {
            const confColor = CONFIDENCE_COLOR(ins.confidence);
            return (
              <div
                key={ins.title}
                className="card"
                style={{
                  padding: "14px 16px",
                  borderLeft: "3px solid " + confColor,
                }}
              >
                {/* Заголовок и уверенность */}
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.3 }}>
                    {ins.title}
                  </div>
                  <span
                    className="badge"
                    style={{
                      color: confColor,
                      borderColor: confColor,
                      background: confColor + "18",
                      fontWeight: 700,
                      fontSize: 12,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {Math.round(ins.confidence * 100)}% уверенность
                  </span>
                </div>

                {/* Наблюдение */}
                <div className="muted" style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5 }}>
                  {ins.observation}
                </div>

                {/* Рекомендуемые действия */}
                {ins.recommendedActions.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "rgba(234,240,255,0.5)",
                        marginBottom: 8,
                      }}
                    >
                      Что сделать
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {ins.recommendedActions.slice(0, 4).map((action, actionIdx) => (
                        <div
                          key={actionIdx}
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "flex-start",
                            background: "rgba(255,255,255,0.04)",
                            borderRadius: 8,
                            padding: "8px 10px",
                          }}
                        >
                          <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
                            {ACTION_ICONS[actionIdx] ?? "▪️"}
                          </span>
                          <span style={{ fontSize: 13, lineHeight: 1.5 }}>{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Цитаты-доказательства */}
                {ins.evidence.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "rgba(234,240,255,0.5)",
                        marginBottom: 8,
                      }}
                    >
                      Цитаты из заметок
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {ins.evidence.slice(0, 3).map((e, evidenceIdx) => (
                        <div
                          key={evidenceIdx}
                          style={{
                            borderLeft: "2px solid rgba(255,255,255,0.15)",
                            paddingLeft: 10,
                            fontSize: 13,
                            color: "rgba(234,240,255,0.75)",
                            fontStyle: "italic",
                            lineHeight: 1.5,
                          }}
                        >
                          «{e.quote}»
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
