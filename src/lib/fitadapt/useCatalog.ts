import { useQuery } from "@tanstack/react-query";

import { CRITERIA, EXERCISES } from "./catalog";
import { FITADAPT_API_URL } from "./api";
import type { Criterion, Exercise } from "./types";

export interface Catalog {
  source: "mysql" | "seed";
  exercises: Exercise[];
  criteria: Criterion[];
}

export const SEED_CATALOG: Catalog = { source: "seed", exercises: EXERCISES, criteria: CRITERIA };

async function loadCatalog(): Promise<Catalog> {
  if (!FITADAPT_API_URL) return SEED_CATALOG;
  try {
    const response = await fetch(`${FITADAPT_API_URL}/index.php?route=catalog`);
    if (!response.ok) throw new Error(`Catalog API returned ${response.status}`);
    const data = (await response.json()) as Catalog;
    if (data.source !== "mysql" || !Array.isArray(data.exercises) || !data.exercises.length || !Array.isArray(data.criteria)) {
      throw new Error("MySQL catalog was empty or malformed");
    }
    return data;
  } catch (error) {
    console.warn("FitAdapt could not load the MySQL catalog; using the bundled exercise catalog.", error);
    return SEED_CATALOG;
  }
}

/** Reads the live MySQL catalog when the PHP API is configured, with a safe offline seed fallback. */
export function useCatalog(): Catalog {
  const { data } = useQuery({ queryKey: ["catalog"], queryFn: loadCatalog, staleTime: 10 * 60 * 1000, retry: false });
  return data ?? SEED_CATALOG;
}

export function findExercise(catalog: Catalog, id: string): Exercise | undefined {
  return catalog.exercises.find((e) => e.id === id);
}
