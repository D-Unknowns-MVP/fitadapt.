import { useQuery } from "@tanstack/react-query";

import { CRITERIA, EXERCISES } from "./catalog";
import { getCatalog } from "./catalog.functions";
import type { Criterion, Exercise } from "./types";

export interface Catalog {
  source: "mysql" | "seed";
  exercises: Exercise[];
  criteria: Criterion[];
}

export const SEED_CATALOG: Catalog = { source: "seed", exercises: EXERCISES, criteria: CRITERIA };

/**
 * Exercise database + TOPSIS criteria. Loaded from MySQL when it is configured;
 * the bundled seed (identical to database/fitadapt_mysql.sql) is used until then.
 */
export function useCatalog(): Catalog {
  const { data } = useQuery({
    queryKey: ["catalog"],
    queryFn: () => getCatalog(),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
  return data ?? SEED_CATALOG;
}

export function findExercise(catalog: Catalog, id: string): Exercise | undefined {
  return catalog.exercises.find((e) => e.id === id);
}
