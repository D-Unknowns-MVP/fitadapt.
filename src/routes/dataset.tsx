import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Download } from "lucide-react";

import { Screen } from "@/components/fitadapt/Screen";
import csvAsset from "@/data/exercise_angles.csv.asset.json";
import { JOINTS, POSE_REF } from "@/lib/fitadapt/pose";
import type { PoseKey } from "@/lib/fitadapt/types";

export const Route = createFileRoute("/dataset")({
  head: () => ({
    meta: [
      { title: "Exercise Detection Dataset — FitAdapt" },
      {
        name: "description",
        content: "How FitAdapt uses 31,033 labelled joint-angle frames to recognise exercises, count reps and measure ROM.",
      },
      { property: "og:title", content: "Exercise Detection Dataset — FitAdapt" },
      { property: "og:description", content: "31,033 labelled joint-angle frames power FitAdapt's camera tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DatasetPage,
});

function DatasetPage() {
  const keys = Object.keys(POSE_REF.labels) as PoseKey[];
  return (
    <Screen>
      <Link to="/plan" className="fa-back">
        <ArrowLeft size={16} /> Back
      </Link>
      <p className="fa-eyebrow" style={{ marginTop: "1.2rem" }}>
        Computer vision
      </p>
      <h1 className="fa-title fa-title--md">Exercise Detection Dataset</h1>
      <p className="fa-lead">
        {POSE_REF.totalRows.toLocaleString()} labelled frames of joint angles across {keys.length} exercises. FitAdapt
        uses them to recognise the movement, set rep thresholds, and define 100% range of motion.
      </p>
      <div className="fa-row" style={{ margin: "1.2rem 0 1.5rem" }}>
        <a className="fa-btn fa-btn--outline fa-btn--sm" href={csvAsset.url} download="exercise_angles.csv">
          <Download /> Download CSV
        </a>
      </div>

      {keys.map((k) => {
        const ref = POSE_REF.labels[k];
        const max = Math.max(...ref.histogram);
        return (
          <section key={k} className="fa-card">
            <div className="fa-log-head">
              <h2 className="fa-h2" style={{ margin: 0 }}>
                {ref.label}
              </h2>
              <span className="fa-tag">{ref.rows.toLocaleString()} frames</span>
            </div>
            <p className="fa-sub">
              Rep tracked on the <strong className="fa-accent">{ref.primaryJoint}</strong> angle · rep thresholds{" "}
              {ref.thresholds.low}° / {ref.thresholds.high}° · full ROM {ref.romRange[0]}°–{ref.romRange[1]}°
            </p>
            <div className="fa-hist" aria-label={`${ref.primaryJoint} angle distribution`}>
              {ref.histogram.map((c, i) => (
                <span key={i} style={{ height: `${(c / max) * 100}%` }} title={`${i * 10}–${i * 10 + 10}°: ${c}`} />
              ))}
            </div>
            <div className="fa-hist-axis">
              <span>0°</span>
              <span>90°</span>
              <span>180°</span>
            </div>
            <dl className="fa-kv">
              {JOINTS.map((j) => (
                <div key={j} style={{ display: "contents" }}>
                  <dt>{j} (5th–95th pct)</dt>
                  <dd>
                    {Math.round(ref.quantiles[j][0]!)}°–{Math.round(ref.quantiles[j][4]!)}°
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}

      <section className="fa-card">
        <h2 className="fa-h2">How it's used</h2>
        <ul className="fa-list">
          <li>MediaPipe Pose finds body landmarks on your device; joint angles are computed with vector math.</li>
          <li>A k-nearest-neighbour classifier compares your angles with {POSE_REF.samples.length} dataset samples to recognise the exercise (≈84% frame accuracy on held-out data).</li>
          <li>A rep counts when the primary joint crosses both dataset thresholds and returns.</li>
          <li>ROM = your movement span ÷ the dataset's 5th–95th percentile span. Form = share of frames inside the dataset's joint-angle bands.</li>
        </ul>
      </section>
    </Screen>
  );
}
