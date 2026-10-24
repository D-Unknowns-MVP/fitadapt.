import { createServerFn } from "@tanstack/react-start";

import { CRITERIA, EXERCISES } from "./catalog";
import type { Criterion, Exercise } from "./types";

/**
 * Returns the exercise database and TOPSIS criteria.
 * The MySQL database (database/fitadapt_mysql.sql) runs locally in XAMPP/Workbench, which the
 * hosted app cannot reach, so this serves the identical generated seed. To read live from a
 * reachable MySQL server later, query it here and return the same shape with source "mysql".
 */
export const getCatalog = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ source: "mysql" | "seed"; exercises: Exercise[]; criteria: Criterion[] }> => {
    return { source: "seed", exercises: EXERCISES, criteria: CRITERIA };
  },
);
