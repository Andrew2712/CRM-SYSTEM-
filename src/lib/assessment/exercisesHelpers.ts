/**
 * src/lib/assessment/exercisesHelpers.ts
 *
 * Tiny shared helpers used by both exercises.ts and pathways.ts, split out
 * to avoid a circular import between the two.
 */
import type { Exercise } from "./types";

export const EX_TYPES: Record<string, { l: string; c: string }> = {
  MAN: { l: "Hands-on / modality", c: "#9A847C" }, ACT: { l: "Muscle activation", c: "#5F7F5B" }, ISO: { l: "Isometric", c: "#5F7F5B" },
  CON: { l: "Concentric", c: "#B4521F" }, ECC: { l: "Eccentric", c: "#8C3B1C" }, CE: { l: "Concentric–eccentric", c: "#B4521F" },
  MOB: { l: "Mobility", c: "#9C7A4A" }, STR: { l: "Stretch", c: "#9C7A4A" }, POS: { l: "Posture correction", c: "#6E5148" },
  CORE: { l: "Core", c: "#3F170E" }, SC: { l: "Strength & conditioning", c: "#8C3B1C" }, END: { l: "Endurance", c: "#5A6E8C" },
  FUNC: { l: "Functional", c: "#D56A34" }, NEU: { l: "Balance & control", c: "#5A6E8C" }, PLY: { l: "Plyometric / power", c: "#A8261B" },
  NRV: { l: "Nerve glide", c: "#7A5C8C" }, BRE: { l: "Breathing", c: "#5F7F5B" }, AER: { l: "Aerobic", c: "#5A6E8C" }, LOAD: { l: "Load correction", c: "#D56A34" },
};

export function X(t: string, n: string, d: string, c: string, why: string, o?: Partial<Exercise>): Exercise {
  return { t, n, d, c, why, ...(o || {}) };
}
