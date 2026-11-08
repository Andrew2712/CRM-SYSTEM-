/**
 * src/lib/assessment/pillars.ts
 *
 * The Vyayāma Mobility Score — five clinician-scored pillars (0-20 each,
 * 0-100 total), each with an optional patient self-rating for comparison.
 * Ported from the Vyayama v9 clinical reference (logic.js).
 */

import type { AssessmentState } from "./types";
import { STR_MUSCLES } from "./regions";

export const PILLARS = [
  { id: "samsparsa", name: "Saṃsparśa", en: "Touch & sensitivity", src: "Pain scores (now and worst)" },
  { id: "prana", name: "Prāṇa", en: "Breath & movement", src: "Movement screen and breathing pattern" },
  { id: "akriti", name: "Ākṛti", en: "Posture & mobility", src: "Your posture rating and tight muscles" },
  { id: "sakti", name: "Śakti", en: "Strength", src: "Oxford muscle grades" },
  { id: "punarutthana", name: "Punarutthāna", en: "Recovery & function", src: "PSFS and pain-coping confidence" },
] as const;

export function strengthValues(A: AssessmentState): number[] {
  return A.regions.flatMap((rid) =>
    (STR_MUSCLES[rid] || []).flatMap((m) => {
      const d = A.str[m.id] || {};
      return m.b ? [d.l, d.r].filter((v) => v != null) : [d.s].filter((v) => v != null);
    })
  ) as number[];
}

export function psfsAvg(A: AssessmentState): number | null {
  const v = A.psfs.filter((p) => p.a && p.s != null);
  return v.length ? v.reduce((x, y) => x + (y.s as number), 0) / v.length : null;
}

export interface PillarsResult {
  items: Array<{ id: string; name: string; en: string; src: string; clin: number | null; pt: number | null }>;
  total: number | null;
  partial: number | null;
  ptTotal: number | null;
  n: number;
  grade: string;
}

export function calcPillars(A: AssessmentState): PillarsResult {
  const clamp = (v: number) => Math.max(0, Math.min(20, Math.round(v)));
  const res: Record<string, number> = {};

  if (A.nrs != null || A.nrsW != null) {
    const n = A.nrs ?? A.nrsW ?? 0;
    const w = A.nrsW ?? A.nrs ?? 0;
    res.samsparsa = clamp(20 - (n * 0.6 + w * 0.4) * 2);
  }

  const mv = Object.values(A.mov).map((v) => (v.q === "G" ? 3 : v.q === "F" ? 2 : v.q === "P" ? 1 : null)).filter((v) => v != null) as number[];
  if (mv.length || A.vy.breath) {
    let s = mv.length ? (mv.reduce((a, b) => a + b, 0) / mv.length / 3) * 20 : 16;
    if (A.vy.breath === "upper") s -= 2;
    if (A.vy.breath === "hold") s -= 4;
    res.prana = clamp(s);
  }

  if (A.vy.posture != null) {
    const t = Object.values(A.tight).filter(Boolean).length;
    res.akriti = clamp(A.vy.posture * 4 - Math.min(6, t * 1.5));
  }

  const sv = strengthValues(A);
  if (sv.length) res.sakti = clamp((sv.reduce((a, b) => a + b, 0) / sv.length / 5) * 20);

  const pa = psfsAvg(A);
  if (pa != null || A.selfEff != null) res.punarutthana = clamp((pa ?? 5) + (A.selfEff ?? 3) * 2);

  const items = PILLARS.map((p) => ({
    ...p,
    clin: res[p.id] ?? null,
    pt: A.pt[p.id] != null ? (A.pt[p.id] as number) * 2 : null,
  }));
  const scored = items.filter((i) => i.clin != null);
  const total = scored.length ? Math.round((scored.reduce((a, b) => a + (b.clin as number), 0) / (scored.length * 20)) * 100) : null;
  const ptScored = items.filter((i) => i.pt != null);
  const ptTotal = ptScored.length ? Math.round((ptScored.reduce((a, b) => a + (b.pt as number), 0) / (ptScored.length * 20)) * 100) : null;
  const grade = (t: number | null) =>
    t == null ? "" : t >= 80 ? "A · Moving well" : t >= 60 ? "B · Mostly there" : t >= 40 ? "C · Getting by" : t >= 20 ? "D · Struggling" : "E · Very limited";
  const ok = scored.length >= 3;
  return { items, total: ok ? total : null, partial: total, ptTotal, n: scored.length, grade: ok ? grade(total) : "" };
}
