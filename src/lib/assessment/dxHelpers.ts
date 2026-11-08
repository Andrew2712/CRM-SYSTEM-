/**
 * src/lib/assessment/dxHelpers.ts
 *
 * Small pure "field reader" helpers shared by the diagnosis scoring engine
 * (dx.ts) and the safety screens / test clusters (redFlags.ts). Each
 * returns +1 (supports), -1 (argues against) or 0 (not assessed / not
 * applicable) for a single clinical finding read off the assessment state.
 */

import type { AssessmentState } from "./types";
import { ROM } from "./regions";

function on(o: Record<string, boolean> | undefined | null): string[] {
  return Object.keys(o || {}).filter((k) => (o as Record<string, boolean>)[k]);
}

// Functional-test thresholds used only by DX.func() below — a lightweight
// subset of the fuller sourced interpretation in measuredTests.ts, kept
// local here to avoid a circular import between the dx engine and the
// measured-test library.
const FUNC_THRESH: Record<string, { low?: number; high?: number; grade?: boolean }> = {
  sls: { low: 30 },
  heel: { low: 20 },
  ktw: { low: 10 },
  tug: { high: 13.5 },
  dnf: { low: 20 },
  slsq: { grade: true },
  step: { grade: true },
};

function numsFrom(d: { r?: (string | null)[]; l?: (string | null)[]; s?: (string | null)[] } | undefined): number[] {
  if (!d) return [];
  return [...(d.r || []), ...(d.l || []), ...(d.s || [])]
    .filter((v) => v != null && v !== "")
    .map(Number)
    .filter((n) => !isNaN(n));
}

export const DX = {
  yes: (A: AssessmentState, id: string) => (A.cq[id] === "Y" ? 1 : A.cq[id] === "N" ? -1 : 0),
  no: (A: AssessmentState, id: string) => (A.cq[id] === "N" ? 1 : A.cq[id] === "Y" ? -1 : 0),
  test: (A: AssessmentState, id: string): number => {
    const d = A.tests[id] || {};
    const v = [d.r, d.l, d.s].filter((x) => x === "POS" || x === "NEG");
    if (!v.length) return 0;
    return v.includes("POS") ? 1 : -1;
  },
  testNeg: (A: AssessmentState, id: string) => -DX.test(A, id),
  palp: (A: AssessmentState, name: string): number => {
    const p = A.palp[name];
    if (!p || p.g == null) return 0;
    return p.g >= 2 ? 1 : p.g === 1 ? 0.5 : -1;
  },
  rom: (A: AssessmentState, id: string, frac = 0.75): number => {
    const def = Object.values(ROM).flat().find((x) => x.id === id);
    if (!def) return 0;
    const d = A.rom[id] || {};
    const vals = [d.ar, d.al, d.a]
      .filter((v) => v !== "" && v != null)
      .map(Number)
      .filter((v) => !isNaN(v));
    if (!vals.length) return 0;
    if (def.deficit) return vals.some((v) => v >= 5) ? 1 : -1;
    return vals.some((v) => v < def.n * frac) ? 1 : -1;
  },
  romPainful: (A: AssessmentState, id: string): number => {
    const d = A.rom[id];
    if (!d) return 0;
    return d.pain ? 1 : 0;
  },
  str: (A: AssessmentState, id: string): number => {
    const d = A.str[id];
    if (!d) return 0;
    const v = [d.l, d.r, d.s].filter((x) => x != null) as number[];
    if (!v.length) return 0;
    const m = Math.min(...v);
    return m <= 3 ? 1 : m === 4 ? 0.5 : -1;
  },
  tight: (A: AssessmentState, id: string) => (A.tight[id] ? 1 : 0),
  zone: (A: AssessmentState, prefix: string) =>
    Object.keys(A.zones).some((k) => A.zones[k]?.nrs > 0 && k.indexOf(prefix) === 0) ? 1 : 0,
  agg: (A: AssessmentState, x: string) => (A.C.agg?.[x] ? 1 : 0),
  ease: (A: AssessmentState, x: string) => (A.C.ease?.[x] ? 1 : 0),
  ptype: (A: AssessmentState, x: string) => (A.ptype?.[x] ? 1 : 0),
  pattern: (A: AssessmentState, x: string) => (A.ppattern?.[x] ? 1 : 0),
  ageOver: (A: AssessmentState, n: number): number => {
    const a = parseInt(A.P.age || "", 10);
    if (isNaN(a)) return 0;
    return a >= n ? 1 : -1;
  },
  ageUnder: (A: AssessmentState, n: number): number => {
    const a = parseInt(A.P.age || "", 10);
    if (isNaN(a)) return 0;
    return a < n ? 1 : -1;
  },
  chronic: (A: AssessmentState): number => {
    const d = A.C.duration;
    if (!d) return 0;
    return ["3–6 months", "6–12 months", "Over a year"].includes(d) ? 1 : -1;
  },
  acute: (A: AssessmentState): number => {
    const d = A.C.duration;
    if (!d) return 0;
    return ["Less than a week", "1–4 weeks"].includes(d) ? 1 : -1;
  },
  trauma: (A: AssessmentState): number => (A.C.onset ? (A.C.onset === "Sudden, with an injury" ? 1 : -1) : 0),
  posture: (A: AssessmentState, id: string) => (A.obs.posture?.[id] ? 1 : 0),
  pmh: (A: AssessmentState, x: string) => (A.hist.pmh?.[x] ? 1 : 0),
  neuroDef: (A: AssessmentState, grp: "U" | "L"): number => {
    const G = grp === "U"
      ? { derm: ["C5", "C6", "C7", "C8", "T1"], myo: ["mC5", "mC6", "mC7", "mC8", "mT1"], ref: ["rBic", "rBr", "rTri"] }
      : { derm: ["L2", "L3", "L4", "L5", "S1"], myo: ["mL2", "mL3", "mL4", "mL5", "mS1"], ref: ["rKnee", "rAnk"] };
    const v = A.neuro.vals;
    let rec = 0, def = 0;
    G.derm.forEach((id) => { const x = v[id] || {}; [x.r, x.l].forEach((s) => { if (s) { rec++; if (s === "R" || s === "A") def++; } }); });
    G.myo.forEach((id) => { const x = v[id] || {}; [x.r, x.l].forEach((s) => { if (s != null) { rec++; if (Number(s) <= 4) def++; } }); });
    G.ref.forEach((id) => { const x = v[id] || {}; [x.r, x.l].forEach((s) => { if (s != null) { rec++; if (Number(s) <= 1) def++; } }); });
    return !rec ? 0 : def ? 1 : -1;
  },
  umn: (A: AssessmentState): number => {
    const v = A.neuro.vals;
    let rec = 0, pos = 0;
    ["hoff", "babin", "clonus"].forEach((id) => { const x = v[id] || {}; [x.r, x.l].forEach((s) => { if (s) { rec++; if (s === "POS") pos++; } }); });
    ["rBic", "rTri", "rBr", "rKnee", "rAnk"].forEach((id) => { const x = v[id] || {}; [x.r, x.l].forEach((s) => { if (s != null && Number(s) >= 3) { rec++; pos++; } }); });
    return !rec ? 0 : pos ? 1 : -1;
  },
  mdt: (A: AssessmentState, resp: string): number => {
    const vals = Object.values(A.mdt || {});
    if (!vals.length) return 0;
    return vals.includes(resp) ? 1 : -1;
  },
  func: (A: AssessmentState, id: string): number => {
    const t = FUNC_THRESH[id];
    if (!t) return 0;
    const d = A.fx?.[id];
    if (!d) return 0;
    const vals = numsFrom(d);
    if (!vals.length) return 0;
    if (t.grade) {
      // FX "scale" tests store the selected option index (0 = worst).
      return vals.some((n) => n === 0) ? 1 : vals.every((n) => n >= 2) ? -1 : 0;
    }
    if (t.low != null) return vals.some((n) => n < t.low!) ? 1 : -1;
    if (t.high != null) return vals.some((n) => n > t.high!) ? 1 : -1;
    return 0;
  },
  mov: (A: AssessmentState, id: string): number => {
    const m = A.mov[id];
    if (!m || !m.q) return 0;
    return m.q === "P" ? 1 : m.q === "F" ? 0.5 : -1;
  },
  sens: (A: AssessmentState): number => {
    const cs = A.spec?.cs;
    return cs === "Likely" ? 1 : cs === "Possible" ? 0.5 : cs === "None" ? -1 : 0;
  },
};

export { on };
