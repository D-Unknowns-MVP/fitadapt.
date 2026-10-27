export type Goal = "lose_weight" | "gain_muscle" | "build_abs" | "target_part" | "body_build";
export type Focus = "core" | "upper" | "lower" | "full";
export type Environment = "home" | "gym" | "outdoors";
export type Equipment =
  | "bodyweight"
  | "dumbbells"
  | "barbell"
  | "kettlebell"
  | "bench"
  | "pullup_bar"
  | "band"
  | "machines"
  | "mat"
  | "jump_rope";
export type Muscle = "core" | "chest" | "back" | "shoulders" | "arms" | "legs" | "glutes" | "cardio";
export type PoseKey = "jumping_jacks" | "pull_ups" | "push_ups" | "russian_twists" | "squats" | "glute_bridge" | "high_knees" | "mountain_climber";

export interface Exercise {
  id: string;
  name: string;
  muscle: Muscle;
  secondary: Muscle[];
  /** 1 (easiest) – 5 (hardest) */
  difficulty: number;
  /** Equipment that must be owned (empty = none needed). */
  requires: Equipment[];
  /** Equipment the move works with (for display). */
  worksWith: Equipment[];
  environments: Environment[];
  /** Goal affinity 1–5 per goal, set by the exercise database (fitness-expert input). */
  goals: Record<Goal, number>;
  kind: "reps" | "hold";
  lowImpact: boolean;
  instruction: string;
  /** Exercise Detection Dataset label used for camera tracking, when supported. */
  pose?: PoseKey;
}

export interface Criterion {
  code: "C1" | "C2" | "C3" | "C4" | "C5" | "C6";
  name: string;
  description: string;
  weight: number;
}

export interface Profile {
  goal: Goal;
  focus: Focus;
  environment: Environment;
  equipment: Equipment[];
  /** 1 beginner, 2 intermediate, 3 advanced */
  experience: 1 | 2 | 3;
  sessionMinutes: number;
  daysPerWeek: number;
  age?: number | undefined;
  heightCm?: number | undefined;
  weightKg?: number | undefined;
}

export interface PlanItem {
  exerciseId: string;
  sets: number;
  /** reps for rep exercises, seconds for holds */
  target: number;
  restSec: number;
  score: number;
}

export interface Plan {
  createdAt: string;
  level: number;
  items: PlanItem[];
}

export interface SetResult {
  exerciseId: string;
  set: number;
  reps: number;
  target: number;
  /** 0–1 */
  rom: number;
  /** 0–1 */
  form: number;
  tracked: boolean;
}

export type Feeling = "easy" | "right" | "hard";

export interface SessionLog {
  id: string;
  date: string;
  title: string;
  durationSec: number;
  levelBefore: number;
  levelAfter: number;
  decision: AdaptationDecision["action"];
  feeling: Feeling;
  sets: SetResult[];
}

export interface ExerciseStat {
  completion: number;
  rom: number;
  form: number;
  sessions: number;
}

export interface AdaptationDecision {
  action: "increase" | "maintain" | "decrease";
  delta: number;
  newLevel: number;
  reasons: string[];
  swapOut: string[];
}
