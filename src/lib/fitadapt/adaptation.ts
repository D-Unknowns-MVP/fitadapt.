import type { AdaptationDecision, ExerciseStat, Feeling, SessionLog, SetResult } from "./types";

/** Predefined thresholds for the rule-based adaptation mechanism. */
export const RULES = {
  completionHigh: 0.9,
  formOk: 0.75,
  romOk: 0.7,
  completionLow: 0.6,
  formLow: 0.6,
  romLow: 0.5,
  step: 0.3,
  feelingStep: 0.2,
  streakBonus: 0.2,
  swapBelow: 0.5,
  minLevel: 1,
  maxLevel: 5,
};

export function summarize(sets: SetResult[]) {
  const target = sets.reduce((a, s) => a + s.target, 0);
  const done = sets.reduce((a, s) => a + Math.min(s.reps, s.target), 0);
  const tracked = sets.filter((s) => s.tracked && s.reps > 0);
  const avg = (k: "rom" | "form") =>
    tracked.length ? tracked.reduce((a, s) => a + s[k], 0) / tracked.length : null;
  return { completion: target ? done / target : 0, rom: avg("rom"), form: avg("form"), done, target };
}

const clampLevel = (n: number) =>
  Math.round(Math.min(RULES.maxLevel, Math.max(RULES.minLevel, n)) * 10) / 10;

export function adapt(
  sets: SetResult[],
  feeling: Feeling,
  level: number,
  previous: SessionLog[] = [],
): AdaptationDecision {
  const { completion, rom, form } = summarize(sets);
  const reasons: string[] = [];
  let action: AdaptationDecision["action"] = "maintain";
  let delta = 0;

  const formOk = form === null || form >= RULES.formOk;
  const romOk = rom === null || rom >= RULES.romOk;
  const formLow = form !== null && form < RULES.formLow;
  const romLow = rom !== null && rom < RULES.romLow;

  if (completion >= RULES.completionHigh && formOk && romOk) {
    action = "increase";
    delta = RULES.step;
    reasons.push("Hit your target reps with good form and range of motion.");
  } else if (completion < RULES.completionLow) {
    action = "decrease";
    delta = -RULES.step;
    reasons.push("Completed less than 60% of target reps.");
  } else if (formLow || romLow) {
    action = "maintain";
    reasons.push(formLow ? "Form accuracy below threshold — holding the level." : "Range of motion below threshold — holding the level.");
  } else {
    reasons.push("Performance within the expected range.");
  }

  if (feeling === "easy" && action !== "decrease") {
    delta += RULES.feelingStep;
    action = "increase";
    reasons.push("You said it felt too easy.");
  } else if (feeling === "hard") {
    if (action === "increase") {
      delta = 0;
      action = "maintain";
    } else {
      delta -= RULES.feelingStep;
      action = "decrease";
    }
    reasons.push("You said it felt too difficult.");
  }

  const lastTwo = previous.slice(0, 2);
  if (action === "increase" && lastTwo.length === 2 && lastTwo.every((l) => l.decision === "increase")) {
    delta += RULES.streakBonus;
    reasons.push("Consistent high performance across three sessions.");
  }

  // Exercises with very low completion get swapped for a TOPSIS alternative next time.
  const byEx = new Map<string, { done: number; target: number }>();
  for (const s of sets) {
    const e = byEx.get(s.exerciseId) ?? { done: 0, target: 0 };
    e.done += Math.min(s.reps, s.target);
    e.target += s.target;
    byEx.set(s.exerciseId, e);
  }
  const swapOut = [...byEx.entries()]
    .filter(([, v]) => v.target > 0 && v.done / v.target < RULES.swapBelow)
    .map(([id]) => id);

  return { action, delta: Math.round(delta * 10) / 10, newLevel: clampLevel(level + delta), reasons, swapOut };
}

/** Aggregate per-exercise performance over the most recent sessions (for TOPSIS C6). */
export function exerciseStats(logs: SessionLog[], lastN = 5): Record<string, ExerciseStat> {
  const acc: Record<string, { done: number; target: number; rom: number[]; form: number[]; sessions: Set<string> }> = {};
  for (const log of logs.slice(0, lastN)) {
    for (const s of log.sets) {
      const a = (acc[s.exerciseId] ??= { done: 0, target: 0, rom: [], form: [], sessions: new Set() });
      a.done += Math.min(s.reps, s.target);
      a.target += s.target;
      if (s.tracked && s.reps > 0) {
        a.rom.push(s.rom);
        a.form.push(s.form);
      }
      a.sessions.add(log.id);
    }
  }
  const mean = (xs: number[], d: number) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : d);
  return Object.fromEntries(
    Object.entries(acc).map(([id, a]) => [
      id,
      {
        completion: a.target ? a.done / a.target : 0,
        rom: mean(a.rom, 0.75),
        form: mean(a.form, 0.75),
        sessions: a.sessions.size,
      },
    ]),
  );
}
