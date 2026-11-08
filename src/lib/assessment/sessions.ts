/**
 * src/lib/assessment/sessions.ts
 *
 * Daily treatment-session notes and baseline/reassessment progress
 * tracking. Ported from the Vyayama v9 clinical reference
 * (logic.js's session/progress helpers + fx_logic.js comparisons).
 */

import type { AssessmentState, BaselineSnapshot, ProgressRow, SessionNote, PhaseId } from "./types";
import { calcPillars, psfsAvg } from "./pillars";
import { scoreQuestionnaire } from "./questionnaires";
import { OUTCOME_FOR } from "./regions";
import { MCID } from "./redFlags";
import { FX, FX_MCID, fxResult, fxSides } from "./measuredTests";

export const HEP_ADH = ["Doing all exercises", "Doing some", "Not doing yet"];
export const RESP_OPTS = ["Better after session", "No change", "Worse after session"];
export const ADVERSE_OPTS = ["None", "Soreness settling within 24 h", "Flare lasting over 24 h", "Other (see notes)"];

export function newSession(A: AssessmentState): SessionNote {
  const n = (A.sessions || []).length + 1;
  return {
    id: Date.now(), n, date: new Date().toISOString().slice(0, 10), therapist: A.P.therapist || "",
    nrsPre: null, nrsPost: null, phase: (A.vy.stage as PhaseId) || "calm",
    mods: {}, ex: {}, hep: "", resp: "", adverse: "None", notes: "", next: "", addenda: [],
  };
}

function outcomeNums(A: AssessmentState): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  const keys = [...new Set(A.regions.map((r) => OUTCOME_FOR[r]).filter(Boolean))];
  keys.forEach((k) => { out[k] = scoreQuestionnaire(k, A.out[k] || [])?.score ?? null; });
  return out;
}

export function snapshot(A: AssessmentState): BaselineSnapshot {
  const fx: NonNullable<BaselineSnapshot["fx"]> = {};
  FX.filter((t) => A.fx[t.id]?.sel && !A.fx[t.id]?.nt).forEach((t) => {
    const d = A.fx[t.id];
    const values: NonNullable<BaselineSnapshot["fx"]>[string]["values"] = {};
    fxSides(t).forEach((side) => {
      const result = fxResult(t, d, side);
      if (result.status === "ok" && result.v != null) values[side] = result.v;
    });
    if (Object.keys(values).length) fx[t.id] = { values, protocol: t.protocol, assist: d.assist || "None", modification: d.mod || "None", distance: t.kind === "gait" ? d.dist || 6 : undefined };
  });
  return {
    date: A.P.date || new Date().toISOString().slice(0, 10),
    nrs: A.nrs ?? null,
    psfs: (() => { const v = psfsAvg(A); return v != null ? +v.toFixed(1) : null; })(),
    mob: calcPillars(A).total,
    outcomes: outcomeNums(A),
    fx,
  };
}

const OUT_LABEL: Record<string, { l: string; dir: number }> = {
  ndi: { l: "NDI (%)", dir: -1 }, odi: { l: "ODI (%)", dir: -1 }, qdash: { l: "QuickDASH", dir: -1 },
  hoos: { l: "HOOS-PS", dir: 1 }, koos: { l: "KOOS-PS", dir: 1 }, faam: { l: "FAAM-ADL (%)", dir: 1 },
};

export function progressRows(A: AssessmentState): ProgressRow[] {
  const b = A.baseline;
  if (!b) return [];
  const now = snapshot(A);
  const rows: ProgressRow[] = [];
  const add = (key: string, label: string, dir: number, baseV: number | null, nowV: number | null, mcid: number | null) => {
    if (baseV == null && nowV == null) return;
    const change = baseV != null && nowV != null ? +(nowV - baseV).toFixed(1) : null;
    const better = change == null ? null : dir > 0 ? change > 0 : change < 0;
    const met = change != null && mcid != null ? Math.abs(change) >= mcid && !!better : null;
    rows.push({ key, label, base: baseV, now: nowV, change, better, mcid, met });
  };
  add("nrs", "Pain now (NPRS)", -1, b.nrs, now.nrs, MCID.nrs.t);
  add("psfs", "PSFS average", 1, b.psfs, now.psfs, MCID.psfs.t);
  Object.keys(OUT_LABEL).forEach((k) => add(k, OUT_LABEL[k].l, OUT_LABEL[k].dir, b.outcomes?.[k] ?? null, now.outcomes[k] ?? null, k === "odi" ? MCID.odi.t : null));
  add("mob", "Vyayāma Mobility Score", 1, b.mob, now.mob, null);
  const current = now.fx || {};
  Object.keys(b.fx || {}).forEach((id) => {
    const test = FX.find((t) => t.id === id);
    if (!test) return;
    const before = b.fx?.[id];
    const after = current[id];
    const changedMethod = !!after && (before?.protocol !== after.protocol || before?.assist !== after.assist || before?.modification !== after.modification || before?.distance !== after.distance);
    (Object.keys(before?.values || {}) as Array<"r" | "l" | "s">).forEach((side) => {
      const baseV = before?.values[side] ?? null;
      const nowV = after?.values[side] ?? null;
      if (baseV == null && nowV == null) return;
      const change = baseV != null && nowV != null && !changedMethod ? +(nowV - baseV).toFixed(2) : null;
      const better = change == null ? null : test.dir > 0 ? change > 0 : test.dir < 0 ? change < 0 : null;
      const mcid = FX_MCID[id]?.v ?? null;
      rows.push({
        key: `fx:${id}:${side}`,
        label: `${test.n}${side === "s" ? "" : ` (${side.toUpperCase()})`}${changedMethod ? " · protocol changed; compare cautiously" : ""}`,
        base: baseV, now: nowV, change, better, mcid,
        met: change != null && mcid != null && better != null ? Math.abs(change) >= mcid && better : null,
      });
    });
  });
  return rows;
}

export function sessionText(A: AssessmentState, s: SessionNote): string {
  const m = Object.keys(s.mods || {}).filter((k) => s.mods[k]);
  const ex = Object.keys(s.ex || {}).filter((k) => s.ex[k]);
  const lines = [
    `${A.P.name || "Patient"} · Session ${s.n} · ${s.date} · ${s.therapist}`,
    `Pain (NRS): ${s.nrsPre ?? "–"}/10 before → ${s.nrsPost ?? "–"}/10 after`,
    `Phase: ${s.phase || "–"}`,
    m.length || s.params ? `Treatment: ${m.join(", ")}${s.params ? ` (${s.params})` : ""}` : "",
    ex.length ? `Exercises: ${ex.join(", ")}` : "",
    s.hep ? `Home programme: ${s.hep.toLowerCase()}` : "",
    s.resp ? `Response: ${s.resp.toLowerCase()}` : "",
    s.adverse && s.adverse !== "None" ? `Adverse reaction: ${s.adverse.toLowerCase()}` : "",
    s.notes ? `Notes: ${s.notes}` : "",
    s.next ? `Plan for next session: ${s.next}` : "",
    ...(s.addenda || []).map((a) => `Addendum ${new Date(a.at).toLocaleString("en-IN")} (${a.by}): ${a.text}`),
  ].filter(Boolean);
  return lines.join("\n");
}

export function sessionSummaryLine(A: AssessmentState): string {
  const S = A.sessions || [];
  if (!S.length) return "";
  const f = S[0], l = S[S.length - 1];
  return `Treatment so far: ${S.length} session${S.length > 1 ? "s" : ""} from ${f.date} to ${l.date}. Pain (NRS) ${f.nrsPre ?? "–"}/10 at the first session, ${l.nrsPost ?? "–"}/10 after the latest session.`;
}
