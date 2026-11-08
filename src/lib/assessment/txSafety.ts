/**
 * src/lib/assessment/txSafety.ts
 *
 * Compares the treatment modalities ticked for today against the patient's
 * recorded history and findings, and flags common electrophysical-agent and
 * manual-therapy precautions. Prompts for the clinician's judgement — not a
 * replacement for clinic policy. Ported from the Vyayama v9 clinical
 * reference (tx_safety.js).
 */

import type { AssessmentState, StrBoolMap, TxSafetyWarning } from "./types";
import { cadAssess } from "./redFlags";

export const TREAT_MODS = [
  "TENS", "IFT", "Ultrasound", "Hot pack", "Cold pack", "Contrast bath", "Joint mobilisation", "Manipulation",
  "Soft-tissue release", "Dry needling", "Cupping", "Kinesio taping", "Traction", "Exercise therapy", "Education", "Ergonomic advice",
];

function on(o: StrBoolMap | undefined | null): string[] {
  return Object.keys(o || {}).filter((k) => (o as StrBoolMap)[k]);
}

function reducedSensation(A: AssessmentState): string {
  const v = A.neuro?.vals || {};
  const red = Object.keys(v).some((k) => v[k] && (["R", "A"].includes(String(v[k].r)) || ["R", "A"].includes(String(v[k].l))));
  if (red) return "on the neuro screen";
  if (A.hist.pmh?.["Diabetes"] && (A.ptype?.["Numbness"])) return "diabetes with numbness";
  return "";
}

export function txSafety(A: AssessmentState, mods: StrBoolMap | undefined, hold: string[]): TxSafetyWarning[] {
  const m = on(mods);
  if (!m.length) return [];
  const out: TxSafetyWarning[] = [];
  const any = (l: string[]) => l.filter((x) => m.includes(x));
  const add = (level: "avoid" | "caution", list: string[], msg: string) => { if (list.length) out.push({ level, mods: list, msg }); };

  const pmh = A.hist.pmh || {};
  const dh = on(A.hist.dh);
  const preg = (A.ph as Record<string, unknown>)?.w_stage === "Pregnant" || !!pmh["Pregnancy"];

  if (hold.length) add("avoid", any(TREAT_MODS.filter((x) => x !== "Education")), "A red flag or referral is pending. Treat only after medical clearance; advice and education are fine.");

  if (preg) {
    add("avoid", any(["IFT", "Ultrasound", "TENS"]), "Pregnancy: no electrotherapy or ultrasound over the abdomen, pelvis or low back.");
    add("caution", any(["Dry needling", "Cupping", "Manipulation", "Traction"]), "Pregnancy: use with caution. Avoid the abdomen and low back, and avoid lying flat on the back for long after the first trimester.");
  }
  if (pmh["Cancer (current or past)"]) add("caution", any(["Ultrasound", "IFT", "TENS", "Hot pack", "Contrast bath", "Soft-tissue release", "Cupping", "Dry needling"]), "Cancer history: never apply over a known or suspected tumour, and check current treatment with the oncologist.");
  if (dh.includes("Blood thinners")) add("caution", any(["Dry needling", "Cupping", "Manipulation", "Soft-tissue release"]), "Blood thinners: bruising and bleeding risk. Use lighter pressure, avoid deep needling and avoid thrust manipulation.");
  if (pmh["Osteoporosis"] || dh.includes("Steroids (long-term)")) {
    add("avoid", any(["Manipulation"]), "Osteoporosis or long-term steroids: no high-velocity thrust manipulation.");
    add("caution", any(["Traction", "Joint mobilisation"]), "Osteoporosis or long-term steroids: low force only.");
  }
  const sens = reducedSensation(A);
  if (sens) add("caution", any(["Hot pack", "Cold pack", "Contrast bath", "TENS", "IFT", "Ultrasound"]), `Reduced sensation (${sens}): test hot/cold and sharp/blunt over the area first and check the skin during treatment.`);
  const age = parseInt(A.P.age || "", 10);
  if (!isNaN(age) && age < 18) add("caution", any(["Ultrasound", "Manipulation"]), "Under 18: no therapeutic ultrasound over open growth plates; thrust manipulation only with a clear reason.");
  if (A.C.duration === "Less than a week" && (A.ptype?.["Swelling"] || A.obs.obs?.["Swelling"])) add("caution", any(["Hot pack", "Contrast bath"]), "Recent injury with swelling: avoid heat for the first few days; cold and compression are preferred.");

  const cad = cadAssess(A);
  if (cad && A.regions.includes("cervical") && (cad.level === "High" || cad.level === "Moderate")) {
    add(cad.level === "High" ? "avoid" : "caution", any(["Manipulation", "Traction", "Joint mobilisation"]),
      cad.level === "High" ? "Neck vascular screen high concern: no neck manipulation, mobilisation or traction." : "Neck vascular screen moderate concern: avoid neck manipulation and sustained end-range positions.");
  }
  return out;
}

export function txSafetyLine(A: AssessmentState, mods: StrBoolMap | undefined, ack: boolean | undefined, hold: string[]): string {
  const w = txSafety(A, mods, hold);
  if (!w.length) return "";
  return `Safety check: ${w.map((x) => `${x.mods.join("/")} (${x.level})`).join("; ")}${ack ? "; reviewed by the clinician" : "; not yet marked reviewed"}.`;
}
