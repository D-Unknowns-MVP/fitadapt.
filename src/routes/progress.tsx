import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Loading, Screen, Stat } from "@/components/fitadapt/Screen";
import { summarize } from "@/lib/fitadapt/adaptation";
import { useAppState } from "@/lib/fitadapt/store";
import { findExercise, useCatalog } from "@/lib/fitadapt/useCatalog";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Your progress — FitAdapt" },
      { name: "description", content: "Track reps, range of motion, duration and difficulty across your workouts." },
      { property: "og:title", content: "Your progress — FitAdapt" },
      { property: "og:description", content: "Track reps, range of motion, duration and difficulty over time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProgressPage,
});

const FEEL = { easy: "easy", right: "moderate", hard: "difficult" } as const;

function ProgressPage() {
  const state = useAppState();
  const catalog = useCatalog();
  if (!state) return <Loading />;

  const logs = state.logs;
  const chart = [...logs].reverse().map((l, i) => {
    const s = summarize(l.sets);
    return {
      name: `#${i + 1}`,
      reps: Math.round(s.completion * 100),
      rom: s.rom === null ? null : Math.round(s.rom * 100),
      level: l.levelAfter,
    };
  });
  const totalReps = logs.reduce((a, l) => a + summarize(l.sets).done, 0);
  const totalMin = Math.round(logs.reduce((a, l) => a + l.durationSec, 0) / 60);

  return (
    <Screen>
      <Link to="/plan" className="fa-back">
        <ArrowLeft size={16} /> Back
      </Link>
      <h1 className="fa-title fa-title--md" style={{ marginTop: "1rem" }}>
        Your progress
      </h1>
      <p className="fa-sub">Current difficulty level: {state.level.toFixed(1)} / 5</p>

      <div className="fa-stats fa-stats--3">
        <Stat label="Sessions" value={logs.length} />
        <Stat label="Reps" value={totalReps} />
        <Stat label="Minutes" value={totalMin} />
      </div>

      <section className="fa-card">
        <h2 className="fa-h2">Performance over time</h2>
        {chart.length === 0 ? (
          <p className="fa-empty">Finish your first session to see your trend.</p>
        ) : (
          <div className="fa-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
                  labelStyle={{ color: "var(--foreground)" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line name="% target reps" type="monotone" dataKey="reps" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line name="% ROM" type="monotone" dataKey="rom" stroke="var(--chart-2)" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {logs.map((log) => {
        const s = summarize(log.sets);
        return (
          <section key={log.id} className="fa-card">
            <div className="fa-log-head">
              <h3 className="fa-h2" style={{ margin: 0, fontSize: "1.35rem" }}>
                {log.title}
              </h3>
              <span className="fa-log-date">{new Date(log.date).toLocaleString()}</span>
            </div>
            <p className="fa-sub">
              {Math.round(s.completion * 100)}% of target reps
              {s.rom !== null && ` · ${Math.round(s.rom * 100)}% range of motion`}
              {s.form !== null && ` · ${Math.round(s.form * 100)}% form`} · felt {FEEL[log.feeling]} ·{" "}
              {Math.max(1, Math.round(log.durationSec / 60))} min
            </p>
            <p className="fa-sub">
              Level {log.levelBefore.toFixed(1)} → {log.levelAfter.toFixed(1)} ({log.decision})
            </p>
            <div className="fa-log-rows">
              {log.sets.map((set, i) => (
                <div key={i} className="fa-log-row">
                  <span>{findExercise(catalog, set.exerciseId)?.name ?? set.exerciseId}</span>
                  <span>
                    {set.reps}/{set.target} · {set.tracked ? `ROM ${Math.round(set.rom * 100)}%` : "manual"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </Screen>
  );
}
