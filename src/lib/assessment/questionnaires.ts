/**
 * src/lib/assessment/questionnaires.ts
 *
 * Region-appropriate outcome measures. Each region maps to one questionnaire
 * (see OUTCOME_FOR in regions.ts); scoring follows the published formula for
 * each instrument. Ported from the Vyayama v9 clinical reference.
 */

export interface QItem {
  q: string;
  o: string[];
}

export const NDI_Q: QItem[] = [
  { q: "Pain intensity", o: ["No pain (0)", "Very mild (1)", "Moderate (2)", "Fairly severe (3)", "Very severe (4)", "Worst imaginable (5)"] },
  { q: "Personal care", o: ["Normal, no extra pain (0)", "Normal with extra pain (1)", "Painful, slow & careful (2)", "Need some help (3)", "Need daily help (4)", "Cannot self-care (5)"] },
  { q: "Lifting", o: ["Heavy weights, no extra pain (0)", "Heavy with extra pain (1)", "Cannot lift heavy from floor (2)", "Cannot lift above waist (3)", "Cannot lift above shoulder (4)", "Cannot lift at all (5)"] },
  { q: "Reading", o: ["As much as I want, no pain (0)", "As much as I want, slight pain (1)", "As much, moderate pain (2)", "Cannot read as much (3)", "Hardly at all (4)", "Cannot read at all (5)"] },
  { q: "Headaches", o: ["None (0)", "Slight, infrequent (1)", "Moderate, infrequent (2)", "Moderate, frequent (3)", "Severe, frequent (4)", "Almost always (5)"] },
  { q: "Concentration", o: ["Full concentration, no difficulty (0)", "Full concentration, slight difficulty (1)", "Fair degree of difficulty (2)", "Lots of difficulty (3)", "Great difficulty (4)", "Cannot concentrate (5)"] },
  { q: "Work", o: ["As much as I want (0)", "Usual work only (1)", "Most of usual work (2)", "Cannot do usual work (3)", "Hardly any work (4)", "No work at all (5)"] },
  { q: "Driving", o: ["No neck pain driving (0)", "Slight (1)", "Moderate (2)", "Cannot drive as long (3)", "Hardly at all (4)", "Cannot drive at all (5)"] },
  { q: "Sleeping", o: ["No trouble (0)", "Slightly disturbed <1h (1)", "Mildly disturbed 1-2h (2)", "Moderately 2-3h (3)", "Greatly 3-5h (4)", "Completely 5-7h (5)"] },
  { q: "Recreation", o: ["All activities, no neck pain (0)", "All with some pain (1)", "Most recreational activities (2)", "Few recreational activities (3)", "Hardly any (4)", "None at all (5)"] },
];

export const ODI_Q: QItem[] = [
  { q: "Pain intensity", o: ["No pain (0)", "Very mild (1)", "Moderate (2)", "Fairly severe (3)", "Very severe (4)", "Worst imaginable (5)"] },
  { q: "Personal care", o: ["Normal, no extra pain (0)", "Normal with extra pain (1)", "Painful, slow & careful (2)", "Need some help (3)", "Need help every day (4)", "Cannot dress, stay in bed (5)"] },
  { q: "Lifting", o: ["No extra pain lifting heavy (0)", "Extra pain lifting heavy (1)", "Cannot lift heavy from floor (2)", "Cannot lift heavy, can manage light (3)", "Can only lift very light (4)", "Cannot lift at all (5)"] },
  { q: "Walking", o: ["Any distance, no extra pain (0)", "Pain prevents >2km (1)", "Pain prevents >1km (2)", "Pain prevents >500m (3)", "Stick or crutches only (4)", "Bed-bound (5)"] },
  { q: "Sitting", o: ["Any chair as long as I like (0)", "Only favourite chair (1)", "Pain prevents >1 hour (2)", "Pain prevents >30 min (3)", "Pain prevents >10 min (4)", "Cannot sit at all (5)"] },
  { q: "Standing", o: ["No extra pain standing (0)", "Extra pain, not increasing (1)", "Pain prevents >1 hour (2)", "Pain prevents >30 min (3)", "Pain prevents >10 min (4)", "Cannot stand at all (5)"] },
  { q: "Sleeping", o: ["Sleep never disturbed (0)", "Occasionally disturbed (1)", "<6 hours sleep (2)", "<4 hours sleep (3)", "<2 hours sleep (4)", "Cannot sleep at all (5)"] },
  { q: "Social life", o: ["Normal, no extra pain (0)", "Normal, extra pain (1)", "Limited energetic activities (2)", "Restricts going out (3)", "Restricted to home (4)", "No social life (5)"] },
  { q: "Travelling", o: ["No pain anywhere (0)", "Extra pain, can travel (1)", "Manage >2-hour journeys (2)", "Journeys <1 hour only (3)", "<30 min only (4)", "Cannot travel (5)"] },
  { q: "Sex life", o: ["Normal, no extra pain (0)", "Normal, some extra pain (1)", "Nearly normal, painful (2)", "Severely restricted (3)", "Nearly absent (4)", "Cannot have sex (5)"] },
];

export const QDASH_Q: QItem[] = [
  { q: "Open a tight jar", o: ["No difficulty (1)", "Mild difficulty (2)", "Moderate difficulty (3)", "Severe difficulty (4)", "Unable to do (5)"] },
  { q: "Heavy household chores (washing walls/floors)", o: ["No difficulty (1)", "Mild (2)", "Moderate (3)", "Severe (4)", "Unable (5)"] },
  { q: "Carry a shopping bag or briefcase", o: ["No difficulty (1)", "Mild (2)", "Moderate (3)", "Severe (4)", "Unable (5)"] },
  { q: "Wash your back", o: ["No difficulty (1)", "Mild (2)", "Moderate (3)", "Severe (4)", "Unable (5)"] },
  { q: "Use a knife to cut food", o: ["No difficulty (1)", "Mild (2)", "Moderate (3)", "Severe (4)", "Unable (5)"] },
  { q: "Recreation requiring little effort (card games etc.)", o: ["No difficulty (1)", "Mild (2)", "Moderate (3)", "Severe (4)", "Unable (5)"] },
  { q: "Arm/shoulder/hand interfered with social activities", o: ["Not at all (1)", "Slightly (2)", "Moderately (3)", "Quite a bit (4)", "Extremely (5)"] },
  { q: "Limited in work/daily activities due to arm problem", o: ["Not limited (1)", "Slightly limited (2)", "Moderately limited (3)", "Very limited (4)", "Unable (5)"] },
  { q: "Arm, shoulder or hand pain", o: ["None (1)", "Mild (2)", "Moderate (3)", "Severe (4)", "Extreme (5)"] },
  { q: "Tingling (pins and needles) in arm/shoulder/hand", o: ["None (1)", "Mild (2)", "Moderate (3)", "Severe (4)", "Extreme (5)"] },
  { q: "Difficulty sleeping due to arm/shoulder/hand pain", o: ["No difficulty (1)", "Mild (2)", "Moderate (3)", "Severe (4)", "Could not sleep (5)"] },
];

export const HOOS_Q: QItem[] = [
  { q: "Difficulty descending stairs", o: ["None (0)", "Mild (1)", "Moderate (2)", "Severe (3)", "Extreme (4)"] },
  { q: "Difficulty putting on socks/stockings", o: ["None (0)", "Mild (1)", "Moderate (2)", "Severe (3)", "Extreme (4)"] },
  { q: "Difficulty rising from bed", o: ["None (0)", "Mild (1)", "Moderate (2)", "Severe (3)", "Extreme (4)"] },
  { q: "Difficulty sitting", o: ["None (0)", "Mild (1)", "Moderate (2)", "Severe (3)", "Extreme (4)"] },
  { q: "Difficulty bending to floor/picking up object", o: ["None (0)", "Mild (1)", "Moderate (2)", "Severe (3)", "Extreme (4)"] },
  { q: "Difficulty walking on flat surface", o: ["None (0)", "Mild (1)", "Moderate (2)", "Severe (3)", "Extreme (4)"] },
];

export const KOOS_Q: QItem[] = [
  { q: "Difficulty descending stairs", o: ["None (0)", "Mild (1)", "Moderate (2)", "Severe (3)", "Extreme (4)"] },
  { q: "Difficulty rising from bed", o: ["None (0)", "Mild (1)", "Moderate (2)", "Severe (3)", "Extreme (4)"] },
  { q: "Difficulty rising from sitting", o: ["None (0)", "Mild (1)", "Moderate (2)", "Severe (3)", "Extreme (4)"] },
  { q: "Difficulty bending to floor/picking up object", o: ["None (0)", "Mild (1)", "Moderate (2)", "Severe (3)", "Extreme (4)"] },
  { q: "Difficulty walking on flat surface", o: ["None (0)", "Mild (1)", "Moderate (2)", "Severe (3)", "Extreme (4)"] },
  { q: "Difficulty getting in/out of car", o: ["None (0)", "Mild (1)", "Moderate (2)", "Severe (3)", "Extreme (4)"] },
  { q: "Difficulty going shopping", o: ["None (0)", "Mild (1)", "Moderate (2)", "Severe (3)", "Extreme (4)"] },
];

export const FAAM_Q: QItem[] = [
  { q: "Standing", o: ["No difficulty (4)", "Slight (3)", "Moderate (2)", "Extreme (1)", "Unable (0)"] },
  { q: "Walking on even ground", o: ["No difficulty (4)", "Slight (3)", "Moderate (2)", "Extreme (1)", "Unable (0)"] },
  { q: "Walking up hills", o: ["No difficulty (4)", "Slight (3)", "Moderate (2)", "Extreme (1)", "Unable (0)"] },
  { q: "Walking down hills", o: ["No difficulty (4)", "Slight (3)", "Moderate (2)", "Extreme (1)", "Unable (0)"] },
  { q: "Going up stairs", o: ["No difficulty (4)", "Slight (3)", "Moderate (2)", "Extreme (1)", "Unable (0)"] },
  { q: "Going down stairs", o: ["No difficulty (4)", "Slight (3)", "Moderate (2)", "Extreme (1)", "Unable (0)"] },
  { q: "Walking on uneven ground", o: ["No difficulty (4)", "Slight (3)", "Moderate (2)", "Extreme (1)", "Unable (0)"] },
  { q: "Squatting", o: ["No difficulty (4)", "Slight (3)", "Moderate (2)", "Extreme (1)", "Unable (0)"] },
  { q: "Coming up on your toes", o: ["No difficulty (4)", "Slight (3)", "Moderate (2)", "Extreme (1)", "Unable (0)"] },
  { q: "Walking — first few steps", o: ["No difficulty (4)", "Slight (3)", "Moderate (2)", "Extreme (1)", "Unable (0)"] },
  { q: "Walking 5 minutes or less", o: ["No difficulty (4)", "Slight (3)", "Moderate (2)", "Extreme (1)", "Unable (0)"] },
  { q: "Walking 15 minutes or more", o: ["No difficulty (4)", "Slight (3)", "Moderate (2)", "Extreme (1)", "Unable (0)"] },
  { q: "Home responsibilities", o: ["No difficulty (4)", "Slight (3)", "Moderate (2)", "Extreme (1)", "Unable (0)"] },
  { q: "Activities of daily living", o: ["No difficulty (4)", "Slight (3)", "Moderate (2)", "Extreme (1)", "Unable (0)"] },
];

export const QUESTIONNAIRES: Record<string, { name: string; items: QItem[] }> = {
  ndi: { name: "Neck Disability Index (NDI)", items: NDI_Q },
  odi: { name: "Oswestry Disability Index (ODI)", items: ODI_Q },
  qdash: { name: "QuickDASH: arm, shoulder and hand", items: QDASH_Q },
  hoos: { name: "HOOS-PS: hip function", items: HOOS_Q },
  koos: { name: "KOOS-PS: knee function", items: KOOS_Q },
  faam: { name: "FAAM-ADL: foot and ankle", items: FAAM_Q },
};

export function parseOutVal(opt: string): number {
  const m = opt.match(/\((-?\d+)\)/);
  return m ? parseInt(m[1], 10) : 0;
}

/** Score a fully-answered questionnaire (array of the numeric values chosen). */
export function scoreQuestionnaire(key: string, arr: (number | null)[]): { score: number; label: string; text: string } | null {
  const items = QUESTIONNAIRES[key]?.items;
  if (!items) return null;
  const complete = arr.filter((v) => v != null).length === items.length;
  if (!complete) return null;
  const vals = arr as number[];
  const sum = vals.reduce((a, b) => a + b, 0);
  if (key === "ndi") {
    const p = Math.round((sum / 50) * 100);
    const label = p <= 8 ? "No disability" : p <= 28 ? "Mild" : p <= 48 ? "Moderate" : p <= 64 ? "Severe" : "Complete";
    return { score: p, label, text: `NDI: ${p}% — ${label}` };
  }
  if (key === "odi") {
    const p = Math.round((sum / 50) * 100);
    const label = p <= 20 ? "Minimal" : p <= 40 ? "Moderate" : p <= 60 ? "Severe" : p <= 80 ? "Crippling" : "Bed-bound";
    return { score: p, label, text: `ODI: ${p}% — ${label}` };
  }
  if (key === "qdash") {
    const f = vals.filter((x) => x > 0);
    if (!f.length) return { score: 0, label: "n/a", text: "QuickDASH: n/a" };
    const sc = Math.round((f.reduce((a, b) => a + b, 0) / f.length - 1) * 25);
    const label = sc <= 10 ? "Minimal" : sc <= 30 ? "Mild" : sc <= 50 ? "Moderate" : sc <= 70 ? "Severe" : "Very Severe";
    return { score: sc, label, text: `QuickDASH: ${sc}/100 — ${label}` };
  }
  if (key === "hoos") {
    const sc = Math.round(100 - (sum * 100) / 24);
    const label = sc >= 85 ? "Excellent" : sc >= 70 ? "Good" : sc >= 50 ? "Fair" : sc >= 30 ? "Poor" : "Very Poor";
    return { score: sc, label, text: `HOOS-PS: ${sc}/100 — ${label}` };
  }
  if (key === "koos") {
    const sc = Math.round(100 - (sum * 100) / 28);
    const label = sc >= 85 ? "Excellent" : sc >= 70 ? "Good" : sc >= 50 ? "Fair" : sc >= 30 ? "Poor" : "Very Poor";
    return { score: sc, label, text: `KOOS-PS: ${sc}/100 — ${label}` };
  }
  if (key === "faam") {
    const sc = Math.round((sum / 56) * 100);
    const label = sc >= 90 ? "Excellent" : sc >= 75 ? "Good" : sc >= 50 ? "Fair" : sc >= 25 ? "Poor" : "Very Poor";
    return { score: sc, label, text: `FAAM-ADL: ${sc}% — ${label}` };
  }
  return null;
}
