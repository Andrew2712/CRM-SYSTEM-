/**
 * src/lib/assessment/state.ts
 *
 * Factory for a blank AssessmentState, used by the wizard on "New
 * assessment" and as the shape reference for the Zod validation schema.
 */
import type { AssessmentState } from "./types";

export function createInitialState(): AssessmentState {
  const today = new Date().toISOString().slice(0, 10);
  return {
    P: { visit: "first", date: today, therapist: "" },
    consents: {},
    path: "gen",
    flags: {},
    zones: {},
    nrs: null,
    C: { agg: {}, ease: {}, pc: {}, mech: {}, tx: {}, goalsSel: {} },
    hist: { pmh: {}, blood: {}, dh: {}, fh: {} },
    cq: {},
    sin: {},
    psfs: [{ a: "", s: null }, { a: "", s: null }, { a: "", s: null }],
    obs: { obs: {}, posture: {}, gait: {} },
    regions: [],
    palp: {},
    rom: {},
    str: {},
    tight: {},
    neuro: { vals: {} },
    tests: {},
    mov: {},
    fx: {},
    vy: {},
    pt: {},
    out: {},
    dx: { picked: {} },
    vitals: {},
    cad: { risk: {}, signs: {} },
    ccr: { high: {}, low: {} },
    goals: [{ t: "", m: "", by: "" }, { t: "", m: "", by: "" }, { t: "", m: "", by: "" }],
    prog: {},
    ph: {},
    pe: {},
  };
}
