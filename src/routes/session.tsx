import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowLeft, ArrowUp, Check, Minus, Pause, Play, Plus, SkipForward, Timer } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { PoseTracker } from "@/components/fitadapt/PoseTracker";
import { Loading, Screen } from "@/components/fitadapt/Screen";
import { adapt, exerciseStats, summarize } from "@/lib/fitadapt/adaptation";
import { generatePlan, planTitle } from "@/lib/fitadapt/recommend";
import { setState, useAppState } from "@/lib/fitadapt/store";
import { findExercise, useCatalog } from "@/lib/fitadapt/useCatalog";
import type { AdaptationDecision, Feeling, SetResult } from "@/lib/fitadapt/types";
import type { RepEvent } from "@/lib/fitadapt/pose";

export const Route = createFileRoute("/session")({
  head: () => ({
    meta: [
      { title: "Workout session — FitAdapt" },
      { name: "description", content: "Live workout with camera rep counting, range of motion and rest timers." },
      { property: "og:title", content: "Workout session — FitAdapt" },
      { property: "og:description", content: "Live workout with camera rep counting, range of motion and rest timers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SessionPage,
});

type Phase = "work" | "rest" | "feedback" | "summary";

function SessionPage() {
  const state = useAppState();
  const navigate = useNavigate();
  const catalog = useCatalog();

  const [exIdx, setExIdx] = useState(0);
  const [setNo, setSetNo] = useState(1);
  const [phase, setPhase] = useState<Phase>("work");
  const [reps, setReps] = useState(0);
  const [roms, setRoms] = useState<number[]>([]);
  const [forms, setForms] = useState<number[]>([]);
  const [results, setResults] = useState<SetResult[]>([]);
  const [rest, setRest] = useState(0);
  const [holding, setHolding] = useState(false);
  const [decision, setDecision] = useState<AdaptationDecision | null>(null);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (state && !state.plan) navigate({ to: "/" });
  }, [state, navigate]);

  const items = state?.plan?.items.filter((i) => findExercise(catalog, i.exerciseId)) ?? [];
  const item = items[exIdx];
  const ex = item ? findExercise(catalog, item.exerciseId) : undefined;

  // Rest countdown
  useEffect(() => {
    if (phase !== "rest") return;
    if (rest <= 0) {
      setPhase("work");
      return;
    }
    const t = setTimeout(() => setRest((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, rest]);

  // Hold timer (1 "rep" = 1 second held)
  useEffect(() => {
    if (!holding || phase !== "work") return;
    const t = setInterval(() => setReps((r) => r + 1), 1000);
    return () => clearInterval(t);
  }, [holding, phase]);

  const onRep = useCallback((e: RepEvent) => {
    setReps((r) => r + 1);
    setRoms((x) => [...x, e.rom]);
    setForms((x) => [...x, e.form]);
  }, []);

  const finishSet = useCallback(() => {
    if (!item || !ex) return;
    const tracked = roms.length > 0;
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const result: SetResult = {
      exerciseId: item.exerciseId,
      set: setNo,
      reps: Math.min(reps, item.target * 2),
      target: item.target,
      rom: tracked ? mean(roms) : 0,
      form: tracked ? mean(forms) : 0,
      tracked,
    };
    setResults((r) => [...r, result]);
    setReps(0);
    setRoms([]);
    setForms([]);
    setHolding(false);

    if (setNo < item.sets) {
      setSetNo((s) => s + 1);
      setRest(item.restSec);
      setPhase("rest");
    } else if (exIdx < items.length - 1) {
      setExIdx((i) => i + 1);
      setSetNo(1);
      setRest(item.restSec);
      setPhase("rest");
    } else {
      setPhase("feedback");
    }
  }, [item, ex, roms, forms, reps, setNo, exIdx, items.length]);

  // Auto-finish when target reached (reps or hold seconds)
  useEffect(() => {
    if (phase === "work" && item && reps >= item.target) finishSet();
  }, [reps, item, phase, finishSet]);

  if (!state || !state.plan || !state.profile) return <Loading />;

  const submitFeeling = (feeling: Feeling) => {
    const d = adapt(results, feeling, state.level, state.logs);
    const log = {
      id: `${Date.now()}`,
      date: new Date().toISOString(),
      title: planTitle(state.profile!),
      durationSec: Math.round((Date.now() - startedAt.current) / 1000),
      levelBefore: state.level,
      levelAfter: d.newLevel,
      decision: d.action,
      feeling,
      sets: results,
    };
    const logs = [log, ...state.logs];
    const cantDo = Array.from(new Set([...state.cantDo, ...d.swapOut]));
    const plan = generatePlan({
      profile: state.profile!,
      level: d.newLevel,
      stats: exerciseStats(logs),
      cantDo,
      catalog: catalog.exercises,
      criteria: catalog.criteria,
    });
    setState({ logs, level: d.newLevel, cantDo, plan });
    setDecision(d);
    setPhase("summary");
  };

  const totals = summarize(results);

  if (phase === "feedback") {
    return (
      <Screen>
        <h1 className="fa-title">Session complete</h1>
        <p className="fa-sub">
          {totals.done}/{totals.target} reps across {results.length} sets.
        </p>
        <section className="fa-card" style={{ marginTop: "1.6rem" }}>
          <h2 className="fa-h2">How did that feel?</h2>
          <p className="fa-sub" style={{ marginBottom: "1rem" }}>
            Your answer tunes tomorrow's difficulty.
          </p>
          <button type="button" className="fa-feel" onClick={() => submitFeeling("easy")}>
            Too easy
          </button>
          <button type="button" className="fa-feel" onClick={() => submitFeeling("right")}>
            Just right
          </button>
          <button type="button" className="fa-feel" onClick={() => submitFeeling("hard")}>
            Too difficult
          </button>
        </section>
      </Screen>
    );
  }

  if (phase === "summary" && decision) {
    const Icon = decision.action === "increase" ? ArrowUp : decision.action === "decrease" ? ArrowDown : Minus;
    return (
      <Screen>
        <p className="fa-eyebrow">Adapted</p>
        <h1 className="fa-title">Next workout is ready</h1>
        <section className="fa-card" style={{ marginTop: "1.6rem" }}>
          <div className="fa-decision">
            <span className={`fa-decision-icon ${decision.action === "decrease" ? "is-down" : ""}`}>
              <Icon />
            </span>
            <div>
              <h2 className="fa-h2" style={{ margin: 0 }}>
                {decision.action === "increase" ? "Difficulty up" : decision.action === "decrease" ? "Difficulty down" : "Difficulty held"}
              </h2>
              <p className="fa-sub">
                Level {state.logs[0]?.levelBefore.toFixed(1)} → <span className="fa-accent">{decision.newLevel.toFixed(1)}</span> / 5
              </p>
            </div>
          </div>
          <ul className="fa-list">
            {decision.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
            {decision.swapOut.length > 0 && (
              <li>
                Swapped out:{" "}
                {decision.swapOut.map((id) => findExercise(catalog, id)?.name ?? id).join(", ")} — replaced with better matches
                alternatives.
              </li>
            )}
          </ul>
          <div className="fa-actions">
            <Link to="/progress" className="fa-btn fa-btn--outline">
              Progress
            </Link>
            <Link to="/plan" className="fa-btn fa-btn--primary">
              See next plan
            </Link>
          </div>
        </section>
      </Screen>
    );
  }

  if (!item || !ex) return <Loading />;
  const isHold = ex.kind === "hold";
  const lastRom = roms[roms.length - 1] ?? null;

  return (
    <Screen>
      <div className="fa-topbar">
        <Link to="/plan" className="fa-back">
          <ArrowLeft size={16} /> Quit
        </Link>
        <span className="fa-counter">
          Exercise {exIdx + 1}/{items.length}
        </span>
      </div>
      <h1 className="fa-title fa-title--md">{ex.name}</h1>
      <p className="fa-sub">{ex.instruction}</p>

      {ex.pose ? (
        <PoseTracker
          poseKey={ex.pose}
          resetKey={`${exIdx}-${setNo}`}
          paused={phase !== "work"}
          onRep={onRep}
        />
      ) : (
        <div className="fa-camera">
          <div className="fa-camera-empty">
            <Timer />
            <span>
              {isHold
                ? "Get into position, then start the hold timer."
                : "Camera tracking isn't available for this move yet — tap Count a rep after each one."}
            </span>
          </div>
        </div>
      )}

      {phase === "rest" ? (
        <section className="fa-card fa-rest">
          <Timer />
          <div className="fa-rest-label">REST</div>
          <div className="fa-rest-num">{rest}</div>
          <p className="fa-sub" style={{ marginBottom: "1.2rem" }}>
            Next: {ex.name} · set {setNo} of {item.sets} —{" "}
            {item.target} {isHold ? "seconds" : "reps"}
          </p>
          <button type="button" className="fa-btn fa-btn--primary" onClick={() => setRest(0)}>
            <SkipForward /> Skip rest
          </button>
        </section>
      ) : (
        <>
          <div className="fa-stats fa-stats--3">
            <div className="fa-stat">
              <div className="fa-stat-label">{isHold ? "Seconds" : "Reps"}</div>
              <div className="fa-stat-value">
                {reps}
                <small>/{item.target}</small>
              </div>
            </div>
            <div className="fa-stat">
              <div className="fa-stat-label">Set</div>
              <div className="fa-stat-value" style={{ color: "var(--foreground)" }}>
                {setNo}
                <small>/{item.sets}</small>
              </div>
            </div>
            <div className="fa-stat">
              <div className="fa-stat-label">ROM</div>
              <div className={`fa-stat-value ${lastRom !== null && lastRom < 0.7 ? "fa-warn" : ""}`}>
                {lastRom === null ? "—" : `${Math.round(lastRom * 100)}%`}
              </div>
            </div>
          </div>
          <div className="fa-bar">
            <span style={{ width: `${Math.min(100, (reps / item.target) * 100)}%` }} />
          </div>
          <div className="fa-row">
            {isHold ? (
              <button type="button" className="fa-btn fa-btn--primary" onClick={() => setHolding((h) => !h)}>
                {holding ? <Pause /> : <Play />} {holding ? "Pause hold" : "Start hold"}
              </button>
            ) : (
              <button type="button" className="fa-btn fa-btn--primary" onClick={() => setReps((r) => r + 1)}>
                <Plus /> Count a rep
              </button>
            )}
            <button type="button" className="fa-btn fa-btn--outline" onClick={finishSet}>
              <Check /> End set early
            </button>
          </div>
        </>
      )}
    </Screen>
  );
}
