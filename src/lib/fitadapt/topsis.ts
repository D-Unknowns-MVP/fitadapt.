/**
 * TOPSIS — Technique for Order of Preference by Similarity to Ideal Solution.
 * All FitAdapt criteria are benefit criteria (higher score = better).
 */
export interface TopsisResult {
  index: number;
  closeness: number;
  dPlus: number;
  dMinus: number;
  weighted: number[];
}

export function topsis(matrix: number[][], weights: number[]): TopsisResult[] {
  if (matrix.length === 0) return [];
  const n = weights.length;
  const wSum = weights.reduce((a, b) => a + b, 0) || 1;
  const w = weights.map((x) => x / wSum);
  const at = (row: number[], j: number) => row[j] ?? 0;

  // 1–2. Vector normalisation
  const norms = Array.from({ length: n }, (_, j) =>
    Math.sqrt(matrix.reduce((acc, row) => acc + at(row, j) ** 2, 0)),
  );
  // 3. Apply weights
  const weighted = matrix.map((row) =>
    Array.from({ length: n }, (_, j) => (norms[j] ? (at(row, j) / norms[j]!) * w[j]! : 0)),
  );
  // 4. Ideal & negative-ideal
  const ideal = Array.from({ length: n }, (_, j) => Math.max(...weighted.map((r) => at(r, j))));
  const anti = Array.from({ length: n }, (_, j) => Math.min(...weighted.map((r) => at(r, j))));
  // 5–6. Distances and closeness
  return weighted.map((row, index) => {
    const dPlus = Math.sqrt(row.reduce((a, v, j) => a + (v - ideal[j]!) ** 2, 0));
    const dMinus = Math.sqrt(row.reduce((a, v, j) => a + (v - anti[j]!) ** 2, 0));
    const denom = dPlus + dMinus;
    return { index, dPlus, dMinus, weighted: row, closeness: denom === 0 ? 1 : dMinus / denom };
  });
}
