/**
 * src/lib/assessment/types.ts
 *
 * Shared, framework-agnostic types for the physiotherapy assessment engine.
 * No Prisma / Next.js imports here — these modules are imported both
 * client-side (live wizard feedback) and server-side (the authoritative
 * report builder called from POST /api/assessments).
 */

export type Region =
  | "cervical" | "thoracic" | "lumbar" | "shoulder" | "elbow"
  | "wrist" | "hip" | "knee" | "ankle";

export type PathwayId =
  | "gen" | "quick" | "desk" | "corp" | "sport" | "kids" | "women"
  | "senior" | "preop" | "postop" | "neuro" | "chronic";

export type StrBoolMap = Record<string, boolean>;
export type StrStrMap = Record<string, string>;
export type AnyRecord = Record<string, unknown>;

export interface PatientInfo {
  name?: string;
  age?: string;
  gender?: string;
  phone?: string;
  occupation?: string;
  occNote?: string;
  work?: string;
  workDetails?: string;
  activity?: string;
  visit?: "first" | "review" | "discharge";
  date?: string;
  referredBy?: string;
  howFound?: string;
  doctorReg?: string;
  abha?: string;
  therapist?: string;
  payer?: string;
  language?: "English" | "Kannada" | "Marathi" | "Hindi";
  guardianName?: string;
  guardianRelationship?: string;
}

export interface ConsentRecord {
  granted: boolean;
  at: string;
  by: string;
  relationship?: string;
}

export interface ChiefComplaint {
  chief?: string;
  duration?: string;
  onset?: string;
  agg?: StrBoolMap;
  ease?: StrBoolMap;
  aggNote?: string;
  prev?: string;
  goals?: string;
  sleep?: number | null;
  stress?: number | null;
  act?: number | null;
  mechanism?: string;
  pc?: StrBoolMap;
  side?: string;
  course?: string;
  prevEp?: string;
  mech?: StrBoolMap;
  tx?: StrBoolMap;
  txResp?: string;
  goalsSel?: StrBoolMap;
}

export interface HistoryInfo {
  pmh?: StrBoolMap;
  meds?: string;
  imaging?: string;
  imgFind?: string;
  pmhNote?: string;
  blood?: StrStrMap;
  dh?: StrBoolMap;
  nmeds?: string;
  fh?: StrBoolMap;
}

export interface RomEntry {
  a?: number | string | null;
  p?: number | string | null;
  ar?: number | string | null;
  al?: number | string | null;
  pr?: number | string | null;
  pl?: number | string | null;
  ef?: string;
  pain?: boolean;
}

export interface StrengthEntry {
  l?: number | null;
  r?: number | null;
  s?: number | null;
}

export interface TightEntry {
  l?: number | null;
  r?: number | null;
  s?: number | null;
}

export interface TestResultEntry {
  r?: "POS" | "NEG" | "NT" | null;
  l?: "POS" | "NEG" | "NT" | null;
  s?: "POS" | "NEG" | "NT" | null;
}

export interface MovEntry {
  q?: "G" | "F" | "P" | null;
  f?: StrBoolMap;
  note?: string;
}

export interface NeuroVal {
  r?: string | number | null;
  l?: string | number | null;
}

export interface NeuroState {
  showU?: boolean | null;
  showL?: boolean | null;
  vals: Record<string, NeuroVal>;
}

export interface PalpEntry {
  g?: number | null;
  side?: "R" | "L" | "Both";
}

export interface ObsState {
  obs?: StrBoolMap;
  posture?: StrBoolMap;
  gait?: StrBoolMap;
  note?: string;
}

export interface VitalsState {
  sys?: string;
  dia?: string;
  hr?: string;
  ht?: string;
  wt?: string;
}

export interface VyayamaReasoning {
  samsparsa?: string;
  prana?: string;
  akriti?: string;
  sakti?: string;
  punarutthana?: string;
  posture?: number | null;
  breath?: "diaphragm" | "upper" | "hold" | "";
  load?: string;
  impression?: string;
  keyDrivers?: string;
  stage?: string;
}

export interface ZonePain {
  nrs: number;
  q?: string; // pain quality, e.g. "Aching", "Burning"
}

export interface PsfsItem {
  a: string;
  s: number | null;
}

export interface GoalItem {
  t: string;
  m: string;
  by: string;
}

export interface MeasuredTestTrialData {
  r?: (string | null)[];
  l?: (string | null)[];
  s?: (string | null)[];
  it?: (number | null)[];
  dist?: number;
  inv?: StrStrMap;
  assist?: string;
  mod?: string;
  stop?: string;
  sym?: StrBoolMap;
  nt?: string;
  sel?: boolean;
}

export interface MmtMeta {
  fr?: string;
  fl?: string;
  pos?: string;
  sub?: StrBoolMap;
  conf?: string;
}

export interface SinState {
  sev?: string;
  irr?: string;
  nature?: string;
}

export interface CadState {
  risk?: StrBoolMap;
  signs?: StrBoolMap;
  done?: boolean;
}

export interface CcrState {
  used?: boolean;
  high?: StrBoolMap;
  low?: StrBoolMap;
  rot?: "yes" | "no" | "";
}

export interface IceState {
  idea?: string;
  concern?: StrBoolMap;
  expect?: StrBoolMap;
}

export interface BreathState {
  pattern?: StrBoolMap;
  rr?: string;
  cp?: string;
  hilo?: string;
}

export interface TreatState {
  mods?: StrBoolMap;
  params?: string;
  resp?: string;
  ack?: boolean;
}

export interface ProgState {
  prognosis?: string;
  freq?: string;
  weeks?: string;
}

export interface PgmState {
  region?: string;
  noFloor?: boolean;
  noBand?: boolean;
  off?: Record<string, boolean>;
}

/**
 * The full doctor-filled assessment state. Persisted verbatim as the
 * `assessmentData` JSON blob on PatientAssessment; the authoritative
 * report (dx, programme, pillars, etc.) is always recomputed from this,
 * never trusted from the client.
 */
export interface AssessmentState {
  P: PatientInfo;
  path: PathwayId;
  flags: StrBoolMap;
  referralAck?: boolean;
  referTo?: string;
  zones: Record<string, ZonePain>;
  nrs: number | null;
  nrsW?: number | null;
  nrsB?: number | null;
  ptype?: StrBoolMap;
  ppattern?: StrBoolMap;
  C: ChiefComplaint;
  hist: HistoryInfo;
  cq: StrStrMap;
  sin: SinState;
  psfs: PsfsItem[];
  selfEff?: number | null;
  obs: ObsState;
  regions: Region[];
  palp: Record<string, PalpEntry>;
  tissue?: StrBoolMap;
  palpNote?: string;
  rom: Record<string, RomEntry>;
  mdt?: StrStrMap;
  str: Record<string, StrengthEntry>;
  tight: StrBoolMap;
  mmt?: Record<string, MmtMeta>;
  neuro: NeuroState;
  tests: Record<string, TestResultEntry>;
  mov: Record<string, MovEntry>;
  fx: Record<string, MeasuredTestTrialData>;
  vy: VyayamaReasoning;
  pt: Record<string, number | null>;
  out: Record<string, (number | null)[]>;
  groc?: number | null;
  spec?: AnyRecord;
  dx: { picked: Record<string, boolean>; custom?: string; edited?: StrBoolMap };
  vitals: VitalsState;
  cad: CadState;
  ccr: CcrState;
  sbt?: Record<string, "D" | "A" | string>;
  kmsk?: string;
  safetyNet?: boolean;
  goals: GoalItem[];
  prog: ProgState;
  plan?: string;
  pgm?: PgmState;
  notes?: StrStrMap;
  breath?: BreathState;
  thermo?: string;
  treat?: TreatState;
  ph: AnyRecord; // pathway-specific history answers
  pe: AnyRecord; // pathway-specific exam answers
  sh?: Record<string, unknown>; // social history
  ice?: IceState;
  yf?: StrBoolMap; // yellow (psychosocial) flags
  pcons?: StrBoolMap; // pathway "conditions to consider" ticks
  kit?: StrBoolMap; // extra equipment available at the clinic

  // ── Session tracking / reassessment ───────────────────────────────────────
  sessions?: SessionNote[];
  sdraft?: SessionNote;
  baseline?: BaselineSnapshot | null;

  reviewed?: boolean;
  consents?: Record<string, ConsentRecord>;
}

export interface SessionNote {
  id: number;
  n: number; // session number
  date: string;
  therapist: string;
  nrsPre: number | null;
  nrsPost: number | null;
  phase: PhaseId | "";
  mods: StrBoolMap; // treatment modalities used
  params?: string;
  ex: StrBoolMap; // exercises done today
  hep?: string; // home programme adherence
  resp?: string; // response to session
  adverse?: string;
  notes?: string;
  next?: string;
  ack?: boolean; // treatment-safety warnings reviewed
  addenda?: Array<{ at: string; by: string; text: string }>;
  retest?: Record<string, MeasuredTestTrialData>;
}

export interface BaselineSnapshot {
  date: string;
  nrs: number | null;
  psfs: number | null;
  mob: number | null;
  outcomes: Record<string, number | null>;
  fx?: Record<string, {
    values: Partial<Record<"r" | "l" | "s", number>>;
    protocol?: string;
    assist?: string;
    modification?: string;
    distance?: number;
  }>;
  from?: string; // id of the saved assessment this baseline came from
}

export interface DxCriterion {
  t: string; // description shown to the clinician
  w: number; // weight
  f: (A: AssessmentState) => number; // -1..1
  consider?: string; // test id worth running
}

export interface ConditionDef {
  id: string;
  r: Region | "any";
  n: string;
  icd: string;
  icd11?: string;
  icf?: string;
  refer?: string;
  c: DxCriterion[];
}

export interface DxResult {
  id: string;
  name: string;
  icd: string;
  icd11: string;
  icf: string;
  refer: string;
  region: Region | "any";
  fit: number;
  sup: string[];
  against: string[];
  consider: string[];
  answered: number;
  total: number;
}

export interface RedFlagItem {
  id: string;
  label: string;
  key?: boolean;
  g: string;
  serious?: boolean;
}

export interface RedFlagGroupResult {
  id: string;
  n: string;
  level: "None" | "Low" | "Moderate" | "Urgent watch" | "High" | "Emergency";
  ticked: RedFlagItem[];
  action: string;
}

export type PhaseId = "calm" | "heal" | "mobilise" | "strengthen" | "flourish";

export interface Exercise {
  t: string; // exercise type code, e.g. "ISO", "CE", "FUNC"
  n: string; // name
  d: string; // dose
  c: string; // coaching cue
  why: string; // how it helps
  floor?: boolean;
  band?: boolean;
  off?: boolean;
  custom?: boolean;
  multi?: boolean;
  link?: string;
}

export interface PhaseContent {
  goal: string;
  move: string;
  pain: string;
  load: string;
  clinic: Exercise[];
  home: Exercise[];
}

export interface RegionProgramme {
  region: string;
  phases: Record<PhaseId, PhaseContent>;
  avoid: string[];
  cautions: string[];
}

export interface PathwayTreatment {
  focus: string[];
  dose: string;
  edu: string[];
  cautions: string[];
  avoid: string[];
  avoidRe?: RegExp | null;
  src: string[];
}

export interface MeasuredTestDef {
  id: string;
  n: string;
  cat: string;
  cls: "Quantified" | "Grade" | "Observation" | "PRO";
  kind: "num" | "scale" | "items" | "gait";
  u?: string;
  bi: boolean;
  trials?: number;
  agg?: "best" | "mean" | "first";
  dir: number; // 1 higher better, -1 lower better, 0 no direction
  purpose: string;
  protocol: string;
  equip: string[];
  pos: string;
  safety: string;
  limits: string;
  opts?: string[];
  items?: string[];
  itemOpts?: string[];
  max?: number;
  dists?: number[];
  regions?: Region[] | null;
  paths?: PathwayId[];
  load?: "low" | "mod" | "high";
  equipReq?: string;
}

export interface ReportResult {
  schemaVersion: 2;
  impressions: Array<{
    likelihood: string;
    dx: string;
    icd10: string;
    icd11: string;
    icf: string;
    fit: number | null;
    why: string;
    further: string;
    refer: boolean;
    referNote: string;
  }>;
  assessment: string; // SOAP "A"
  plan: string; // SOAP "P"
  subjective: string; // SOAP "S"
  objective: string; // SOAP "O"
  loadClass: string;
  stage: string;
  irritability: string;
  pathway: PathwayId;
  redFlags: RedFlagGroupResult[];
  hold: string[]; // non-empty => programme withheld pending referral
  pillars: ReturnType<typeof import("./pillars").calcPillars> | null;
  programmes: RegionProgramme[];
  pathwayProgramme: RegionProgramme | null;
  pathwayTreatment: PathwayTreatment | null;
  rootCauses: Array<{ t: string; why: string; fix: string }>;
  lifestyle: Array<{ h: string; items: string[] }>;
  ergonomics: Array<{ h: string; items: string[] }>;
  outcomeMeasures: Record<string, { label: string; score: number | null; text: string }>;
  investmentPlan: { id: string; name: string; sessions: number; price: number } | null;
  patientStory: string;
  whatsapp: string;
  doctorLetter: string;
  sessionSummary: string;
  cautions: string[];
  avoid: string[];
  progress: ProgressRow[];
  groc: number | null;
  stressPlan: { high: boolean; sections: Array<{ h: string; items: string[] }> } | null;
  thermo: { id: string; name: string; how: string; why: string; caution: boolean } | null;
  txSafety: TxSafetyWarning[];
}

export interface ProgressRow {
  key: string;
  label: string;
  base: number | null;
  now: number | null;
  change: number | null;
  better: boolean | null;
  mcid: number | null;
  met: boolean | null;
}

export interface TxSafetyWarning {
  level: "avoid" | "caution";
  mods: string[];
  msg: string;
}
