/**
 * src/lib/assessment/redFlags.ts
 *
 * Serious-pathology screening (grouped red flags), the cervical arterial
 * dysfunction screen, the Canadian C-spine rule, STarT Back / Keele STarT
 * MSK risk stratification, and the SIJ / cervical radiculopathy test
 * clusters. Ported from the Vyayama v9 clinical reference (data_safety.js).
 */

import type { AssessmentState, RedFlagGroupResult, RedFlagItem } from "./types";
import { DX, on } from "./dxHelpers";

export interface RedFlagGroupDef {
  id: string;
  n: string;
  items: RedFlagItem[];
}

export const RF_GROUPS: RedFlagGroupDef[] = [
  {
    id: "ces", n: "Cauda equina syndrome", items: [
      { id: "ces_saddle", label: "Numbness in the saddle area (between legs, buttocks, inner thighs)", key: true, g: "ces" },
      { id: "ces_bladder", label: "New difficulty passing urine, retention, or loss of bladder control", key: true, g: "ces" },
      { id: "ces_bowel", label: "Loss of bowel control", key: true, g: "ces" },
      { id: "ces_sexual", label: "New sexual dysfunction or genital numbness", key: true, g: "ces" },
      { id: "ces_bilat", label: "Sciatica or leg symptoms in both legs", g: "ces" },
      { id: "ces_weak", label: "Progressive leg weakness or foot drop", g: "ces" },
    ],
  },
  {
    id: "cancer", n: "Spinal malignancy", items: [
      { id: "ca_hx", label: "Past history of cancer", key: true, g: "cancer" },
      { id: "ca_wt", label: "Unexplained weight loss", g: "cancer" },
      { id: "ca_age", label: "New pain in someone over 50 with no clear cause", g: "cancer" },
      { id: "ca_night", label: "Constant pain, not eased by rest or position, worse at night", g: "cancer" },
      { id: "ca_fail", label: "Not improving after 4–6 weeks of good care", g: "cancer" },
    ],
  },
  {
    id: "fracture", n: "Spinal fracture", items: [
      { id: "fx_trauma", label: "Significant trauma (road accident, fall from height)", key: true, g: "fracture" },
      { id: "fx_osteo", label: "Osteoporosis or a previous fragility fracture", g: "fracture" },
      { id: "fx_steroid", label: "Long-term steroid use (over 3 months)", g: "fracture" },
      { id: "fx_age", label: "Age over 65", g: "fracture" },
    ],
  },
  {
    id: "infection", n: "Spinal infection", items: [
      { id: "inf_fever", label: "Fever, chills or night sweats with the pain", key: true, g: "infection" },
      { id: "inf_recent", label: "Recent infection, surgery or spinal injection", g: "infection" },
      { id: "inf_immuno", label: "Immunosuppressed (medication, HIV, transplant, poorly controlled diabetes)", g: "infection" },
      { id: "inf_tb", label: "TB now or in the past, or close contact with TB (consider spinal TB)", g: "infection" },
    ],
  },
  {
    id: "neuro", n: "Serious neurological", items: [
      { id: "neu_prog", label: "Progressive or widespread neurological deficit", key: true, g: "neuro" },
      { id: "neu_gait", label: "Unsteady walking or clumsy hands (possible myelopathy)", g: "neuro" },
    ],
  },
];

export const RF_RANK: Record<string, number> = { None: 0, Low: 1, Moderate: 2, "Urgent watch": 2, High: 3, Emergency: 4 };

export const CES_SAFETY_NET =
  "If you notice numbness between your legs or around your bottom, difficulty passing urine or controlling your bladder or bowels, or numbness during sex, go to the emergency department straight away. Do not wait for your next appointment.";

export function rfAssess(A: AssessmentState): RedFlagGroupResult[] {
  return RF_GROUPS.map((g) => {
    const ticked = g.items.filter((i) => A.flags[i.id]);
    const key = ticked.some((i) => i.key);
    let level: RedFlagGroupResult["level"] = "None";
    if (g.id === "ces") level = key ? "Emergency" : ticked.length ? "Urgent watch" : "None";
    else if (g.id === "neuro") level = key ? "High" : ticked.length ? "Moderate" : "None";
    else if (key && ticked.length >= 2) level = "High";
    else if (ticked.length >= 3) level = "High";
    else if (key || ticked.length === 2) level = "Moderate";
    else if (ticked.length === 1) level = "Low";
    const action: Record<RedFlagGroupResult["level"], string> = {
      Emergency: "Send to emergency today. Do not examine further.",
      High: "Stop and refer for medical assessment and investigation before treatment.",
      Moderate: "Discuss with the patient's doctor; consider investigations; review closely.",
      "Urgent watch": "Give clear safety-net advice and review within days.",
      Low: "Note it, monitor, and re-ask at each visit.",
      None: "",
    };
    return { id: g.id, n: g.n, level, ticked, action: action[level] };
  });
}

// ── Cervical arterial dysfunction screen (IFOMPT International Framework) ──
export const CAD_RISK = [
  "High blood pressure", "High cholesterol", "Smoker", "Diabetes", "Recent neck trauma or manipulation",
  "History of migraine-type headache", "Connective tissue disorder", "Recent infection",
  "Family history of stroke or heart disease", "Oral contraceptive use",
];
export const CAD_SIGNS = [
  "Dizziness or vertigo", "Double vision", "Slurred speech", "Difficulty swallowing", "Drop attacks",
  "Nystagmus", "Nausea", "Numbness of face or lips", "Unsteady walking", "New, unusual or worst-ever headache",
  "Drooping eyelid or unequal pupils", "Neck pain unlike anything before",
];

export function cadAssess(A: AssessmentState): { level: string; msg: string } | null {
  const s = on(A.cad.signs);
  const r = on(A.cad.risk);
  const bp = parseInt(A.vitals.sys || "", 10);
  if (s.length) return { level: "High", msg: "Possible cervical arterial dysfunction. No neck manual therapy. Arrange urgent medical review." };
  if (r.length >= 2 || bp >= 160) return { level: "Moderate", msg: "Several vascular risk factors. Measure BP, avoid end-range or high-velocity neck techniques, and monitor for symptoms." };
  if (r.length) return { level: "Low", msg: "One risk factor. Proceed with care and re-screen if symptoms change." };
  return A.cad.done ? { level: "None", msg: "Screen clear." } : null;
}

// ── Canadian C-spine rule ───────────────────────────────────────────────────
export const CCR_HIGH = ["Age 65 or over", "Dangerous mechanism (fall over 1 m / 5 stairs, axial load, high-speed or rollover crash, bike collision)", "Numbness or tingling in arms or legs"];
export const CCR_LOW = ["Simple rear-end collision", "Sitting up comfortably", "Walked at any time since the injury", "Neck pain started later, not immediately", "No tenderness over the midline of the neck"];

export function ccrAssess(A: AssessmentState): { img: boolean | null; msg: string } | null {
  const c = A.ccr;
  if (!c || !c.used) return null;
  if (on(c.high).length) return { img: true, msg: "High-risk factor present. X-ray / imaging indicated before neck examination." };
  if (!on(c.low).length) return { img: true, msg: "No low-risk factor allows safe movement testing. Imaging indicated." };
  if (c.rot === "no") return { img: true, msg: "Unable to actively rotate 45° both ways. Imaging indicated." };
  if (c.rot === "yes") return { img: false, msg: "No imaging needed by the Canadian C-spine rule." };
  return { img: null, msg: "Ask the patient to actively rotate 45° to each side to complete the rule." };
}

// ── STarT Back Screening Tool (© Keele University 2007) ─────────────────────
export const STARTBACK = [
  "My back pain has spread down my leg(s) at some time in the last 2 weeks",
  "I have had pain in the shoulder or neck at some time in the last 2 weeks",
  "I have only walked short distances because of my back pain",
  "In the last 2 weeks, I have dressed more slowly than usual because of back pain",
  "It's not really safe for a person with a condition like mine to be physically active",
  "Worrying thoughts have been going through my mind a lot of the time",
  "I feel that my back pain is terrible and it's never going to get any better",
  "In general I have not enjoyed all the things I used to enjoy",
];
export const STARTBACK_Q9 = ["Not at all", "Slightly", "Moderately", "Very much", "Extremely"];

export function startBack(A: AssessmentState): { total: number; psych: number; risk: "Low" | "Medium" | "High" } | null {
  const s = A.sbt || {};
  const ans = STARTBACK.map((_, i) => s["q" + i]);
  if (ans.some((v) => v == null) || s.q8 == null) return null;
  const q9 = s.q8 === "Very much" || s.q8 === "Extremely" ? 1 : 0;
  const total = ans.filter((v) => v === "A").length + q9;
  const psych = ans.slice(4).filter((v) => v === "A").length + q9;
  const risk = total <= 3 ? "Low" : psych <= 3 ? "Medium" : "High";
  return { total, psych, risk };
}

export function keeleMsk(A: AssessmentState): { total: number; risk: "Low" | "Medium" | "High" } | null {
  const n = parseInt(A.kmsk || "", 10);
  if (isNaN(n)) return null;
  return { total: n, risk: n <= 4 ? "Low" : n <= 8 ? "Medium" : "High" };
}

export const RISK_ADVICE: Record<string, string> = {
  Low: "Advice, reassurance and a home programme; fewer supervised sessions.",
  Medium: "Standard physiotherapy: exercise, manual therapy and education.",
  High: "Physiotherapy with a psychologically informed approach; address fear, beliefs and coping; consider a longer plan.",
};

// ── Test clusters ────────────────────────────────────────────────────────
export function laslett(A: AssessmentState): { pos: number; tested: number; positive: boolean; msg: string } | null {
  const ids = ["sijDist", "thighThrust", "sijComp", "sacThrust"];
  const r = ids.map((id) => DX.test(A, id));
  const g = DX.test(A, "gaenslen");
  const pos = r.filter((x) => x === 1).length + (g === 1 ? 1 : 0);
  const tested = r.filter((x) => x !== 0).length + (g !== 0 ? 1 : 0);
  if (!tested) return null;
  const positive = r.filter((x) => x === 1).length >= 2 || pos >= 3;
  return {
    pos, tested, positive,
    msg: positive
      ? `${pos} of ${tested} provocation tests positive. Cluster positive, consistent with SIJ pain.`
      : `${pos} of ${tested} positive. Cluster negative so far (needs 2 of the first 4, or 3 of 5).`,
  };
}

export function wainner(A: AssessmentState): { pos: number; tested: number; msg: string } | null {
  const d = A.rom.c_rot || {};
  const v = [d.ar, d.al].filter((x) => x !== "" && x != null).map(Number);
  const romCrit = !v.length ? 0 : v.some((x) => x < 60) ? 1 : -1;
  const items = [DX.test(A, "ultt1"), DX.test(A, "spurling"), DX.test(A, "distraction"), romCrit];
  const pos = items.filter((x) => x === 1).length;
  const tested = items.filter((x) => x !== 0).length;
  if (!tested) return null;
  return {
    pos, tested,
    msg: pos >= 4
      ? "4 of 4 positive: very likely cervical radiculopathy (+LR about 30)."
      : pos === 3
      ? "3 of 4 positive: likely cervical radiculopathy (+LR about 6)."
      : `${pos} of ${tested} tested positive. Cluster not met.`,
  };
}

export const MCID: Record<string, { t: number; lab: string; dir: number }> = {
  nrs: { t: 2, lab: "NPRS (pain now)", dir: -1 },
  psfs: { t: 2, lab: "PSFS average", dir: 1 },
  odi: { t: 10, lab: "ODI (%)", dir: -1 },
};
