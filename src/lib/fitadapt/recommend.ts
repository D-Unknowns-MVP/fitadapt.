import { CRITERIA, EXERCISES } from "./catalog";
import { topsis } from "./topsis";
import type { Criterion, Exercise, ExerciseStat, Focus, Goal, Muscle, Plan, PlanItem, Profile } from "./types";

export const FOCUS_MUSCLES: Record<Focus, Muscle[]> = {
  core: ["core"],
  upper: ["chest", "back", "shoulders", "arms"],
  lower: ["legs", "glutes"],
  full: ["cardio"],
};

export const GOAL_LABELS: Record<Goal, string> = {
  lose_weight: "Lose weight",
  gain_muscle: "Gain muscle",
  build_abs: "Build abs",
  target_part: "Target a body part",
  body_build: "Body build",
};

export const FOCUS_LABELS: Record<Focus, string> = {
  core: "Core",
  upper: "Upper body",
  lower: "Lower body",
  full: "Full body",
};

export interface Context {
  profile: Profile;
  level: number;
  stats: Record<string, ExerciseStat>;
  cantDo: string[];
  catalog?: Exercise[];
  criteria?: Criterion[];
}

export interface Ranked {
  exercise: Exercise;
  scores: number[];
  closeness: number;
}

export function isFeasible(ex: Exercise, profile: Profile): boolean {
  return ex.requires.every((eq) => profile.equipment.includes(eq));
}

/** Build the 1–5 decision-matrix row (C1…C6) for one exercise. */
export function criteriaScores(ex: Exercise, ctx: Context, muscleOverride?: Muscle): number[] {
  const { profile, level, stats, cantDo } = ctx;
  const c1 = ex.goals[profile.goal];

  let c2: number;
  if (muscleOverride) {
    c2 = ex.muscle === muscleOverride ? 5 : ex.secondary.includes(muscleOverride) ? 3 : 1;
  } else {
    const focus = FOCUS_MUSCLES[profile.focus];
    if (profile.focus === "full") c2 = ex.muscle === "cardio" || ex.secondary.length >= 2 ? 5 : 3;
    else c2 = focus.includes(ex.muscle) ? 5 : ex.secondary.some((m) => focus.includes(m)) ? 3 : 1;
  }

  const c3 = Math.max(1, 5 - 1.5 * Math.abs(ex.difficulty - level));
  const c4 = !isFeasible(ex, profile) ? 1 : ex.requires.length === 0 ? 5 : 4;
  const c5 = ex.environments.includes(profile.environment) ? 5 : 1;

  let c6 = 3;
  if (cantDo.includes(ex.id)) c6 = 1;
  else {
    const s = stats[ex.id];
    if (s) c6 = 1 + 4 * (0.5 * s.completion + 0.25 * s.rom + 0.25 * s.form);
  }
  return [c1, c2, c3, c4, c5, c6];
}

export function rank(candidates: Exercise[], ctx: Context, muscleOverride?: Muscle): Ranked[] {
  const criteria = ctx.criteria ?? CRITERIA;
  const matrix = candidates.map((ex) => criteriaScores(ex, ctx, muscleOverride));
  return topsis(matrix, criteria.map((c) => c.weight))
    .map((r) => ({ exercise: candidates[r.index]!, scores: matrix[r.index]!, closeness: r.closeness }))
    .sort((a, b) => b.closeness - a.closeness);
}

const BASE_REPS: Record<Goal, number> = {
  lose_weight: 15,
  gain_muscle: 10,
  build_abs: 15,
  target_part: 12,
  body_build: 10,
};

export function prescribe(ex: Exercise, goal: Goal, level: number): Omit<PlanItem, "exerciseId" | "score"> {
  const sets = level >= 3.5 ? 4 : 3;
  if (ex.kind === "hold") {
    return { sets, target: Math.round(20 + 10 * level), restSec: 45 };
  }
  let reps = BASE_REPS[goal] * (0.8 + 0.1 * level);
  const loaded = ex.requires.some((e) => ["dumbbells", "barbell", "kettlebell", "machines"].includes(e));
  if (loaded) reps *= 0.7;
  const restSec = goal === "gain_muscle" ? 75 : goal === "lose_weight" ? 30 : 60;
  return { sets, target: Math.max(4, Math.round(reps)), restSec };
}

export function exerciseCount(minutes: number) {
  return Math.min(10, Math.max(4, Math.round(minutes / 5)));
}

export function generatePlan(ctx: Context): Plan {
  const catalog = ctx.catalog ?? EXERCISES;
  const feasible = catalog.filter((ex) => isFeasible(ex, ctx.profile));
  const ranked = rank(feasible, ctx);
  const count = exerciseCount(ctx.profile.sessionMinutes);
  const cap = Math.ceil(count / 2);
  const perMuscle: Partial<Record<Muscle, number>> = {};
  const picked: Ranked[] = [];
  for (const r of ranked) {
    if (picked.length >= count) break;
    if (ctx.cantDo.includes(r.exercise.id) && ranked.length > count) continue;
    const used = perMuscle[r.exercise.muscle] ?? 0;
    if (used >= cap) continue;
    perMuscle[r.exercise.muscle] = used + 1;
    picked.push(r);
  }
  return {
    createdAt: new Date().toISOString(),
    level: ctx.level,
    items: picked.map((r) => ({
      exerciseId: r.exercise.id,
      score: Math.round(r.closeness * 100),
      ...prescribe(r.exercise, ctx.profile.goal, ctx.level),
    })),
  };
}

export function alternatives(
  exerciseId: string,
  ctx: Context,
  exclude: string[],
  easierOnJoints: boolean,
): Ranked[] {
  const catalog = ctx.catalog ?? EXERCISES;
  const original = catalog.find((e) => e.id === exerciseId);
  if (!original) return [];
  let pool = catalog.filter(
    (ex) => ex.id !== exerciseId && !exclude.includes(ex.id) && isFeasible(ex, ctx.profile),
  );
  if (easierOnJoints) pool = pool.filter((ex) => ex.lowImpact && ex.difficulty <= original.difficulty);
  let candidates = pool.filter((ex) => ex.muscle === original.muscle);
  if (candidates.length < 3) {
    candidates = candidates.concat(
      pool.filter((ex) => ex.muscle !== original.muscle && ex.secondary.includes(original.muscle)),
    );
  }
  return rank(candidates, ctx, original.muscle).slice(0, 4);
}

export function planTitle(profile: Profile) {
  if (profile.goal === "lose_weight") return "Fat burn";
  if (profile.goal === "gain_muscle") return "Muscle builder";
  if (profile.goal === "build_abs") return "Core focus";
  if (profile.goal === "body_build") return "Body build";
  return `${FOCUS_LABELS[profile.focus]} focus`;
}

export function estimateMinutes(plan: Plan, catalog: Exercise[] = EXERCISES) {
  let sec = 0;
  for (const item of plan.items) {
    const ex = catalog.find((e) => e.id === item.exerciseId);
    const work = ex?.kind === "hold" ? item.target : item.target * 3;
    sec += item.sets * (work + item.restSec);
  }
  return Math.round(sec / 60);
}
