import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Rocket } from "lucide-react";
import { useEffect, useState } from "react";

import { Loading, Screen } from "@/components/fitadapt/Screen";
import { EQUIPMENT_LABELS } from "@/lib/fitadapt/catalog";
import { useCatalog } from "@/lib/fitadapt/useCatalog";
import { FOCUS_LABELS, GOAL_LABELS, generatePlan } from "@/lib/fitadapt/recommend";
import { LEVEL_FOR_EXPERIENCE, setState, useAppState } from "@/lib/fitadapt/store";
import type { Environment, Equipment, Focus, Goal, Profile } from "@/lib/fitadapt/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FitAdapt — Build the workout that fits your life" },
      {
        name: "description",
        content: "Four quick questions: your goal, your space, your gear and you. Get a workout plan ranked with TOPSIS.",
      },
      { property: "og:title", content: "FitAdapt — Build the workout that fits your life" },
      {
        property: "og:description",
        content: "Four quick questions and you get a plan matched to your goal, your space and the gear you own.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

const STEPS = ["Goal", "Where", "Gear", "You"];

const GOALS: { id: Goal; sub: string; focus: Focus }[] = [
  { id: "lose_weight", sub: "Burn calories, build stamina", focus: "full" },
  { id: "gain_muscle", sub: "Get stronger and add size", focus: "upper" },
  { id: "build_abs", sub: "Develop your abdominal muscles", focus: "core" },
  { id: "target_part", sub: "Focus on one area of your body", focus: "core" },
  { id: "body_build", sub: "Shape a balanced, athletic build", focus: "full" },
];

const PLACES: { id: Environment; title: string; sub: string }[] = [
  { id: "home", title: "At home", sub: "Small space, minimal gear" },
  { id: "gym", title: "Gym", sub: "Full racks and machines" },
  { id: "outdoors", title: "Outdoors", sub: "Park, yard or track" },
];

const GEAR = Object.keys(EQUIPMENT_LABELS) as Equipment[];
const EXPERIENCE = ["Beginner", "Intermediate", "Advanced"];

function Onboarding() {
  const state = useAppState();
  const navigate = useNavigate();
  const catalog = useCatalog();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal>("target_part");
  const [focus, setFocus] = useState<Focus>("core");
  const [environment, setEnvironment] = useState<Environment>("home");
  const [equipment, setEquipment] = useState<Equipment[]>(["bodyweight"]);
  const [experience, setExperience] = useState<1 | 2 | 3>(1);
  const [minutes, setMinutes] = useState(40);
  const [days, setDays] = useState(3);
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  useEffect(() => {
    if (state?.profile && state.plan) navigate({ to: "/plan" });
  }, [state, navigate]);

  if (!state || (state.profile && state.plan)) return <Loading />;

  const toggleGear = (eq: Equipment) => {
    if (eq === "bodyweight") return setEquipment(["bodyweight"]);
    setEquipment((cur) => {
      const rest = cur.filter((e) => e !== "bodyweight");
      const next = rest.includes(eq) ? rest.filter((e) => e !== eq) : [...rest, eq];
      return next.length ? next : ["bodyweight"];
    });
  };

  const build = () => {
    const profile: Profile = {
      goal,
      focus,
      environment,
      equipment,
      experience,
      sessionMinutes: minutes,
      daysPerWeek: days,
      age: age ? Number(age) : undefined,
      heightCm: height ? Number(height) : undefined,
      weightKg: weight ? Number(weight) : undefined,
    };
    const level = LEVEL_FOR_EXPERIENCE[experience];
    const plan = generatePlan({ profile, level, stats: {}, cantDo: [], catalog: catalog.exercises, criteria: catalog.criteria });
    setState({ profile, level, plan, logs: state.logs, cantDo: [] });
    navigate({ to: "/plan" });
  };

  return (
    <Screen>
      <p className="fa-eyebrow">FitAdapt</p>
      <h1 className="fa-title">Build the workout that fits your life</h1>
      <p className="fa-lead">
        Four quick questions and you get a plan matched to your goal, your space and the gear you actually own.
      </p>

      <div className="fa-steps">
        {STEPS.map((s, i) => (
          <span key={s} className={`fa-step ${i <= step ? "is-done" : ""}`}>
            {s}
          </span>
        ))}
      </div>

      <section className="fa-card">
        {step === 0 && (
          <>
            <h2 className="fa-h2">What's your goal?</h2>
            <div className="fa-stack">
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`fa-option ${goal === g.id ? "is-selected" : ""}`}
                  onClick={() => {
                    setGoal(g.id);
                    setFocus(g.focus);
                  }}
                >
                  <span className="fa-option-title">{GOAL_LABELS[g.id]}</span>
                  <span className="fa-option-sub">{g.sub}</span>
                </button>
              ))}
            </div>
            <span className="fa-label">Target body part</span>
            <div className="fa-chips">
              {(Object.keys(FOCUS_LABELS) as Focus[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`fa-chip ${focus === f ? "is-on" : ""}`}
                  onClick={() => setFocus(f)}
                >
                  {FOCUS_LABELS[f]}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="fa-h2">Where will you train?</h2>
            <div className="fa-stack">
              {PLACES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`fa-option ${environment === p.id ? "is-selected" : ""}`}
                  onClick={() => setEnvironment(p.id)}
                >
                  <span className="fa-option-title">{p.title}</span>
                  <span className="fa-option-sub">{p.sub}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="fa-h2">What equipment do you have?</h2>
            <p className="fa-sub" style={{ marginBottom: "1rem" }}>
              Pick everything within reach. We only program what you can actually load.
            </p>
            <div className="fa-chips">
              {GEAR.map((eq) => (
                <button
                  key={eq}
                  type="button"
                  className={`fa-chip ${equipment.includes(eq) ? "is-on" : ""}`}
                  onClick={() => toggleGear(eq)}
                >
                  {EQUIPMENT_LABELS[eq]}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="fa-h2">A little about you</h2>
            <RangeRow
              label="Experience level"
              value={EXPERIENCE[experience - 1] ?? ""}
              min={1}
              max={3}
              current={experience}
              onChange={(v) => setExperience(v as 1 | 2 | 3)}
            />
            <RangeRow
              label="Session length"
              value={`${minutes} minutes`}
              min={20}
              max={60}
              step={5}
              current={minutes}
              onChange={setMinutes}
            />
            <RangeRow label="Days per week" value={`${days} days`} min={1} max={6} current={days} onChange={setDays} />
            <span className="fa-label">Optional body stats (used to personalise intensity)</span>
            <div className="fa-inputs">
              <NumField label="Age" value={age} onChange={setAge} />
              <NumField label="Height (cm)" value={height} onChange={setHeight} />
              <NumField label="Weight (kg)" value={weight} onChange={setWeight} />
            </div>
          </>
        )}

        <div className="fa-actions">
          <button
            type="button"
            className="fa-btn fa-btn--ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            Back
          </button>
          {step < 3 ? (
            <button type="button" className="fa-btn fa-btn--primary" onClick={() => setStep((s) => s + 1)}>
              Continue <ArrowRight />
            </button>
          ) : (
            <button type="button" className="fa-btn fa-btn--primary" onClick={build}>
              Build my workout <Rocket />
            </button>
          )}
        </div>
      </section>
    </Screen>
  );
}

function RangeRow(props: {
  label: string;
  value: string;
  min: number;
  max: number;
  step?: number;
  current: number;
  onChange: (v: number) => void;
}) {
  const fill = ((props.current - props.min) / (props.max - props.min)) * 100;
  return (
    <div className="fa-slider">
      <div className="fa-slider-head">
        <span>{props.label}</span>
        <span className="fa-slider-value">{props.value}</span>
      </div>
      <input
        type="range"
        className="fa-range"
        aria-label={props.label}
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.current}
        style={{ ["--fill" as string]: `${fill}%` }}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="fa-field">
      <span>{label}</span>
      <input
        className="fa-input"
        inputMode="numeric"
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
