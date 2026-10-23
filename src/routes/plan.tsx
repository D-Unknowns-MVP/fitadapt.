import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Activity, Camera, Gauge, RefreshCw, Repeat, Target, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Loading, Screen, Stat } from "@/components/fitadapt/Screen";
import { exerciseStats } from "@/lib/fitadapt/adaptation";
import { EQUIPMENT_LABELS } from "@/lib/fitadapt/catalog";
import {
  FOCUS_LABELS,
  GOAL_LABELS,
  alternatives,
  criteriaScores,
  estimateMinutes,
  generatePlan,
  planTitle,
  prescribe,
  type Context,
} from "@/lib/fitadapt/recommend";
import { resetState, setState, useAppState } from "@/lib/fitadapt/store";
import { findExercise, useCatalog } from "@/lib/fitadapt/useCatalog";
import type { Exercise, PlanItem } from "@/lib/fitadapt/types";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Your workout plan — FitAdapt" },
      { name: "description", content: "Your personalized, TOPSIS-ranked workout with sets, reps and alternatives." },
      { property: "og:title", content: "Your workout plan — FitAdapt" },
      { property: "og:description", content: "A personalized, TOPSIS-ranked workout with sets, reps and alternatives." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlanPage,
});

function PlanPage() {
  const state = useAppState();
  const navigate = useNavigate();
  const catalog = useCatalog();
  const [openAlt, setOpenAlt] = useState<string | null>(null);
  const [easier, setEasier] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);

  useEffect(() => {
    if (state && (!state.profile || !state.plan)) navigate({ to: "/" });
  }, [state, navigate]);

  const ctx: Context | null = useMemo(() => {
    if (!state?.profile) return null;
    return {
      profile: state.profile,
      level: state.level,
      stats: exerciseStats(state.logs),
      cantDo: state.cantDo,
      catalog: catalog.exercises,
      criteria: catalog.criteria,
    };
  }, [state, catalog]);

  if (!state || !state.profile || !state.plan || !ctx) return <Loading />;
  const { profile, plan } = state;
  const items = plan.items.filter((i) => findExercise(catalog, i.exerciseId));

  const regenerate = () => {
    setState({ plan: generatePlan(ctx) });
    setOpenAlt(null);
    toast.success("New session generated");
  };

  const swap = (from: string, to: Exercise) => {
    setState((s) => ({
      cantDo: s.cantDo.includes(from) ? s.cantDo : [...s.cantDo, from],
      plan: s.plan && {
        ...s.plan,
        items: s.plan.items.map((it) =>
          it.exerciseId === from
            ? { exerciseId: to.id, score: it.score, ...prescribe(to, profile.goal, s.level) }
            : it,
        ),
      },
    }));
    setOpenAlt(null);
    toast.success(`Swapped in ${to.name}`);
  };

  return (
    <Screen>
      <p className="fa-eyebrow">FitAdapt</p>
      <h1 className="fa-title fa-title--md">{planTitle(profile)}</h1>
      <p className="fa-sub">
        {GOAL_LABELS[profile.goal]} · {FOCUS_LABELS[profile.focus]} · {profile.environment} · level{" "}
        {state.level.toFixed(1)}
      </p>
      <div className="fa-row" style={{ marginTop: "1.1rem" }}>
        <Link to="/progress" className="fa-btn fa-btn--outline fa-btn--sm">
          <TrendingUp /> Progress
        </Link>
        <button type="button" className="fa-btn fa-btn--outline fa-btn--sm" onClick={regenerate}>
          <RefreshCw /> New session
        </button>
      </div>

      <div className="fa-stats">
        <Stat icon={<Gauge />} label="Difficulty level" value={state.level.toFixed(1)} />
        <Stat icon={<Activity />} label="Est. duration" value={`${estimateMinutes(plan, catalog.exercises)} min`} />
        <Stat icon={<TrendingUp />} label="Sessions logged" value={state.logs.length} />
      </div>

      {items.map((item) => {
        const ex = findExercise(catalog, item.exerciseId)!;
        const isOpen = openAlt === item.exerciseId;
        const alts = isOpen
          ? alternatives(item.exerciseId, ctx, items.map((i) => i.exerciseId), easier)
          : [];
        return (
          <article key={item.exerciseId} className="fa-ex">
            <div className="fa-ex-head">
              <h3 className="fa-ex-name">{ex.name}</h3>
              {ex.pose && (
                <span className="fa-tag" title="Camera tracking supported">
                  <Camera /> Tracked
                </span>
              )}
            </div>
            <div className="fa-ex-meta">{formatItem(item, ex)}</div>
            <p className="fa-ex-cue">{ex.instruction}</p>
            <button
              type="button"
              className="fa-btn fa-btn--outline fa-btn--sm"
              onClick={() => setOpenAlt(isOpen ? null : item.exerciseId)}
            >
              <Repeat /> {isOpen ? "Keep this one" : "Can't do this"}
            </button>

            {isOpen && (
              <div className="fa-alts">
                <div className="fa-alts-head">
                  <Target /> Ranked alternatives (TOPSIS)
                </div>
                <label className="fa-check">
                  <input type="checkbox" checked={easier} onChange={(e) => setEasier(e.target.checked)} />
                  Easier on the joints
                </label>
                {alts.length === 0 && <p className="fa-note">No alternatives match your gear and filters.</p>}
                {alts.map((a, i) => (
                  <button key={a.exercise.id} type="button" className="fa-alt" onClick={() => swap(ex.id, a.exercise)}>
                    <span>
                      <span className="fa-alt-name">
                        {i + 1}. {a.exercise.name}
                      </span>
                      <span className="fa-alt-meta">
                        {cap(a.exercise.muscle)} · difficulty {a.exercise.difficulty}/5 ·{" "}
                        {a.exercise.worksWith.map((w) => EQUIPMENT_LABELS[w]).join(", ")}
                      </span>
                    </span>
                    <span className="fa-score">{Math.round(a.closeness * 100)}</span>
                  </button>
                ))}
              </div>
            )}
          </article>
        );
      })}

      <section className="fa-card" style={{ marginTop: "1rem" }}>
        <div className="fa-log-head">
          <h2 className="fa-h2" style={{ margin: 0 }}>
            How this plan was ranked
          </h2>
          <button type="button" className="fa-btn fa-btn--ghost fa-btn--sm" onClick={() => setShowMatrix((v) => !v)}>
            {showMatrix ? "Hide" : "Show"}
          </button>
        </div>
        {showMatrix && (
          <>
            <p className="fa-note">
              Each exercise is scored 1–5 on six criteria, vector-normalised, weighted, and ranked by closeness to the
              ideal solution.
            </p>
            <table className="fa-matrix">
              <thead>
                <tr>
                  <th>Exercise</th>
                  {catalog.criteria.map((c) => (
                    <th key={c.code} title={c.name}>
                      {c.code}
                    </th>
                  ))}
                  <th>CI</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const ex = findExercise(catalog, item.exerciseId)!;
                  return (
                    <tr key={item.exerciseId}>
                      <td>{ex.name}</td>
                      {criteriaScores(ex, ctx).map((s, i) => (
                        <td key={i}>{s.toFixed(1)}</td>
                      ))}
                      <td className="fa-accent">{item.score}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <dl className="fa-kv">
              {catalog.criteria.map((c) => (
                <div key={c.code} style={{ display: "contents" }}>
                  <dt>
                    {c.code} · {c.name}
                  </dt>
                  <dd>{Math.round(c.weight * 100)}%</dd>
                </div>
              ))}
            </dl>
            <p className="fa-note">
              Catalog source: {catalog.source === "mysql" ? "MySQL database" : "built-in exercise database"}
            </p>
          </>
        )}
      </section>

      <div className="fa-sticky">
        <Link to="/session" className="fa-btn fa-btn--primary">
          <Camera /> Start session
        </Link>
        <button
          type="button"
          className="fa-btn fa-btn--ghost"
          onClick={() => {
            if (confirm("Start over? Your profile, plan and history on this device will be cleared.")) {
              resetState();
              navigate({ to: "/" });
            }
          }}
        >
          Start over
        </button>
      </div>

      <p className="fa-footer">
        Rep counting and form checks are calibrated with the <Link to="/dataset">Exercise Detection Dataset</Link>.
      </p>
    </Screen>
  );
}

export function formatItem(item: PlanItem, ex: Exercise) {
  const work = ex.kind === "hold" ? `${item.target}s hold` : `${item.target} reps`;
  return `${item.sets} sets × ${work} · ${item.restSec}s rest`;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
