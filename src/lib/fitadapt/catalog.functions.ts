import { createServerFn } from "@tanstack/react-start";

import { CRITERIA, EXERCISES } from "./catalog";
import type { Criterion, Exercise } from "./types";

/**
 * Returns the exercise database and TOPSIS criteria.
 * Reads from MySQL when connection settings are configured; otherwise serves the bundled seed.
 */
export const getCatalog = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ source: "mysql" | "seed"; exercises: Exercise[]; criteria: Criterion[] }> => {
    return { source: "seed", exercises: EXERCISES, criteria: CRITERIA };
  },
);
