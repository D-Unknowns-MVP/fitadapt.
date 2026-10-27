import type { Criterion, Equipment, Exercise, Goal } from "./types";

/**
 * Seed catalog: TOPSIS criteria and the predefined exercise database.
 * This mirrors database/fitadapt_mysql.sql — the MySQL tables are generated from this data
 * (scripts/build_mysql_seed.ts) so the app and the database stay identical.
 */

export const CRITERIA: Criterion[] = [
  { code: "C1", name: "Fitness Goal Match", description: "How well the exercise matches the user's goal.", weight: 0.25 },
  { code: "C2", name: "Target Muscle Match", description: "How well it targets the selected muscle group.", weight: 0.2 },
  { code: "C3", name: "Difficulty Suitability", description: "Appropriate for the user's current level.", weight: 0.2 },
  { code: "C4", name: "Equipment Availability", description: "Required equipment is available.", weight: 0.1 },
  { code: "C5", name: "Environment Compatibility", description: "Suitable for the workout environment/space.", weight: 0.1 },
  { code: "C6", name: "Performance Suitability", description: "Based on past performance.", weight: 0.15 },
];

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  bodyweight: "Bodyweight only",
  dumbbells: "Dumbbells",
  barbell: "Barbell",
  kettlebell: "Kettlebell",
  bench: "Bench",
  pullup_bar: "Pull-up bar",
  band: "Resistance band",
  machines: "Machines",
  mat: "Mat",
  jump_rope: "Jump rope",
};

const g = (lose: number, gain: number, abs: number, part: number, build: number): Record<Goal, number> => ({
  lose_weight: lose,
  gain_muscle: gain,
  build_abs: abs,
  target_part: part,
  body_build: build,
});

const ALL = ["home", "gym", "outdoors"] as Exercise["environments"];
const INDOOR = ["home", "gym"] as Exercise["environments"];

export const EXERCISES: Exercise[] = [
  // ── Core ───────────────────────────────────────────
  { id: "sit_up", name: "Sit-up", muscle: "core", secondary: [], difficulty: 2, requires: [], worksWith: ["bodyweight", "mat"], environments: ALL, goals: g(3, 2, 5, 4, 3), kind: "reps", lowImpact: false, instruction: "Roll up one vertebra at a time, exhale at the top." },
  { id: "lying_leg_raise", name: "Lying leg raise", muscle: "core", secondary: [], difficulty: 2, requires: [], worksWith: ["bodyweight", "mat"], environments: ALL, goals: g(2, 2, 5, 4, 3), kind: "reps", lowImpact: true, instruction: "Low back glued down, lower the legs slowly." },
  { id: "bicycle_crunch", name: "Bicycle crunch", muscle: "core", secondary: [], difficulty: 2, requires: [], worksWith: ["bodyweight", "mat"], environments: ALL, goals: g(3, 2, 5, 4, 3), kind: "reps", lowImpact: true, instruction: "Elbow to opposite knee, slow and controlled." },
  { id: "russian_twist", name: "Russian twist", muscle: "core", secondary: [], difficulty: 2, requires: [], worksWith: ["bodyweight", "dumbbells", "kettlebell", "mat"], environments: ALL, goals: g(3, 2, 5, 4, 3), kind: "reps", lowImpact: true, instruction: "Lean back, chest proud, rotate from the ribs.", pose: "russian_twists" },
  { id: "crunch", name: "Crunch", muscle: "core", secondary: [], difficulty: 1, requires: [], worksWith: ["bodyweight", "mat"], environments: ALL, goals: g(2, 1, 4, 4, 2), kind: "reps", lowImpact: true, instruction: "Lift the shoulders, keep the chin off the chest." },
  { id: "plank", name: "Plank", muscle: "core", secondary: ["shoulders"], difficulty: 1, requires: [], worksWith: ["bodyweight", "mat"], environments: ALL, goals: g(2, 2, 4, 4, 4), kind: "hold", lowImpact: true, instruction: "Straight line head to heels, squeeze glutes." },
  { id: "mountain_climber", name: "Mountain climber", muscle: "core", secondary: ["cardio", "shoulders"], difficulty: 3, requires: [], worksWith: ["bodyweight"], environments: ALL, goals: g(5, 2, 4, 3, 3), kind: "reps", lowImpact: false, instruction: "Hips level, drive the knees fast toward the chest.", pose: "mountain_climber" },
  { id: "hanging_knee_raise", name: "Hanging knee raise", muscle: "core", secondary: ["arms"], difficulty: 4, requires: ["pullup_bar"], worksWith: ["pullup_bar"], environments: ["home", "gym", "outdoors"], goals: g(2, 3, 5, 4, 4), kind: "reps", lowImpact: true, instruction: "No swinging — curl the pelvis up to the ribs." },
  { id: "cable_crunch", name: "Cable crunch", muscle: "core", secondary: [], difficulty: 3, requires: ["machines"], worksWith: ["machines"], environments: ["gym"], goals: g(2, 3, 5, 4, 3), kind: "reps", lowImpact: true, instruction: "Hips still, crunch the ribs toward the pelvis." },

  // ── Chest / shoulders / arms ───────────────────────
  { id: "knee_push_up", name: "Knee push-up", muscle: "chest", secondary: ["arms", "shoulders"], difficulty: 1, requires: [], worksWith: ["bodyweight", "mat"], environments: ALL, goals: g(2, 3, 1, 4, 3), kind: "reps", lowImpact: true, instruction: "Knees down, body straight from knees to head.", pose: "push_ups" },
  { id: "push_up", name: "Push-up", muscle: "chest", secondary: ["arms", "shoulders", "core"], difficulty: 3, requires: [], worksWith: ["bodyweight"], environments: ALL, goals: g(3, 4, 2, 4, 4), kind: "reps", lowImpact: false, instruction: "Elbows at 45°, chest to fist height, lock out.", pose: "push_ups" },
  { id: "decline_push_up", name: "Decline push-up", muscle: "chest", secondary: ["shoulders", "arms"], difficulty: 4, requires: ["bench"], worksWith: ["bench"], environments: INDOOR, goals: g(3, 5, 2, 4, 4), kind: "reps", lowImpact: false, instruction: "Feet up on the bench, keep the hips from sagging.", pose: "push_ups" },
  { id: "dumbbell_bench_press", name: "Dumbbell bench press", muscle: "chest", secondary: ["arms", "shoulders"], difficulty: 3, requires: ["dumbbells", "bench"], worksWith: ["dumbbells", "bench"], environments: INDOOR, goals: g(2, 5, 1, 4, 5), kind: "reps", lowImpact: true, instruction: "Shoulder blades pinned, press up and slightly in." },
  { id: "barbell_bench_press", name: "Barbell bench press", muscle: "chest", secondary: ["arms", "shoulders"], difficulty: 4, requires: ["barbell", "bench"], worksWith: ["barbell", "bench"], environments: ["gym"], goals: g(2, 5, 1, 4, 5), kind: "reps", lowImpact: true, instruction: "Bar to lower chest, feet planted, drive up." },
  { id: "pike_push_up", name: "Pike push-up", muscle: "shoulders", secondary: ["arms"], difficulty: 3, requires: [], worksWith: ["bodyweight"], environments: ALL, goals: g(2, 4, 1, 4, 4), kind: "reps", lowImpact: false, instruction: "Hips high, lower the head between the hands." },
  { id: "dumbbell_shoulder_press", name: "Dumbbell shoulder press", muscle: "shoulders", secondary: ["arms"], difficulty: 3, requires: ["dumbbells"], worksWith: ["dumbbells", "bench"], environments: INDOOR, goals: g(2, 5, 1, 4, 5), kind: "reps", lowImpact: true, instruction: "Ribs down, press overhead until biceps by ears." },
  { id: "band_pull_apart", name: "Band pull-apart", muscle: "shoulders", secondary: ["back"], difficulty: 1, requires: ["band"], worksWith: ["band"], environments: ALL, goals: g(1, 3, 1, 4, 3), kind: "reps", lowImpact: true, instruction: "Arms straight, squeeze the shoulder blades together." },
  { id: "bench_dip", name: "Bench dip", muscle: "arms", secondary: ["chest", "shoulders"], difficulty: 2, requires: ["bench"], worksWith: ["bench"], environments: INDOOR, goals: g(2, 4, 1, 4, 4), kind: "reps", lowImpact: false, instruction: "Elbows straight back, lower to 90°, press up." },
  { id: "dumbbell_curl", name: "Dumbbell curl", muscle: "arms", secondary: [], difficulty: 2, requires: ["dumbbells"], worksWith: ["dumbbells"], environments: INDOOR, goals: g(1, 4, 1, 4, 4), kind: "reps", lowImpact: true, instruction: "Elbows pinned, curl up, lower for three seconds." },

  // ── Back ───────────────────────────────────────────
  { id: "pull_up", name: "Pull-up", muscle: "back", secondary: ["arms", "core"], difficulty: 5, requires: ["pullup_bar"], worksWith: ["pullup_bar"], environments: ALL, goals: g(3, 5, 2, 4, 5), kind: "reps", lowImpact: true, instruction: "Dead hang, pull the chest to the bar, control down.", pose: "pull_ups" },
  { id: "band_assisted_pull_up", name: "Band-assisted pull-up", muscle: "back", secondary: ["arms"], difficulty: 3, requires: ["pullup_bar", "band"], worksWith: ["pullup_bar", "band"], environments: ALL, goals: g(3, 4, 2, 4, 4), kind: "reps", lowImpact: true, instruction: "Knee in the band, full range, chin over the bar.", pose: "pull_ups" },
  { id: "inverted_row", name: "Inverted row", muscle: "back", secondary: ["arms"], difficulty: 3, requires: ["pullup_bar"], worksWith: ["pullup_bar", "machines"], environments: ALL, goals: g(2, 4, 2, 4, 4), kind: "reps", lowImpact: true, instruction: "Body rigid like a plank, chest to the bar." },
  { id: "dumbbell_row", name: "Dumbbell row", muscle: "back", secondary: ["arms"], difficulty: 2, requires: ["dumbbells"], worksWith: ["dumbbells", "bench"], environments: INDOOR, goals: g(2, 5, 1, 4, 5), kind: "reps", lowImpact: true, instruction: "Flat back, drive the elbow past the ribs." },
  { id: "lat_pulldown", name: "Lat pulldown", muscle: "back", secondary: ["arms"], difficulty: 2, requires: ["machines"], worksWith: ["machines"], environments: ["gym"], goals: g(2, 5, 1, 4, 5), kind: "reps", lowImpact: true, instruction: "Lean back slightly, pull the bar to the collarbone." },
  { id: "superman", name: "Superman hold", muscle: "back", secondary: ["glutes"], difficulty: 1, requires: [], worksWith: ["bodyweight", "mat"], environments: ALL, goals: g(2, 2, 2, 4, 3), kind: "hold", lowImpact: true, instruction: "Lift arms and legs, long neck, squeeze the back." },

  // ── Legs / glutes ──────────────────────────────────
  { id: "bodyweight_squat", name: "Bodyweight squat", muscle: "legs", secondary: ["glutes"], difficulty: 1, requires: [], worksWith: ["bodyweight"], environments: ALL, goals: g(4, 3, 1, 4, 4), kind: "reps", lowImpact: false, instruction: "Sit back and down, knees track over toes.", pose: "squats" },
  { id: "goblet_squat", name: "Goblet squat", muscle: "legs", secondary: ["glutes", "core"], difficulty: 2, requires: [], worksWith: ["dumbbells", "kettlebell"], environments: INDOOR, goals: g(3, 5, 2, 4, 5), kind: "reps", lowImpact: false, instruction: "Weight at the chest, elbows inside the knees.", pose: "squats" },
  { id: "barbell_back_squat", name: "Barbell back squat", muscle: "legs", secondary: ["glutes", "core"], difficulty: 4, requires: ["barbell"], worksWith: ["barbell"], environments: ["gym"], goals: g(3, 5, 2, 4, 5), kind: "reps", lowImpact: false, instruction: "Brace, break at hips and knees, hit depth.", pose: "squats" },
  { id: "wall_sit", name: "Wall sit", muscle: "legs", secondary: ["glutes"], difficulty: 2, requires: [], worksWith: ["bodyweight"], environments: INDOOR, goals: g(3, 3, 1, 4, 3), kind: "hold", lowImpact: true, instruction: "Thighs parallel, back flat on the wall." },
  { id: "reverse_lunge", name: "Reverse lunge", muscle: "legs", secondary: ["glutes"], difficulty: 2, requires: [], worksWith: ["bodyweight", "dumbbells"], environments: ALL, goals: g(3, 4, 1, 4, 4), kind: "reps", lowImpact: true, instruction: "Step back, back knee kisses the floor." },
  { id: "glute_bridge", name: "Glute bridge", muscle: "glutes", secondary: ["legs", "core"], difficulty: 1, requires: [], worksWith: ["bodyweight", "mat", "band"], environments: ALL, goals: g(2, 3, 2, 4, 4), kind: "reps", lowImpact: true, instruction: "Drive through the heels, squeeze at the top.", pose: "glute_bridge" },
  { id: "kettlebell_swing", name: "Kettlebell swing", muscle: "glutes", secondary: ["legs", "cardio", "back"], difficulty: 3, requires: ["kettlebell"], worksWith: ["kettlebell"], environments: ALL, goals: g(5, 4, 2, 4, 4), kind: "reps", lowImpact: false, instruction: "Hinge, snap the hips, float the bell to chest height." },
  { id: "romanian_deadlift", name: "Romanian deadlift", muscle: "glutes", secondary: ["legs", "back"], difficulty: 3, requires: ["dumbbells"], worksWith: ["dumbbells", "barbell"], environments: INDOOR, goals: g(2, 5, 1, 4, 5), kind: "reps", lowImpact: true, instruction: "Soft knees, push the hips back, flat spine." },
  { id: "leg_press", name: "Leg press", muscle: "legs", secondary: ["glutes"], difficulty: 2, requires: ["machines"], worksWith: ["machines"], environments: ["gym"], goals: g(2, 5, 1, 4, 5), kind: "reps", lowImpact: true, instruction: "Lower until knees reach 90°, don't lock out hard." },

  // ── Cardio / full body ─────────────────────────────
  { id: "jumping_jack", name: "Jumping jack", muscle: "cardio", secondary: ["legs", "shoulders"], difficulty: 1, requires: [], worksWith: ["bodyweight"], environments: ALL, goals: g(5, 1, 2, 3, 3), kind: "reps", lowImpact: false, instruction: "Arms overhead as the feet jump wide, stay light.", pose: "jumping_jacks" },
  { id: "high_knees", name: "High knees", muscle: "cardio", secondary: ["legs", "core"], difficulty: 2, requires: [], worksWith: ["bodyweight"], environments: ALL, goals: g(5, 1, 3, 3, 3), kind: "reps", lowImpact: false, instruction: "Knees to hip height, quick feet, tall chest.", pose: "high_knees" },
  { id: "burpee", name: "Burpee", muscle: "cardio", secondary: ["chest", "legs", "core"], difficulty: 4, requires: [], worksWith: ["bodyweight"], environments: ALL, goals: g(5, 3, 3, 3, 4), kind: "reps", lowImpact: false, instruction: "Chest to floor, jump up with arms overhead." },
  { id: "jump_rope", name: "Jump rope", muscle: "cardio", secondary: ["legs"], difficulty: 2, requires: ["jump_rope"], worksWith: ["jump_rope"], environments: ALL, goals: g(5, 1, 2, 3, 3), kind: "reps", lowImpact: false, instruction: "Wrists turn the rope, small bounces on the toes." },
  { id: "step_jack", name: "Step jack", muscle: "cardio", secondary: ["legs"], difficulty: 1, requires: [], worksWith: ["bodyweight"], environments: ALL, goals: g(4, 1, 2, 3, 2), kind: "reps", lowImpact: true, instruction: "Step one foot out as the arms rise — no jumping." },
];

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
