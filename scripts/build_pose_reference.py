"""Builds src/data/pose-reference.json from the Exercise Detection Dataset (exercise_angles.csv).

Usage: python3 scripts/build_pose_reference.py path/to/exercise_angles.csv
Outputs per-exercise joint-angle quantiles, rep-counting thresholds for the primary joint,
a primary-joint histogram, and a stratified sample used by the in-browser k-NN classifier.
"""
import json, sys
import pandas as pd

JOINTS = ["Shoulder_Angle", "Elbow_Angle", "Hip_Angle", "Knee_Angle", "Ankle_Angle"]
PRIMARY = {
    "Jumping Jacks": "Shoulder_Angle",
    "Pull ups": "Elbow_Angle",
    "Push Ups": "Elbow_Angle",
    "Russian twists": "Elbow_Angle",
    "Squats": "Knee_Angle",
    "Glute Bridge": "Hip_Angle",
    "High Knees": "Hip_Angle",
    "Mountain Climber": "Hip_Angle",
}
KEYS = {"Jumping Jacks": "jumping_jacks", "Pull ups": "pull_ups", "Push Ups": "push_ups",
        "Russian twists": "russian_twists", "Squats": "squats"}
SAMPLES_PER_CLASS = 160

src = sys.argv[1] if len(sys.argv) > 1 else "/tmp/ds/exercise_angles.csv"
df = pd.read_csv(src)
out = {"source": "Exercise Detection Dataset (exercise_angles.csv)", "totalRows": int(len(df)),
       "joints": [j.replace("_Angle", "").lower() for j in JOINTS], "labels": {}, "samples": []}
for label, g in df.groupby("Label"):
    key = KEYS[label]
    q = g[JOINTS].quantile([0.05, 0.15, 0.5, 0.85, 0.95])
    quant = {j.replace("_Angle", "").lower(): [round(float(q.loc[p, j]), 1) for p in [0.05, 0.15, 0.5, 0.85, 0.95]] for j in JOINTS}
    prim = PRIMARY[label]
    p5, p95 = float(q.loc[0.05, prim]), float(q.loc[0.95, prim])
    span = p95 - p5
    hist, _ = pd.cut(g[prim], bins=range(0, 190, 10), include_lowest=True, retbins=True)
    counts = hist.value_counts(sort=False).tolist()
    out["labels"][key] = {
        "label": label, "rows": int(len(g)), "primaryJoint": prim.replace("_Angle", "").lower(),
        "quantiles": quant,
        "romRange": [round(p5, 1), round(p95, 1)],
        "thresholds": {"low": round(p5 + 0.3 * span, 1), "high": round(p95 - 0.3 * span, 1)},
        "histogram": [int(c) for c in counts],
    }
    s = g.sample(n=min(SAMPLES_PER_CLASS, len(g)), random_state=42)
    for _, r in s.iterrows():
        out["samples"].append([round(float(r[j]), 1) for j in JOINTS] + [key])
with open("src/data/pose-reference.json", "w") as f:
    json.dump(out, f, separators=(",", ":"))
print("ok", len(out["samples"]))
