import fs from "node:fs/promises";
import path from "node:path";

/**
 * Offline seed/analyze pipeline for demo.
 *
 * Goals:
 * - Generate a synthetic dataset (doctors/drugs/notes) with built-in patterns.
 * - (Optionally) call OpenRouter to label notes and generate insights.
 * - Compute simple aggregates (dashboard/trends) and write public/data/*.json
 *
 * This script is intended for local/dev use before deploy.
 */

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "public", "data");

function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function monthKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function addMonths(date, delta) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + delta);
  return d;
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function buildSynthetic({ seed = 42, months = 12, doctors = 250, notes = 4000 } = {}) {
  const rng = mulberry32(seed);

  const regions = ["Москва", "Санкт‑Петербург", "Казань", "Екатеринбург", "Новосибирск", "Самара", "Краснодар"];
  const specialties = ["кардиолог", "терапевт", "невролог", "гастроэнтеролог", "эндокринолог"];
  const orgs = ["ГКБ №1", "Поликлиника №12", "ОКБ №2", "КДЦ \"МедПлюс\"", "Клиника \"Здоровье\"", "Поликлиника №7"];
  const lastNames = ["Иванов", "Петров", "Смирнов", "Кузнецов", "Соколов", "Морозов", "Попов", "Волков", "Фёдоров", "Орлов"];
  const initials = ["А.А.", "И.И.", "Д.К.", "М.В.", "П.Н.", "Е.А.", "Л.И.", "Н.С.", "Т.П.", "С.В."];

  const drugs = [
    { id: "drug_a", name: "КардиоФлекс", drugClass: "антигипертензивный" },
    { id: "drug_b", name: "НейроВита", drugClass: "ноотроп" },
    { id: "drug_c", name: "ГастроГард", drugClass: "ингибитор протонной помпы" },
    { id: "drug_d", name: "ГлюкоБаланс", drugClass: "антидиабетический" },
    { id: "drug_e", name: "РиноСейф", drugClass: "антигистаминный" },
  ];

  const doctorsArr = Array.from({ length: doctors }, (_, i) => {
    const ln = pick(rng, lastNames);
    const init = pick(rng, initials);
    return {
      id: `doc_${pad2(Math.floor((i + 1) / 100))}${pad2((i + 1) % 100)}`.replace(/^doc_00/, "doc_"),
      name: `${ln} ${init}`,
      specialty: pick(rng, specialties),
      region: pick(rng, regions),
      organization: pick(rng, orgs),
    };
  });

  const start = addMonths(new Date(), -months + 1);
  start.setDate(1);

  // Built-in patterns:
  // - Safety titration questions spike around month -3..-2
  // - Price objections higher for терапевт and эндокринолог
  // - Competition mentions rise for drug_a in last 2 months
  // - Convenience praise steady for drug_c / drug_e
  function generateNoteText({ topic, sentiment, drug, doctor }) {
    const base = {
      efficacy: [
        "Сомневается в эффективности в отдельных подгруппах.",
        "Просит данные исследований и RWE.",
        "Интересуется сравнением по конечным точкам.",
      ],
      safety: [
        "Спрашивает про побочные и частые НЯ.",
        "Волнуют взаимодействия и противопоказания.",
        "Просит памятку по титрации и мониторингу.",
      ],
      price: [
        "Цена кажется высокой, просит аргументы value и варианты поддержки.",
        "Сравнивает стоимость с аналогами и дженериками.",
        "Говорит, что пациентам сложно купить регулярно.",
      ],
      convenience: [
        "Хвалит удобство приёма и форму выпуска.",
        "Отмечает простую схему и хорошую приверженность.",
        "Понравилась упаковка и понятная инструкция.",
      ],
      competition: [
        "Сравнивает с конкурентом X, спрашивает отличия.",
        "Говорит, что конкурент Y чаще назначают в отделении.",
        "Просит честную сравнительную таблицу.",
      ],
      other: ["Обсуждали общие вопросы ведения пациентов.", "Просит дополнительные материалы.", "Нейтральный фидбек."],
    };

    const sentimentTail =
      sentiment === "positive"
        ? "В целом настроен позитивно."
        : sentiment === "negative"
          ? "Скорее настроен скептически."
          : "В целом нейтрально.";

    const s = pick(mulberry32((topic.length + drug.id.length + doctor.id.length) * 17), base[topic] ?? base.other);
    return `${doctor.specialty}: ${s} Препарат: ${drug.name}. ${sentimentTail}`;
  }

  const notesArr = [];
  for (let i = 0; i < notes; i++) {
    const doctor = pick(rng, doctorsArr);
    const drug = pick(rng, drugs);
    const monthOffset = Math.floor(rng() * months);
    const date = addMonths(start, monthOffset);
    date.setDate(1 + Math.floor(rng() * 27));

    // Topic selection with patterning
    let topic = pick(rng, ["efficacy", "safety", "price", "convenience", "competition"]);
    const mk = monthKey(date);

    // Safety spike
    const isSpike = monthOffset >= months - 3 && monthOffset <= months - 2;
    if (isSpike && rng() < 0.35) topic = "safety";

    // Price higher for some specialties
    if (["терапевт", "эндокринолог"].includes(doctor.specialty) && rng() < 0.25) topic = "price";

    // Competition rise for drug_a in last 2 months
    if (drug.id === "drug_a" && monthOffset >= months - 2 && rng() < 0.30) topic = "competition";

    // Convenience steady for drug_c/drug_e
    if (["drug_c", "drug_e"].includes(drug.id) && rng() < 0.22) topic = "convenience";

    // Sentiment selection conditioned by topic
    let sentiment = pick(rng, ["neutral", "neutral", "positive", "negative"]);
    if (topic === "safety" && rng() < 0.45) sentiment = "negative";
    if (topic === "convenience" && rng() < 0.55) sentiment = "positive";
    if (topic === "price" && rng() < 0.55) sentiment = "negative";

    notesArr.push({
      id: `n_${String(i + 1).padStart(5, "0")}`,
      doctorId: doctor.id,
      drugId: drug.id,
      date: date.toISOString().slice(0, 10),
      text: generateNoteText({ topic, sentiment, drug, doctor }),
      source: "crm",
      _synthetic: { month: mk, topic, sentiment },
    });
  }

  return { doctors: doctorsArr, drugs, notes: notesArr };
}

function computeDashboardFromSynthetic(bundle) {
  const topicCounts = new Map();
  const monthSent = new Map();

  for (const n of bundle.notes) {
    const t = n._synthetic?.topic ?? "other";
    topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1);
    const m = n._synthetic?.month ?? n.date.slice(0, 7);
    const sent = n._synthetic?.sentiment ?? "neutral";
    if (!monthSent.has(m)) monthSent.set(m, { month: m, positive: 0, neutral: 0, negative: 0 });
    monthSent.get(m)[sent] += 1;
  }

  const topics = Array.from(topicCounts.entries())
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count);

  const sentimentSeries = Array.from(monthSent.values()).sort((a, b) => (a.month < b.month ? -1 : 1));

  // Simple top objections/benefits based on topics
  const topObjections = [
    { clusterId: "c_safety_titration", title: "Побочные и титрация дозы", evidence: "В последние месяцы растут вопросы по НЯ и титрации." },
    { clusterId: "c_price_support", title: "Цена и доступность", evidence: "Частые возражения по цене у терапевтов/эндокринологов." },
  ];
  const topBenefits = [{ clusterId: "c_convenience_form", title: "Удобство приёма", evidence: "Позитив по удобству для некоторых препаратов." }];

  return { topics, sentimentSeries, topObjections, topBenefits };
}

function computeTrendsFromSynthetic(bundle) {
  const monthAgg = new Map();
  for (const n of bundle.notes) {
    const m = n._synthetic?.month ?? n.date.slice(0, 7);
    const t = n._synthetic?.topic ?? "other";
    const s = n._synthetic?.sentiment ?? "neutral";
    if (!monthAgg.has(m)) monthAgg.set(m, { month: m, efficacy: { neg: 0, total: 0 }, safety: { neg: 0, total: 0 }, price: { neg: 0, total: 0 } });
    const entry = monthAgg.get(m);
    if (["efficacy", "safety", "price"].includes(t)) {
      entry[t].total += 1;
      if (s === "negative") entry[t].neg += 1;
    }
  }

  const topicSentimentSeries = Array.from(monthAgg.values())
    .sort((a, b) => (a.month < b.month ? -1 : 1))
    .map((x) => ({
      month: x.month,
      efficacyNeg: x.efficacy.total ? clamp01(x.efficacy.neg / x.efficacy.total) : 0,
      safetyNeg: x.safety.total ? clamp01(x.safety.neg / x.safety.total) : 0,
      priceNeg: x.price.total ? clamp01(x.price.neg / x.price.total) : 0,
    }));

  const emergingClusters = [
    {
      clusterId: "c_safety_titration",
      title: "Побочные и титрация дозы",
      growthPct: 35,
      reason: "В предпоследние месяцы выросла доля safety-негатива (встроенный паттерн синтетики).",
    },
  ];

  return { topicSentimentSeries, emergingClusters };
}

async function main() {
  const bundle = buildSynthetic({ seed: 1337, months: 12, doctors: 280, notes: 5000 });

  // Strip helper field for runtime bundle (keep pure schema)
  const notesOut = bundle.notes.map(({ _synthetic, ...rest }) => rest);

  const notesBundle = { doctors: bundle.doctors, drugs: bundle.drugs, notes: notesOut };
  const dashboard = computeDashboardFromSynthetic(bundle);
  const trends = computeTrendsFromSynthetic(bundle);

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, "notes.json"), JSON.stringify(notesBundle, null, 2), "utf-8");
  await fs.writeFile(path.join(OUT_DIR, "dashboard.json"), JSON.stringify(dashboard, null, 2), "utf-8");
  await fs.writeFile(path.join(OUT_DIR, "trends.json"), JSON.stringify(trends, null, 2), "utf-8");

  console.log(`Wrote ${path.join("public", "data", "notes.json")} (${notesBundle.notes.length} notes)`);
  console.log(`Wrote ${path.join("public", "data", "dashboard.json")}`);
  console.log(`Wrote ${path.join("public", "data", "trends.json")}`);
  console.log("Clusters/insights/labels will be added in next step.");
}

await main();

