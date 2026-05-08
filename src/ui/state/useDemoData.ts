import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";

const DoctorSchema = z.object({
  id: z.string(),
  name: z.string(),
  specialty: z.string(),
  region: z.string(),
  organization: z.string(),
});

const DrugSchema = z.object({
  id: z.string(),
  name: z.string(),
  drugClass: z.string(),
});

const NoteSchema = z.object({
  id: z.string(),
  doctorId: z.string(),
  drugId: z.string(),
  date: z.string(),
  text: z.string(),
  source: z.string(),
});

export type Doctor = z.infer<typeof DoctorSchema>;
export type Drug = z.infer<typeof DrugSchema>;
export type Note = z.infer<typeof NoteSchema>;

const ClusterSchema = z.object({
  id: z.string(),
  topic: z.string(),
  sentiment: z.string(),
  title: z.string(),
  summary: z.string(),
  count: z.number(),
  emerging: z.boolean(),
  examples: z.array(z.object({ noteId: z.string(), text: z.string() })),
});
export type Cluster = z.infer<typeof ClusterSchema>;

const DashboardSchema = z.object({
  topics: z.array(z.object({ topic: z.string(), count: z.number() })),
  sentimentSeries: z.array(
    z.object({
      month: z.string(),
      positive: z.number(),
      neutral: z.number(),
      negative: z.number(),
    }),
  ),
  topObjections: z.array(z.object({ clusterId: z.string(), title: z.string(), evidence: z.string() })).optional(),
  topBenefits: z.array(z.object({ clusterId: z.string(), title: z.string(), evidence: z.string() })).optional(),
});
export type Dashboard = z.infer<typeof DashboardSchema>;

const TrendsSchema = z.object({
  topicSentimentSeries: z.array(
    z.object({
      month: z.string(),
      efficacyNeg: z.number(),
      safetyNeg: z.number(),
      priceNeg: z.number(),
    }),
  ),
  emergingClusters: z.array(z.object({ clusterId: z.string(), title: z.string(), growthPct: z.number(), reason: z.string() })),
});
export type Trends = z.infer<typeof TrendsSchema>;

const InsightsSchema = z.object({
  insights: z.array(
    z.object({
      title: z.string(),
      observation: z.string(),
      evidence: z.array(z.object({ noteId: z.string(), quote: z.string() })),
      recommendedActions: z.array(z.string()),
      confidence: z.number(),
    }),
  ),
});
export type Insights = z.infer<typeof InsightsSchema>;

const NotesBundleSchema = z.object({
  doctors: z.array(DoctorSchema),
  drugs: z.array(DrugSchema),
  notes: z.array(NoteSchema),
});

type NotesBundle = z.infer<typeof NotesBundleSchema>;

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

const LOCAL_NOTES_KEY = "afa_local_notes_v1";

export function useDemoData() {
  const [bundle, setBundle] = useState<NotesBundle | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [trends, setTrends] = useState<Trends | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [localNotes, setLocalNotes] = useState<Note[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(LOCAL_NOTES_KEY);
    if (!raw) return;
    try {
      const json = JSON.parse(raw);
      const arr = z.array(NoteSchema).parse(json);
      setLocalNotes(arr);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(localNotes));
  }, [localNotes]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [notesRes, clustersRes, dashboardRes, trendsRes, insightsRes] = await Promise.all([
        fetch("/data/notes.json"),
        fetch("/data/clusters.json"),
        fetch("/data/dashboard.json"),
        fetch("/data/trends.json"),
        fetch("/data/insights.json"),
      ]);

      const notesJson = NotesBundleSchema.parse(await notesRes.json());
      const clustersJson = z.array(ClusterSchema).parse(await clustersRes.json());
      const dashboardJson = DashboardSchema.parse(await dashboardRes.json());
      const trendsJson = TrendsSchema.parse(await trendsRes.json());
      const insightsJson = InsightsSchema.parse(await insightsRes.json());
      if (cancelled) return;
      setBundle(notesJson);
      setClusters(clustersJson);
      setDashboard(dashboardJson);
      setTrends(trendsJson);
      setInsights(insightsJson);
    })().catch(() => {
      /* seed load failed */
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const addLocalNote = useCallback(
    (note: Omit<Note, "id">) => {
      const created: Note = { ...note, id: randomId("note") };
      setLocalNotes((prev) => [created, ...prev]);
      return created;
    },
    [setLocalNotes],
  );

  const doctors = useMemo(() => bundle?.doctors ?? [], [bundle]);
  const drugs = useMemo(() => bundle?.drugs ?? [], [bundle]);
  const notes = useMemo(() => [...(bundle?.notes ?? []), ...localNotes], [bundle, localNotes]);

  return { doctors, drugs, notes, clusters, dashboard, trends, insights, addLocalNote };
}

