import { describe, expect, it } from "vitest";

import { adapt } from "./adaptation";
import { CRITERIA, EXERCISES } from "./catalog";
import { RepCounter, POSE_REF, classify } from "./pose";
import { alternatives, generatePlan, isFeasible } from "./recommend";
import { topsis } from "./topsis";
import type { Profile, SetResult } from "./types";

const profile: Profile = {
  goal: "build_abs",
  focus: "core",
  environment: "home",
  equipment: ["bodyweight"],
  experience: 1,
  sessionMinutes: 40,
  daysPerWeek: 3,
};

const sets = (reps: number, target: number, rom: number, form: number): SetResult[] =>
  [1, 2, 3].map((set) => ({ exerciseId: "sit_up", set, reps, target, rom, form, tracked: true }));

describe("TOPSIS", () => {
  it("criteria weights sum to 1", () => {
    expect(CRITERIA.reduce((a, c) => a + c.weight, 0)).toBeCloseTo(1, 5);
  });

  it("ranks the dominating alternative first and the dominated one last", () => {
    const r = topsis(
      [
        [5, 5, 5],
        [3, 3, 3],
        [1, 1, 1],
      ],
      [1, 1, 1],
    );
    expect(r[0]!.closeness).toBe(1);
    expect(r[2]!.closeness).toBe(0);
    expect(r[1]!.closeness).toBeGreaterThan(0);
    expect(r[1]!.closeness).toBeLessThan(1);
  });
});

describe("plan generation", () => {
  it("never programs exercises that need equipment the user doesn't own", () => {
    const plan = generatePlan({ profile, level: 2, stats: {}, cantDo: [] });
    for (const item of plan.items) {
      const ex = EXERCISES.find((e) => e.id === item.exerciseId)!;
      expect(isFeasible(ex, profile)).toBe(true);
    }
  });

  it("a 40-minute session gets 8 exercises", () => {
    expect(generatePlan({ profile, level: 2, stats: {}, cantDo: [] }).items).toHaveLength(8);
  });

  it("alternatives exclude exercises already in the plan", () => {
    const alts = alternatives("sit_up", { profile, level: 2, stats: {}, cantDo: [] }, ["sit_up", "crunch"], false);
    expect(alts.map((a) => a.exercise.id)).not.toContain("crunch");
    expect(alts.length).toBeGreaterThan(0);
  });
});

describe("rule-based adaptation", () => {
  it("increases difficulty when reps, form and ROM meet thresholds", () => {
    const d = adapt(sets(12, 12, 0.9, 0.9), "right", 2);
    expect(d.action).toBe("increase");
    expect(d.newLevel).toBe(2.3);
  });

  it("decreases difficulty when under 60% of reps are completed", () => {
    const d = adapt(sets(5, 12, 0.9, 0.9), "right", 2);
    expect(d.action).toBe("decrease");
    expect(d.newLevel).toBe(1.7);
    expect(d.swapOut).toContain("sit_up");
  });

  it("holds difficulty when form is below threshold even if reps are hit", () => {
    expect(adapt(sets(10, 12, 0.9, 0.5), "right", 2).action).toBe("maintain");
  });

  it("'too difficult' feedback cancels an increase", () => {
    expect(adapt(sets(12, 12, 0.9, 0.9), "hard", 2).newLevel).toBe(2);
  });

  it("never goes above level 5", () => {
    expect(adapt(sets(12, 12, 1, 1), "easy", 4.9).newLevel).toBe(5);
  });
});

describe("dataset-driven pose tracking", () => {
  it("counts one squat rep from standing → deep squat → standing", () => {
    const c = new RepCounter("squats");
    const stand = [20, 40, 175, 178, 174];
    const deep = [20, 40, 45, 40, 150];
    let events = 0;
    for (const f of [stand, stand, deep, deep, stand]) if (c.push(f)) events++;
    expect(events).toBe(1);
    expect(c.reps).toBe(1);
  });

  it("recognises dataset samples with the k-NN classifier", () => {
    const sample = POSE_REF.samples.find((s) => s[5] === "push_ups")!;
    expect(classify(sample.slice(0, 5) as number[]).key).toBe("push_ups");
  });
});

import { HoldTimer, holdForm } from "./pose";

describe("Hold tracking", () => {
  it("counts only seconds spent in correct form", () => {
    const t = new HoldTimer();
    let now = 0;
    for (let i = 0; i < 60; i++) t.push(true, (now += 100)); // ~6s good
    for (let i = 0; i < 30; i++) t.push(false, (now += 100)); // 3s bad
    expect(t.seconds).toBe(5);
    expect(t.formRatio).toBeGreaterThan(0.6);
    expect(t.formRatio).toBeLessThan(0.7);
  });

  it("does not credit time while out of frame", () => {
    const t = new HoldTimer();
    t.push(true, 0);
    t.push(true, 500);
    t.break();
    t.push(true, 10_000);
    expect(t.seconds).toBe(0);
  });

  it("plank requires a straight body line", () => {
    expect(holdForm("plank", [80, 90, 175, 175, 90]).ok).toBe(true);
    expect(holdForm("plank", [80, 90, 130, 175, 90]).ok).toBe(false);
  });

  it("wall sit requires thighs near parallel", () => {
    expect(holdForm("wall_sit", [5, 170, 95, 95, 178]).ok).toBe(true);
    expect(holdForm("wall_sit", [5, 170, 175, 175, 178]).ok).toBe(false);
  });
});
