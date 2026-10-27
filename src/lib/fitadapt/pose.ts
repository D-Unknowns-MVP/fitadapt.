import reference from "@/data/pose-reference.json";
import type { PoseKey } from "./types";

/**
 * Pose analytics driven by the Exercise Detection Dataset (exercise_angles.csv).
 * - Joint angles are computed the same way as the dataset (shoulder, elbow, hip, knee, ankle).
 * - A k-NN classifier over dataset samples recognises which exercise is being performed.
 * - Rep thresholds and the 100% range-of-motion span come from per-exercise dataset quantiles.
 */

export type JointName = "shoulder" | "elbow" | "hip" | "knee" | "ankle";
export const JOINTS: JointName[] = ["shoulder", "elbow", "hip", "knee", "ankle"];

export interface LabelRef {
  label: string;
  rows: number;
  primaryJoint: JointName;
  quantiles: Record<JointName, number[]>;
  romRange: [number, number];
  thresholds: { low: number; high: number };
  histogram: number[];
}

export const POSE_REF = reference as unknown as {
  source: string;
  totalRows: number;
  labels: Record<PoseKey, LabelRef>;
  samples: [number, number, number, number, number, PoseKey][];
};

export interface Point {
  x: number;
  y: number;
  visibility?: number;
}

export function angle(a: Point, b: Point, c: Point): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const m = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
  if (m === 0) return 0;
  return (Math.acos(Math.min(1, Math.max(-1, dot / m))) * 180) / Math.PI;
}

const SIDES = {
  left: { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27, foot: 31 },
  right: { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28, foot: 32 },
};

/** Returns [shoulder, elbow, hip, knee, ankle] angles for the more visible body side. */
export function jointAngles(lm: Point[]): { angles: number[]; visibility: number } | null {
  if (!lm || lm.length < 33) return null;
  const vis = (s: typeof SIDES.left) =>
    Object.values(s).reduce((a, i) => a + (lm[i]!.visibility ?? 1), 0) / Object.values(s).length;
  const side = vis(SIDES.left) >= vis(SIDES.right) ? SIDES.left : SIDES.right;
  const p = (i: number) => lm[i]!;
  return {
    visibility: vis(side),
    angles: [
      angle(p(side.elbow), p(side.shoulder), p(side.hip)),
      angle(p(side.shoulder), p(side.elbow), p(side.wrist)),
      angle(p(side.shoulder), p(side.hip), p(side.knee)),
      angle(p(side.hip), p(side.knee), p(side.ankle)),
      angle(p(side.knee), p(side.ankle), p(side.foot)),
    ],
  };
}

export function classify(angles: number[], k = 7): { key: PoseKey; confidence: number } {
  const dists = POSE_REF.samples.map((s) => {
    let d = 0;
    for (let j = 0; j < 5; j++) d += ((s[j] as number) - (angles[j] ?? 0)) ** 2;
    return { d, key: s[5] };
  });
  dists.sort((a, b) => a.d - b.d);
  const votes = new Map<PoseKey, number>();
  for (const n of dists.slice(0, k)) votes.set(n.key, (votes.get(n.key) ?? 0) + 1);
  let best: PoseKey = dists[0]!.key;
  let bestV = 0;
  for (const [key, v] of votes) if (v > bestV) [best, bestV] = [key, v];
  return { key: best, confidence: bestV / k };
}

/** True when every joint sits inside the dataset's 5th–95th percentile band for that exercise. */
export function withinBand(key: PoseKey, angles: number[], tolerance = 10): boolean {
  const q = POSE_REF.labels[key].quantiles;
  return JOINTS.every((j, i) => {
    const a = angles[i] ?? 0;
    return a >= q[j][0]! - tolerance && a <= q[j][4]! + tolerance;
  });
}

export interface RepEvent {
  rom: number;
  form: number;
}

/**
 * Hysteresis rep counter on the exercise's primary joint.
 * A rep = leaving the start zone, crossing the opposite threshold, and returning.
 */
export class RepCounter {
  readonly ref: LabelRef;
  readonly jointIndex: number;
  private start: "low" | "high" | null = null;
  private crossed = false;
  private min = Infinity;
  private max = -Infinity;
  private frames = 0;
  private goodFrames = 0;
  reps = 0;
  lastRom = 0;

  constructor(readonly key: PoseKey) {
    this.ref = POSE_REF.labels[key];
    this.jointIndex = JOINTS.indexOf(this.ref.primaryJoint);
  }

  /** Feed one frame of joint angles; returns a RepEvent when a repetition completes. */
  push(angles: number[], formFrame?: boolean): RepEvent | null {
    const a = angles[this.jointIndex] ?? 0;
    const { low, high } = this.ref.thresholds;
    const zone = a <= low ? "low" : a >= high ? "high" : "mid";

    if (this.start === null) {
      if (zone !== "mid") this.start = zone;
      this.resetRep(a);
      return null;
    }
    this.min = Math.min(this.min, a);
    this.max = Math.max(this.max, a);
    this.frames++;
    if (formFrame ?? withinBand(this.key, angles)) this.goodFrames++;

    const opposite = this.start === "low" ? "high" : "low";
    if (zone === opposite) this.crossed = true;
    if (zone === this.start && this.crossed) {
      const [p5, p95] = this.ref.romRange;
      const rom = Math.max(0, Math.min(1, (this.max - this.min) / (p95 - p5)));
      const form = this.frames ? this.goodFrames / this.frames : 1;
      this.reps++;
      this.lastRom = rom;
      this.resetRep(a);
      return { rom, form };
    }
    return null;
  }

  private resetRep(a: number) {
    this.crossed = false;
    this.min = a;
    this.max = a;
    this.frames = 0;
    this.goodFrames = 0;
  }
}

// ---------------------------------------------------------------------------
// Hold (isometric) exercises: count only the seconds spent in correct form.
// ---------------------------------------------------------------------------

export type HoldKey = "plank" | "wall_sit";

export interface HoldCheck {
  ok: boolean;
  cue: string;
}

/**
 * Form check for one frame of a hold. Angles are [shoulder, elbow, hip, knee, ankle].
 * - Wall sit: the bottom of the dataset's wall_sit knee/hip distribution (p5 down to ~p50 + margin).
 * - Plank: straight shoulder–hip–knee–ankle line (no dataset label exists, so this is geometric).
 */
export function holdForm(key: HoldKey, angles: number[]): HoldCheck {
  const [shoulder = 0, , hip = 0, knee = 0] = angles;
  if (key === "wall_sit") {
    const q = POSE_REF.labels.wall_sit.quantiles;
    const lo = q.knee[0]! - 15;
    const hi = q.knee[2]! + 15;
    if (knee > hi) return { ok: false, cue: "Sit lower — thighs parallel" };
    if (knee < lo) return { ok: false, cue: "Too low — rise slightly" };
    if (hip > q.hip[2]! + 20) return { ok: false, cue: "Sit back against the wall" };
    return { ok: true, cue: "Good form — hold it" };
  }
  if (hip < 155) return { ok: false, cue: "Straighten your hips" };
  if (knee < 150) return { ok: false, cue: "Straighten your legs" };
  if (shoulder < 50 || shoulder > 120) return { ok: false, cue: "Shoulders over elbows" };
  return { ok: true, cue: "Good form — hold it" };
}

/** Accumulates time only while form is correct. Gaps longer than maxGapMs are not credited. */
export class HoldTimer {
  private goodMs = 0;
  private totalMs = 0;
  private last: number | null = null;
  constructor(private readonly maxGapMs = 300) {}

  /** Feed one frame; returns whole seconds held in good form so far. */
  push(ok: boolean, nowMs: number): number {
    if (this.last !== null) {
      const dt = nowMs - this.last;
      if (dt > 0 && dt <= this.maxGapMs) {
        this.totalMs += dt;
        if (ok) this.goodMs += dt;
      }
    }
    this.last = nowMs;
    return this.seconds;
  }

  /** Call when tracking pauses (person left frame) so the gap isn't credited. */
  break() {
    this.last = null;
  }

  get seconds() {
    return Math.floor(this.goodMs / 1000);
  }

  /** Share of tracked time spent in good form (0–1). */
  get formRatio() {
    return this.totalMs ? this.goodMs / this.totalMs : 0;
  }
}
