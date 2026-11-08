/**
 * src/lib/assessment/reportBuilder.ts
 *
 * The single authoritative, deterministic report generator. Both the live
 * wizard (client-side preview) and POST /api/assessments (server-side,
 * persisted) call `buildReport()` on the same AssessmentState and get the
 * same result — no LLM call, no text round-trip.
 */

import type { AssessmentState, ReportResult, RegionProgramme, PhaseId } from "./types";
import { DX } from "./dxHelpers";
import { runDx, pickedDx, fitWord } from "./dx";
import { rfAssess, cadAssess, ccrAssess, startBack, keeleMsk, RISK_ADVICE, laslett, wainner } from "./redFlags";
import { calcPillars } from "./pillars";
import { fullProgramme, pgmRegions, GENERAL_CAUTIONS, PHASE_IDS } from "./exercises";
import { pathOf, pathTx, pathProgramme, pathHold, pathFlags, pathScores, pathLines, PATH_CONS } from "./pathways";
import { rootCauses, lifestyle, ergonomics, eduFor, eduForRegion, stressPlan, suggestThermo, THERMO } from "./education";
import { OUTCOME_FOR, REGION_NAME, TEST_NAME, regionName, ROM, ZONE_LABEL, NEURO_U, NEURO_L, MPATS } from "./regions";
import { QUESTIONNAIRES, scoreQuestionnaire } from "./questionnaires";
import { progressRows, sessionSummaryLine } from "./sessions";
import { txSafety } from "./txSafety";
import { FXI, fxSides, fxResult, fxFmt } from "./measuredTests";

const PLANS = [
  { id: "reset", name: "Reset", sessions: 18, price: 14900, validity: "3 months" },
  { id: "restore", name: "Restore", sessions: 30, price: 22900, validity: "6 months" },
  { id: "recover", name: "Recover", sessions: 50, price: 34900, validity: "9 months" },
  { id: "revive", name: "Revive", sessions: 75, price: 49900, validity: "12 months" },
  { id: "renew", name: "Renew", sessions: 110, price: 68900, validity: "12 months" },
];

function on(o: Record<string, boolean> | undefined | null): string[] {
  return Object.keys(o || {}).filter((k) => (o as Record<string, boolean>)[k]);
}

function zoneList(A: AssessmentState): string[] {
  return Object.keys(A.zones)
    .filter((k) => (A.zones[k]?.nrs ?? 0) > 0)
    .map((k) => `${ZONE_LABEL[k] || k} ${A.zones[k].nrs}/10${A.zones[k].q ? ` (${A.zones[k].q})` : ""}`);
}

function firstName(n?: string): string {
  const w = String(n || "").trim().split(/\s+/).filter((x) => !/^(Mr\.?|Mrs\.?|Ms\.?|Miss|Dr\.?|Smt\.?|Shri|Sri)$/i.test(x));
  return w[0] || "";
}

function stageOf(A: AssessmentState): string {
  const d = A.C.duration;
  if (!d) return "";
  return ["Less than a week", "1–4 weeks"].includes(d) ? "Acute (under 6 weeks)" : ["1–3 months"].includes(d) ? "Subacute (6–12 weeks)" : "Persistent (over 3 months)";
}

/** Combines every safety screen into a single list of reasons the exercise programme is withheld. */
export function holdLoading(A: AssessmentState): string[] {
  const r: string[] = [];
  rfAssess(A).forEach((g) => { if (g.level === "Emergency" || g.level === "High") r.push(`${g.n}: ${g.level.toLowerCase()} suspicion. ${g.action}`); });
  pickedDx(A).forEach((d) => { if (/X-ray|Same-day|Urgent/i.test(d.refer || "")) r.push(`${d.name}: ${d.refer}.`); });
  const cad = cadAssess(A);
  if (cad && cad.level === "High") r.push(`Neck vascular screen: ${cad.msg}`);
  const cc = ccrAssess(A);
  if (cc && cc.img) r.push(`Canadian C-spine rule: ${cc.msg}`);
  if (DX.umn(A) === 1) r.push("Upper motor neuron signs: medical opinion needed before loading.");
  const sys = parseInt(A.vitals.sys || "", 10), dia = parseInt(A.vitals.dia || "", 10);
  if (!isNaN(sys) && !isNaN(dia) && (sys >= 180 || dia >= 110)) r.push("Very high blood pressure recorded today: do not treat; refer for medical review.");
  pathHold(A).forEach((m) => r.push(m));
  return r;
}

function chiefText(A: AssessmentState): string {
  if (A.C.chief && A.C.chief.trim()) return A.C.chief.trim();
  const pc = on(A.C.pc).map((x) => x.toLowerCase());
  if (!pc.length) return "";
  const reg = A.regions.map(regionName).join(" and ");
  const side = A.C.side === "Right" ? "right" : A.C.side === "Left" ? "left" : A.C.side === "Both sides" ? "both sides" : "";
  const lst = pc.length > 1 ? pc.slice(0, -1).join(", ") + " and " + pc[pc.length - 1] : pc[0];
  const where = side && reg ? `${side} side of the ${reg}` : reg || side;
  return `${lst.charAt(0).toUpperCase() + lst.slice(1)}${where ? `, ${where}` : ""}`;
}

function buildSubjective(A: AssessmentState): string {
  const L: string[] = [];
  L.push(`${A.P.name || "Patient"}${A.P.age ? `, ${A.P.age} yrs` : ""}${A.P.gender ? `, ${A.P.gender.toLowerCase()}` : ""}${A.P.occupation ? `, ${A.P.occupation}` : ""}.`);
  const p = pathOf(A);
  if (p.id !== "gen") L.push(`${p.n} assessment.`);
  const cht = chiefText(A);
  if (cht) L.push(`Presents with ${cht.replace(/\.$/, "").replace(/^./, (c) => c.toLowerCase())}${A.C.duration ? ` for ${A.C.duration.toLowerCase()}` : ""}${A.C.onset ? `; onset ${A.C.onset.toLowerCase()}` : ""}.`);
  const zs = zoneList(A);
  if (zs.length) L.push(`Pain area: ${zs.join(", ")}.`);
  if (A.nrs != null) L.push(`NRS ${A.nrs}/10 now${A.nrsW != null ? `, ${A.nrsW}/10 at worst` : ""}${A.nrsB != null ? `, ${A.nrsB}/10 at best` : ""}.`);
  const pt = on(A.ptype);
  if (pt.length) L.push(`Quality: ${pt.join(", ").toLowerCase()}.`);
  const pp = on(A.ppattern);
  if (pp.length) L.push(`Pattern: ${pp.join(", ").toLowerCase()}.`);
  const courseParts = [A.C.course, A.C.prevEp].filter(Boolean);
  if (courseParts.length) L.push(`${courseParts.join("; ")}.`);
  const mech = on(A.C.mech);
  if (mech.length) L.push(`How it started: ${mech.join(", ").toLowerCase()}.`);
  const ag = on(A.C.agg);
  if (ag.length) L.push(`Worse with ${ag.map((x) => x.toLowerCase()).join(", ")}.`);
  const es = on(A.C.ease);
  if (es.length) L.push(`Eased by ${es.map((x) => x.toLowerCase()).join(", ")}.`);
  const txsf = on(A.C.tx);
  if (txsf.length) L.push(`Treatment so far: ${txsf.join(", ").toLowerCase()}.`);
  const pm = on(A.hist.pmh).filter((x) => x !== "None");
  if (pm.length) L.push(`Medical history: ${pm.join(", ")}.`);
  const dh = on(A.hist.dh).filter((x) => x !== "None");
  if (dh.length) L.push(`Drug history: ${dh.join(", ")}.`);
  const fh = on(A.hist.fh).filter((x) => x !== "None known");
  if (fh.length) L.push(`Family history: ${fh.join(", ")}.`);
  const slaConf = [
    A.C.sleep != null ? `sleep ${A.C.sleep}/5` : "", A.C.stress != null ? `stress ${A.C.stress}/5` : "",
    A.C.act != null ? `activity ${A.C.act}/5` : "", A.selfEff != null ? `confidence ${A.selfEff}/5` : "",
  ].filter(Boolean);
  if (slaConf.length) L.push(`${slaConf.join(", ")}.`);
  const sin = [A.sin.sev && `severity ${A.sin.sev.toLowerCase()}`, A.sin.irr && `irritability ${A.sin.irr.toLowerCase()}`, A.sin.nature && `nature ${A.sin.nature.toLowerCase()}`].filter(Boolean);
  if (sin.length) L.push(`SIN: ${sin.join(", ")}. ${stageOf(A)}.`);
  const ps = A.psfs.filter((x) => x.a && x.s != null);
  if (ps.length) L.push(`PSFS: ${ps.map((x) => `${x.a} ${x.s}/10`).join("; ")}.`);
  const iceParts = [A.ice?.idea ? `believes: ${A.ice.idea.toLowerCase()}` : "", ...on(A.ice?.concern).map((x) => `concerned about ${x.toLowerCase()}`), ...on(A.ice?.expect).map((x) => `expects ${x.toLowerCase()}`)].filter(Boolean);
  if (iceParts.length) L.push(`ICE: ${iceParts.join("; ")}.`);
  const yf = on(A.yf);
  if (yf.length) L.push(`Yellow flags: ${yf.join("; ")}.`);
  const sh = (A.sh || {}) as Record<string, unknown>;
  const shParts = [
    sh.livesWith ? `lives with: ${sh.livesWith}` : "",
    ...on(sh.atHome as Record<string, boolean>).map((x) => x.toLowerCase()),
    ...on(sh.getsAround as Record<string, boolean>).map((x) => `gets around by ${x.toLowerCase()}`),
    sh.screenTime ? `screen time ${sh.screenTime}` : "",
    sh.exerciseDays ? `exercise ${sh.exerciseDays} days/week` : "",
    sh.sleepHours ? `sleeps ${sh.sleepHours}` : "",
    sh.diet ? `diet: ${sh.diet}` : "",
    sh.tobacco ? `tobacco: ${sh.tobacco}` : "",
    sh.alcohol ? `alcohol: ${sh.alcohol}` : "",
  ].filter((x): x is string => !!x);
  if (shParts.length) L.push(`Social history: ${shParts.join(", ")}.`);
  pathLines(A, "hx").forEach((x) => L.push(x));
  const rfa = rfAssess(A).filter((g) => g.level !== "None");
  L.push(rfa.length
    ? `Serious pathology screen: ${rfa.map((g) => `${g.n} ${g.level.toLowerCase()} suspicion`).join("; ")}.${A.referralAck ? ` Referral advised${A.referTo ? ` (${A.referTo})` : ""} and documented.` : ""}`
    : "Serious pathology screen clear.");
  const sb = startBack(A);
  if (sb) L.push(`STarT Back ${sb.total}/9 (psychosocial ${sb.psych}/5): ${sb.risk} risk.`);
  const km = keeleMsk(A);
  if (km) L.push(`Keele STarT MSK ${km.total}/12: ${km.risk} risk.`);
  return L.join(" ");
}

function romLines(A: AssessmentState): string[] {
  const L: string[] = [];
  A.regions.forEach((rid) => {
    (ROM[rid] || []).forEach((m) => {
      const d = A.rom[m.id];
      if (!d) return;
      const f = (v: unknown) => (v === "" || v == null ? null : v);
      const parts: string[] = [];
      if (m.bi) {
        if (f(d.ar) != null || f(d.al) != null) parts.push(`AROM R ${f(d.ar) ?? "–"}° L ${f(d.al) ?? "–"}°`);
        if (f(d.pr) != null || f(d.pl) != null) parts.push(`PROM R ${f(d.pr) ?? "–"}° L ${f(d.pl) ?? "–"}°`);
      } else {
        if (f(d.a) != null) parts.push(`AROM ${d.a}°`);
        if (f(d.p) != null) parts.push(`PROM ${d.p}°`);
      }
      if (d.ef && d.ef !== "Normal") parts.push(`end-feel ${d.ef.toLowerCase()}`);
      if (d.pain) parts.push("painful");
      if (parts.length) L.push(`${regionName(rid)} ${m.m.toLowerCase()}: ${parts.join(", ")}`);
    });
  });
  return L;
}

interface NeuroLabelGroup { derm: Array<{ id: string; l: string }>; myo: Array<{ id: string; l: string }>; ref: Array<{ id: string; l: string }>; umn: Array<{ id: string; l: string }> }

function neuroLines(A: AssessmentState): string[] {
  const L: string[] = [];
  const v = A.neuro.vals || {};
  const groups: Array<{ grp: NeuroLabelGroup; label: string }> = [];
  if (A.neuro.showU) groups.push({ grp: NEURO_U, label: "Upper limb" });
  if (A.neuro.showL) groups.push({ grp: NEURO_L, label: "Lower limb" });
  groups.forEach(({ grp, label }) => {
    const abn: string[] = [];
    grp.derm.forEach((d) => {
      const x = v[d.id];
      if (x?.r && x.r !== "N") abn.push(`${d.l} R ${x.r}`);
      if (x?.l && x.l !== "N") abn.push(`${d.l} L ${x.l}`);
    });
    grp.myo.forEach((m) => {
      const x = v[m.id];
      if (x?.r != null && Number(x.r) <= 4) abn.push(`${m.l} R ${x.r}/5`);
      if (x?.l != null && Number(x.l) <= 4) abn.push(`${m.l} L ${x.l}/5`);
    });
    grp.ref.forEach((r) => {
      const x = v[r.id];
      if (x?.r != null && (Number(x.r) <= 1 || Number(x.r) >= 3)) abn.push(`${r.l} R ${x.r}/4`);
      if (x?.l != null && (Number(x.l) <= 1 || Number(x.l) >= 3)) abn.push(`${r.l} L ${x.l}/4`);
    });
    grp.umn.forEach((u) => {
      const x = v[u.id];
      if (x?.r === "POS") abn.push(`${u.l} R positive`);
      if (x?.l === "POS") abn.push(`${u.l} L positive`);
    });
    L.push(`${label} neuro screen: ${abn.length ? abn.join(", ") : "no deficit found"}.`);
  });
  return L;
}

function movementLine(A: AssessmentState): string {
  const entries = MPATS.map((m) => {
    const d = A.mov[m.id];
    return d?.q ? `${m.n} ${d.q === "G" ? "good" : d.q === "F" ? "fair" : "poor"}` : null;
  }).filter((x): x is string => !!x);
  return entries.length ? `Movement screen: ${entries.join(", ")}.` : "";
}

function fxLines(A: AssessmentState): string[] {
  return Object.keys(A.fx || {}).map((id) => {
    const t = FXI[id];
    if (!t) return null;
    const sides = fxSides(t);
    const parts = sides.map((s) => {
      const r = fxResult(t, A.fx[id], s);
      if (r.status !== "ok" && r.status !== "incomplete") return null;
      return `${sides.length > 1 ? `${s === "r" ? "R" : "L"} ` : ""}${fxFmt(t, r)}`;
    }).filter((x): x is string => !!x);
    return parts.length ? `${t.n}: ${parts.join(" / ")}` : null;
  }).filter((x): x is string => !!x);
}

function buildObjective(A: AssessmentState): string {
  const L: string[] = [];
  const ob = on(A.obs.obs);
  if (ob.length) L.push(`Observation: ${ob.join(", ").toLowerCase()}.`);
  const po = on(A.obs.posture);
  if (po.length) L.push(`Posture: ${po.join(", ")}.`);
  const vt: string[] = [];
  if (A.vitals.sys && A.vitals.dia) vt.push(`BP ${A.vitals.sys}/${A.vitals.dia} mmHg`);
  if (A.vitals.hr) vt.push(`HR ${A.vitals.hr} bpm`);
  if (vt.length) L.push(`Vitals: ${vt.join(", ")}.`);
  const cad = cadAssess(A);
  if (cad) L.push(`Neck vascular screen: ${cad.level === "None" ? "clear" : cad.level.toLowerCase() + " concern"}.`);
  if (A.regions.length) L.push(`Regions examined: ${A.regions.map(regionName).join(", ")}.`);
  const pa = Object.entries(A.palp).filter(([, v]) => v && v.g != null).map(([k, v]) => `${k} grade ${v.g}`);
  if (pa.length) L.push(`Palpation: ${pa.join("; ")}.`);
  const tf = on(A.tissue);
  if (tf.length || A.palpNote) L.push(`Tissue findings: ${[...tf, A.palpNote].filter(Boolean).join("; ")}.`);
  const br = on(A.breath?.pattern);
  if (br.length || A.breath?.rr || A.breath?.cp) {
    const parts = [...br, A.breath?.rr ? `RR ${A.breath.rr}/min` : "", A.breath?.cp ? `control pause ${A.breath.cp}s` : "", A.breath?.hilo || ""].filter(Boolean);
    L.push(`Breathing: ${parts.join(", ")}.`);
  }
  const rl = romLines(A);
  if (rl.length) L.push(`ROM: ${rl.join("; ")}.`);
  const ts = Object.entries(A.tests).filter(([, v]) => v && Object.values(v).some((x) => x === "POS" || x === "NEG"))
    .map(([id, v]) => `${TEST_NAME[id] || id} ${v.r ? `R ${v.r}` : ""}${v.l ? ` L ${v.l}` : ""}${v.s ? v.s : ""}`.trim());
  if (ts.length) L.push(`Special tests: ${ts.join("; ")}.`);
  const la = laslett(A);
  if (la) L.push(`Laslett SIJ cluster: ${la.msg}`);
  const wa = wainner(A);
  if (wa) L.push(`Wainner cluster: ${wa.msg}`);
  neuroLines(A).forEach((x) => L.push(x));
  const mvl = movementLine(A);
  if (mvl) L.push(mvl);
  const fxl = fxLines(A);
  if (fxl.length) L.push(`Measured tests: ${fxl.join("; ")}.`);
  pathLines(A, "exam").forEach((x) => L.push(x));
  const pss = pathScores(A);
  Object.values(pss).forEach((s) => L.push(s.txt));
  if (A.groc != null) L.push(`GROC ${A.groc > 0 ? "+" : ""}${A.groc}.`);
  const pl = calcPillars(A);
  if (pl.total != null) L.push(`Vyayāma Mobility Score ${pl.total}/100 (${pl.n} of 5 pillars).`);
  return L.join(" ") || "No objective findings recorded yet.";
}

function stripOff(p: RegionProgramme | null, off: Record<string, boolean> | undefined): RegionProgramme | null {
  if (!p || !off || !Object.keys(off).length) return p;
  const phases = {} as RegionProgramme["phases"];
  (PHASE_IDS as PhaseId[]).forEach((ph) => {
    const phc = p.phases[ph];
    phases[ph] = { ...phc, clinic: phc.clinic.filter((e) => !off[e.n]), home: phc.home.filter((e) => !off[e.n]) };
  });
  return { ...p, phases };
}

function doctorLetterText(A: AssessmentState, hold: string[]): string {
  const rfa = rfAssess(A).filter((g) => g.level !== "None");
  const picked = pickedDx(A);
  const top = picked[0];
  const L: string[] = [];
  L.push(`Re: ${A.P.name || "Patient"}${A.P.age ? `, ${A.P.age} yrs` : ""}${A.P.gender ? `, ${A.P.gender}` : ""}`);
  L.push(`Date: ${A.P.date || new Date().toISOString().slice(0, 10)}`);
  L.push("");
  L.push("Dear Doctor,");
  L.push("");
  L.push(`This patient was assessed by physiotherapy today${A.regions.length ? ` for the ${A.regions.map(regionName).join(", ")}` : ""}.`);
  if (top) L.push(`Provisional clinical impression: ${top.name} (ICD-10 ${top.icd}${top.icd11 ? `, ICD-11 ${top.icd11}` : ""}), fit ${top.fit}%. Supported by: ${top.sup.join("; ").toLowerCase()}.${top.against.length ? ` Against: ${top.against.join("; ").toLowerCase()}.` : ""}`);
  if (rfa.length) L.push(`Screening findings of concern: ${rfa.map((g) => `${g.n} (${g.level.toLowerCase()} suspicion)`).join("; ")}.`);
  if (hold.length) L.push(`Physiotherapy treatment has been deferred pending your review. Reason(s): ${hold.join(" ")}`);
  else L.push("No findings today that would contraindicate physiotherapy treatment.");
  L.push("");
  L.push(`Referred for: ${A.referTo || "your kind opinion and further management as appropriate"}.`);
  L.push("");
  L.push("Please contact the clinic if any further information is required.");
  L.push("");
  L.push(`Regards,\n${A.P.therapist || "Physiotherapist"}`);
  return L.join("\n");
}

function ruleImpressions(A: AssessmentState) {
  const picked = pickedDx(A);
  const words = ["Most likely", "Possible", "Consider", "Consider"];
  const dxImps = picked.map((d, i) => ({
    likelihood: words[i] || "Consider",
    dx: "Suggestive of " + d.name.charAt(0).toLowerCase() + d.name.slice(1),
    icd10: d.icd, icd11: d.icd11, icf: d.icf, fit: d.fit,
    why: `Supported by: ${d.sup.join("; ").toLowerCase()}.${d.against.length ? ` Against: ${d.against.join("; ").toLowerCase()}.` : ""}`,
    further: d.consider.join(", "),
    refer: !!d.refer, referNote: d.refer || "",
  }));
  const pc = (PATH_CONS[A.path] || []).filter((c) => A.pcons?.[c.id]).map((c) => ({
    likelihood: "Consider", dx: "Consider " + c.n.charAt(0).toLowerCase() + c.n.slice(1), icd10: c.icd, icd11: "", icf: "",
    fit: null, why: `Pathway consideration: ${c.cue}.`, further: "", refer: !!c.refer, referNote: c.refer || "",
  }));
  return [...dxImps, ...pc];
}

export function buildReport(A: AssessmentState): ReportResult {
  const hold = holdLoading(A);
  const picked = pickedDx(A);
  const top = picked[0];
  const pl = calcPillars(A);
  const impressions = ruleImpressions(A);

  const regions = pgmRegions(A);
  const programmes: RegionProgramme[] = hold.length ? [] : regions
    .map((r) => stripOff(fullProgramme(A, r, { noFloor: A.pgm?.noFloor, noBand: A.pgm?.noBand }), A.pgm?.off))
    .filter((p): p is RegionProgramme => !!p);
  const pathwayProgramme = hold.length ? null : stripOff(pathProgramme(A, { noFloor: A.pgm?.noFloor, noBand: A.pgm?.noBand }), A.pgm?.off);
  const pathwayTreatment = pathOf(A).id !== "gen" ? pathTx(A) : null;

  const outcomeMeasures: ReportResult["outcomeMeasures"] = {};
  const outKeys = [...new Set(A.regions.map((r) => OUTCOME_FOR[r]).filter(Boolean))];
  outKeys.forEach((k) => {
    const arr = A.out[k] || [];
    const r = scoreQuestionnaire(k, arr);
    outcomeMeasures[k] = { label: QUESTIONNAIRES[k]?.name || k, score: r?.score ?? null, text: r?.text || `${QUESTIONNAIRES[k]?.name}: not completed` };
  });

  const plan = PLANS.find((p) => p.id === A.plan) || null;
  const assessment = top
    ? `Provisional classification: ${top.name} (ICD-10 ${top.icd}). ${stageOf(A)}, ${A.sin.irr || "unspecified"} irritability.${hold.length ? " Red flags present — treatment deferred pending referral." : " No contraindications to physiotherapy treatment identified today."}`
    : "Insufficient findings yet for a confident provisional classification.";
  const planText = hold.length
    ? `Hold active treatment and the exercise programme. ${hold.join(" ")}`
    : `${pathwayProgramme || programmes.length ? "Phased exercise programme issued (see programme)." : "Advice and education given; exercise programme to follow once regions are examined."} Review in ${pathOf(A).review} weeks.`;

  const first = firstName(A.P.name);
  const patientStory = top
    ? `Hi ${first || "there"}, thank you for coming in today. What you're experiencing fits a pattern we call ${top.name.toLowerCase()} — ${eduFor(top.id)?.what || "a common, treatable pattern we see often."} ${eduFor(top.id)?.fix || "We'll build a plan together to settle it and get you back to what you enjoy."}`
    : `Hi ${first || "there"}, thank you for coming in today. ${eduForRegion(A.regions[0] || "")}`;
  const whatsapp = `Hi ${first || "there"}, thanks for visiting Vyayāma Physio today. ${top ? `We found: ${top.name.toLowerCase()}.` : "We've recorded your assessment."} Your home plan is ready — please do the exercises as shown and let us know if anything changes. See you at your next visit! — Team Vyayāma`;

  const thermoPick = suggestThermo(A);
  const thermo = thermoPick
    ? { id: thermoPick.id, name: THERMO[thermoPick.id]?.n || thermoPick.id, how: THERMO[thermoPick.id]?.how || "", why: thermoPick.why, caution: thermoPick.caution }
    : null;

  return {
    schemaVersion: 2,
    impressions,
    assessment,
    plan: planText,
    subjective: buildSubjective(A),
    objective: buildObjective(A),
    loadClass: A.vy.load || "",
    stage: stageOf(A),
    irritability: A.sin.irr || "",
    pathway: A.path,
    redFlags: rfAssess(A),
    hold,
    pillars: pl,
    programmes,
    pathwayProgramme,
    pathwayTreatment,
    rootCauses: rootCauses(A),
    lifestyle: lifestyle(A),
    ergonomics: ergonomics(A),
    outcomeMeasures,
    investmentPlan: plan ? { id: plan.id, name: plan.name, sessions: plan.sessions, price: plan.price } : null,
    patientStory,
    whatsapp,
    doctorLetter: doctorLetterText(A, hold),
    sessionSummary: sessionSummaryLine(A),
    cautions: [...new Set([...(pathwayTreatment?.cautions || []), ...GENERAL_CAUTIONS])],
    avoid: [...new Set([...programmes.flatMap((p) => p.avoid), ...(pathwayTreatment?.avoid || [])])],
    progress: progressRows(A),
    groc: A.groc ?? null,
    stressPlan: stressPlan(A),
    thermo,
    txSafety: txSafety(A, A.treat?.mods, hold),
  };
}

export { PLANS, chiefText, stageOf, firstName, REGION_NAME, pathFlags };
