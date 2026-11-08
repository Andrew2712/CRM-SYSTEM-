"use client";

/**
 * src/app/dashboard/assessment/page.tsx
 *
 * Doctor-facing physiotherapy assessment wizard, built on the shared
 * deterministic clinical engine in src/lib/assessment/*. The same engine
 * functions run here (for live feedback as the clinician fills the form)
 * and on the server inside POST /api/assessments (the authoritative,
 * persisted report) — nothing computed here is trusted blindly by the
 * backend; it recomputes everything from the saved assessmentData.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Button, Card, CardHeader, CardBody, Input, Textarea, Select, Badge, SectionHeader, Spinner, PageWrapper, tokens,
} from "@/components/ui";

import type { AssessmentState, ConsentRecord, PathwayId, Region } from "@/lib/assessment/types";
import { createInitialState } from "@/lib/assessment/state";
import {
  REGIONS, regionName, TESTS, ROM, END_FEEL, PALP, TISSUE, OBS_ITEMS, POSTURE, GAIT,
  STR_MUSCLES, TIGHT_MUSCLES, MPATS, MOV_FAULTS, NEURO_U, NEURO_L, SENS_OPTS, OUTCOME_FOR,
} from "@/lib/assessment/regions";
import { runDx, pickedDx, fitWord } from "@/lib/assessment/dx";
import { RF_GROUPS, rfAssess, cadAssess, ccrAssess, CAD_RISK, CAD_SIGNS, CCR_HIGH, CCR_LOW, STARTBACK, STARTBACK_Q9, startBack, keeleMsk, RISK_ADVICE } from "@/lib/assessment/redFlags";
import { calcPillars } from "@/lib/assessment/pillars";
import { QUESTIONNAIRES, scoreQuestionnaire } from "@/lib/assessment/questionnaires";
import { fullProgramme, pgmRegions } from "@/lib/assessment/exercises";
import { PATHWAYS, pathOf, PATH_HX, PATH_EXAM, PATH_CONS, pathTx, pathProgramme, pathFlags } from "@/lib/assessment/pathways";
import type { PathQuestion } from "@/lib/assessment/pathways";
import { buildReport, holdLoading } from "@/lib/assessment/reportBuilder";
import { suggestThermo, THERMO, bmi, bmiBand, BLOOD_TESTS } from "@/lib/assessment/education";
import { TREAT_MODS, txSafety } from "@/lib/assessment/txSafety";
import { newSession, snapshot, sessionText, HEP_ADH, RESP_OPTS, ADVERSE_OPTS } from "@/lib/assessment/sessions";
import type { SessionNote } from "@/lib/assessment/types";
import BodyMap from "@/components/assessment/BodyMap";
import {
  FX, FXI, FX_CATS, EXTRA_KIT, fxResult, fxFmt, fxSides, fxInterp, fxLSI,
} from "@/lib/assessment/measuredTests";
import type { MeasuredTestDef, MeasuredTestTrialData } from "@/lib/assessment/types";
import { PATIENT_LANGUAGES, patientCopy } from "@/lib/assessment/patientContent";

interface CRMPatient { id: string; name: string; phone?: string; age?: number | null }

const STEPS = [
  { k: "patient", nm: "Patient & pathway" },
  { k: "safety", nm: "Safety screen" },
  { k: "story", nm: "Pain & story" },
  { k: "history", nm: "History & screening" },
  { k: "exam", nm: "Objective examination" },
  { k: "tests", nm: "Measured tests" },
  { k: "forms", nm: "Questionnaires & pillars" },
  { k: "dx", nm: "Provisional diagnosis" },
  { k: "plan", nm: "Plan & programme" },
  { k: "report", nm: "Report" },
] as const;

const ICE_IDEA = ["Muscle strain", "Disc or nerve problem", "Arthritis / wear and tear", "Posture", "Something serious", "Not sure"];
const ICE_CONCERNS = [
  "Something serious", "Needing surgery", "It will keep getting worse", "Missing work",
  "Not being able to play sport", "Not being able to care for family", "Scan findings", "No particular worry",
];
const ICE_EXPECT = [
  "An explanation", "Pain relief", "An exercise plan", "Hands-on treatment",
  "Return to sport", "Advice for work", "A scan or referral", "A quick fix",
];
const YELLOW_FLAGS = [
  "Fears movement will cause harm", "Expects the pain to be permanent", "Low mood", "High stress or anxiety", "Poor sleep",
  "Problems or dissatisfaction at work", "Avoiding activities", "Relies only on passive treatment", "Pending claim or dispute", "Little support at home",
];
const BREATH_PATTERNS = ["Normal diaphragmatic", "Upper-chest dominant", "Paradoxical (belly in on inhale)", "Mouth breathing", "Breath-holding / bracing", "Frequent sighing or yawning"];
const PAIN_TYPES = ["Aching", "Sharp", "Burning", "Tingling", "Numbness", "Stiffness", "Throbbing", "Catching / sudden lock", "Pulling (\"nerve pulling\")", "Heaviness"];
const PAIN_PATTERNS = ["Morning stiffness under 30 min", "Morning stiffness over 30 min", "Worse at end of day", "Wakes at night when turning", "Constant", "Comes and goes"];
const COURSE_OPTS = ["Getting better", "Staying the same", "Getting worse", "Comes and goes"];
const PREV_EP_OPTS = ["First episode", "Had it before and recovered", "Keeps coming back (3+ episodes)"];
const MECH_OPTS = [
  "Lifting", "Fall", "Sports injury", "Road accident", "Sudden twist or movement", "Repetitive work",
  "Long sitting or screen time", "Increase in training or activity", "Pregnancy or childbirth", "Surgery", "Illness or fever", "No clear cause",
];
const TX_SOFAR = [
  "Nothing yet", "Painkillers", "Anti-inflammatories", "Muscle relaxants", "Injection",
  "Physiotherapy before", "Massage or oil therapy", "Ayurvedic / homeopathy", "Brace, belt or collar", "Yoga", "Surgery",
];
const PMH = [
  "Diabetes", "High blood pressure", "Thyroid", "Osteoporosis", "Vitamin D deficiency", "Vitamin B12 deficiency", "Anaemia",
  "Rheumatoid / inflammatory arthritis", "Gout / high uric acid", "Heart condition", "TB (past or current)", "Recent chikungunya or dengue",
  "PCOS", "Previous surgery here", "Previous injury here", "Pregnancy", "Pacemaker or implanted device", "Metal implant in the treatment area",
  "Cancer (current or past)", "Bleeding disorder", "Epilepsy", "None",
];
const DRUG_HISTORY = [
  "None", "Painkillers (paracetamol)", "Anti-inflammatories (NSAIDs)", "Blood thinners", "Steroids (long-term)",
  "Diabetes tablets or insulin", "Blood pressure medicines", "Thyroid medicine", "Cholesterol (statins)",
  "Antidepressants / nerve-pain medicines", "Sleeping tablets", "Hormonal (contraceptive / HRT)", "Osteoporosis medicines",
  "Ayurvedic / homeopathic", "Supplements (vitamin D, B12, calcium)",
];
const MEDS_COUNT = ["None", "1–3 medicines", "4 or more medicines"];
const FAMILY_HISTORY = [
  "None known", "Osteoarthritis", "Rheumatoid / inflammatory arthritis", "Ankylosing spondylitis or psoriasis",
  "Osteoporosis or fractures", "Diabetes", "Heart disease", "Cancer", "Neurological condition",
];
const SH_LIVES_WITH = ["Alone", "Spouse / partner", "Family", "Friends / PG / hostel", "Care home"];
const SH_AT_HOME = ["Stairs, no lift", "Lift available", "Indian-style toilet", "Western toilet", "Sits or sleeps on the floor", "Young children at home", "Cares for an elderly relative", "Pets"];
const SH_GETS_AROUND = ["Two-wheeler", "Car", "Auto / cab", "Bus / metro", "Walking", "Works from home"];
const SH_SCREEN_TIME = ["Under 1 hour", "1–2 hours", "2–4 hours", "Over 4 hours"];
const SH_EXERCISE_DAYS = ["0", "1–2", "3–4", "5 or more"];
const SH_SLEEP = ["Under 5 hours", "5–6 hours", "7–8 hours", "Over 8 hours"];
const SH_DIET = ["Vegetarian", "Eggetarian", "Non-vegetarian", "Vegan", "Jain"];
const SH_TOBACCO = ["Never", "Stopped", "Smokes", "Chews tobacco"];
const SH_ALCOHOL = ["None", "Occasional", "Weekly", "Most days"];
const SAFETY_NET_SCRIPT = "If you notice numbness between your legs or around your bottom, difficulty passing urine or controlling your bladder or bowels, or numbness during sex, go to the emergency department straight away. Do not wait for your next appointment.";

function on(o: Record<string, boolean> | undefined | null): string[] {
  return Object.keys(o || {}).filter((k) => (o as Record<string, boolean>)[k]);
}
function tog(o: Record<string, boolean> | undefined, x: string): Record<string, boolean> {
  return { ...(o || {}), [x]: !(o || {})[x] };
}

function FxTestCard({ A, t, d, onUpdate }: {
  A: AssessmentState;
  t: MeasuredTestDef;
  d: MeasuredTestTrialData;
  onUpdate: (next: MeasuredTestTrialData) => void;
}) {
  const [open, setOpen] = useState(false);
  const sides = fxSides(t);
  const sideLabel: Record<string, string> = { r: "Right", l: "Left", s: "" };

  function setTrial(side: "r" | "l" | "s", i: number, v: string) {
    const arr = [...(d[side] || [])];
    arr[i] = v === "" ? null : v;
    onUpdate({ ...d, [side]: arr });
  }
  function setItem(i: number, v: string) {
    const arr = [...(d.it || [])];
    arr[i] = v === "" ? null : Number(v);
    onUpdate({ ...d, it: arr });
  }

  return (
    <div className="p-4 rounded-2xl" style={{ background: tokens.surfaceAlt, border: `1px solid ${tokens.border}` }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-bold text-sm">{t.n}</div>
          <div className="text-xs" style={{ color: tokens.textMuted }}>{t.purpose}</div>
        </div>
        <button type="button" className="text-xs font-semibold shrink-0" style={{ color: tokens.accent }} onClick={() => setOpen((o) => !o)}>
          {open ? "Hide protocol" : "Protocol"}
        </button>
      </div>
      {open && (
        <div className="mt-2 text-xs space-y-1" style={{ color: tokens.textSecondary }}>
          <div><b>Protocol:</b> {t.protocol}</div>
          <div><b>Position:</b> {t.pos}</div>
          <div><b>Equipment:</b> {t.equip.join(", ") || "None"}</div>
          <div style={{ color: tokens.warning }}><b>Safety:</b> {t.safety}</div>
          <div style={{ color: tokens.textMuted }}><b>Limits:</b> {t.limits}</div>
        </div>
      )}

      {t.kind === "gait" && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span style={{ color: tokens.textSecondary }}>Timed distance:</span>
          <Select value={String(d.dist || "")} onChange={(e) => onUpdate({ ...d, dist: e.target.value ? Number(e.target.value) : undefined })}
            className="w-28" options={["", ...(t.dists || []).map(String)].map((x) => ({ value: x, label: x ? `${x} m` : "Choose…" }))} />
        </div>
      )}

      {(t.kind === "num" || t.kind === "gait") && (
        <div className="mt-3 flex flex-col gap-2">
          {sides.map((side) => (
            <div key={side} className="flex items-center gap-2 flex-wrap">
              {sideLabel[side] && <span className="text-xs font-semibold w-12" style={{ color: tokens.textMuted }}>{sideLabel[side]}</span>}
              {Array.from({ length: t.trials || 1 }, (_, i) => (
                <Input key={i} type="number" placeholder={`Trial ${i + 1}`} className="w-28"
                  value={(d[side]?.[i] as string) || ""} onChange={(e) => setTrial(side, i, e.target.value)} />
              ))}
              {t.u && <span className="text-xs" style={{ color: tokens.textMuted }}>{t.u}</span>}
            </div>
          ))}
        </div>
      )}

      {t.kind === "scale" && (
        <div className="mt-3 flex flex-col gap-2">
          {sides.map((side) => (
            <div key={side} className="flex items-center gap-2">
              {sideLabel[side] && <span className="text-xs font-semibold w-12" style={{ color: tokens.textMuted }}>{sideLabel[side]}</span>}
              <Select value={(d[side]?.[0] as string) || ""} onChange={(e) => setTrial(side, 0, e.target.value)} className="w-56"
                options={["", ...(t.opts || []).map((_, i) => String(i))].map((v) => ({ value: v, label: v === "" ? "Choose…" : t.opts![Number(v)] }))} />
            </div>
          ))}
        </div>
      )}

      {t.kind === "items" && (
        <div className="mt-3 flex flex-col gap-2">
          {(t.items || []).map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-3 text-sm">
              <span>{item}</span>
              <Select value={d.it?.[i] != null ? String(d.it![i]) : ""} onChange={(e) => setItem(i, e.target.value)} className="w-40"
                options={["", ...(t.itemOpts || []).map((_, idx) => String(idx))].map((v) => ({ value: v, label: v === "" ? "–" : t.itemOpts![Number(v)] }))} />
            </div>
          ))}
        </div>
      )}

      <Input placeholder="Notes (e.g. assistance used, stopped early)" className="mt-3" value={d.assist || ""} onChange={(e) => onUpdate({ ...d, assist: e.target.value })} />

      {sides.map((side) => {
        const r = fxResult(t, d, side);
        if (r.status === "none") return null;
        const interp = r.v != null ? fxInterp(t, r.v, A, d.assist) : null;
        return (
          <div key={side} className="mt-2 text-xs">
            <span className="font-bold">{sideLabel[side] ? `${sideLabel[side]}: ` : ""}{fxFmt(t, r)}</span>
            {interp?.applies && <span className="ml-2" style={{ color: interp.flag ? tokens.error : tokens.textSecondary }}>{interp.txt}</span>}
          </div>
        );
      })}
      {t.bi && (() => { const lsi = fxLSI(t, d, A); return lsi ? <div className="mt-1 text-xs font-semibold" style={{ color: lsi.below90 || lsi.diff ? tokens.warning : tokens.success }}>{lsi.txt}</div> : null; })()}
    </div>
  );
}

export default function AssessmentPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [A, setA] = useState<AssessmentState>(() => createInitialState());
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [reportTab, setReportTab] = useState<"summary" | "soap" | "programme" | "lifestyle" | "patient" | "sessions">("summary");
  const [whatsappDraft, setWhatsappDraft] = useState<string | null>(null);
  const [letterDraft, setLetterDraft] = useState<string | null>(null);
  const [extraOutcomes, setExtraOutcomes] = useState<string[]>([]);
  const [retestPick, setRetestPick] = useState<string>("");
  const [addendumDraft, setAddendumDraft] = useState<Record<number, string>>({});
  const [patientEntryMode, setPatientEntryMode] = useState(false);
  const [priorAssessments, setPriorAssessments] = useState<Array<{ id: string; createdAt: string; pathway: string | null; primaryComplaint: string | null; status: string }>>([]);
  const [priorAssessmentLoading, setPriorAssessmentLoading] = useState(false);

  const [linkedPatientId, setLinkedPatientId] = useState<string>(searchParams.get("patientId") ?? "");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<CRMPatient[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const isMinor = Number(A.P.age) > 0 && Number(A.P.age) < 18;
  const requiredConsentIds = ["privacy", "assessment"];
  const consentActor = isMinor ? A.P.guardianName : A.P.name;
  const consentReady = !!consentActor?.trim() && requiredConsentIds.every((id) => A.consents?.[id]?.granted && A.consents?.[id]?.by === consentActor) &&
    (!isMinor || !!A.P.guardianRelationship?.trim());

  useEffect(() => {
    if (authStatus === "authenticated" && session?.user?.role === "PATIENT") router.replace("/patient/dashboard");
  }, [authStatus, session, router]);

  useEffect(() => {
    function h(e: MouseEvent) { if (searchRef.current && !searchRef.current.contains(e.target as Node)) setPatientResults([]); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const prefilledId = searchParams.get("patientId");
    if (!prefilledId || patientSearch) return;
    (async () => {
      try {
        const res = await fetch(`/api/patients/${prefilledId}`);
        if (!res.ok) return;
        const json = await res.json();
        const pt: CRMPatient | undefined = json.id ? json : json.patient;
        if (pt?.name) {
          setPatientSearch(pt.name);
          setA((a) => ({ ...a, P: { ...a.P, name: pt.name, phone: pt.phone ?? a.P.phone, age: pt.age != null ? String(pt.age) : a.P.age } }));
        }
      } catch { /* ignore */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (patientSearch.length < 2) { setPatientResults([]); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/patients?search=${encodeURIComponent(patientSearch)}&limit=8`);
        const data = await res.json();
        setPatientResults(data.data ?? data.patients ?? []);
      } catch { setPatientResults([]); }
      finally { setSearchLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  useEffect(() => {
    if (!linkedPatientId) { setPriorAssessments([]); return; }
    let active = true;
    setPriorAssessmentLoading(true);
    fetch(`/api/assessments?patientId=${encodeURIComponent(linkedPatientId)}&limit=50`)
      .then((res) => res.ok ? res.json() : Promise.reject(new Error("Could not load prior assessments")))
      .then((data) => { if (active) setPriorAssessments(data.assessments || []); })
      .catch(() => { if (active) setPriorAssessments([]); })
      .finally(() => { if (active) setPriorAssessmentLoading(false); });
    return () => { active = false; };
  }, [linkedPatientId]);

  const set = <K extends keyof AssessmentState>(k: K, v: AssessmentState[K]) => setA((a) => ({ ...a, [k]: v }));
  const setIn = <K extends keyof AssessmentState>(k: K, sub: string, v: unknown) =>
    setA((a) => ({ ...a, [k]: { ...(a[k] as object), [sub]: v } }));
  const togIn = <K extends keyof AssessmentState>(k: K, sub: string) =>
    setA((a) => {
      const cur = (a[k] as Record<string, boolean>) || {};
      return { ...a, [k]: { ...cur, [sub]: !cur[sub] } };
    });
  const togDeep = (k: keyof AssessmentState, group: string, item: string) =>
    setA((a) => {
      const outer = (a[k] as Record<string, Record<string, boolean>>) || {};
      return { ...a, [k]: { ...outer, [group]: tog(outer[group], item) } };
    });

  const path = pathOf(A);
  const rfa = useMemo(() => rfAssess(A), [A.flags]);
  const rfMax = Math.max(0, ...rfa.map((g) => ({ None: 0, Low: 1, Moderate: 2, "Urgent watch": 2, High: 3, Emergency: 4 }[g.level])));
  const serious = rfMax >= 3;
  const dxList = useMemo(() => runDx(A), [A]);
  const picked = useMemo(() => pickedDx(A), [A]);
  const pillars = useMemo(() => calcPillars(A), [A]);
  const hold = useMemo(() => holdLoading(A), [A]);
  const regions = useMemo(() => pgmRegions(A), [A]);
  const pFlags = useMemo(() => pathFlags(A), [A]);
  const outcomeKeys = useMemo(() => [...new Set(A.regions.map((r) => OUTCOME_FOR[r]).filter(Boolean))], [A.regions]);
  const report = useMemo(() => buildReport(A), [A]);

  function choosePath(id: PathwayId) {
    setA((a) => ({ ...a, path: id }));
  }

  async function saveAssessment(status: "DRAFT" | "PUBLISHED") {
    if (status === "PUBLISHED" && !consentReady) {
      setSaveMsg("Record the privacy and assessment consent first. For a patient under 18, add guardian details and consent.");
      setStep(0);
      return;
    }
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: linkedPatientId || null, assessmentData: A, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSavedId(data.assessment.id);
      setSaveMsg(status === "PUBLISHED" ? "Published to the patient." : "Saved as draft.");
    } catch (e) {
      setSaveMsg(`⚠ ${e instanceof Error ? e.message : "Save failed"}`);
    } finally {
      setSaving(false);
    }
  }

  function recordConsent(id: string, granted: boolean, by?: string, relationship?: string) {
    const actor = by || (isMinor ? A.P.guardianName : A.P.name) || A.P.therapist || session?.user?.name || "Clinician";
    const record: ConsentRecord = { granted, at: new Date().toISOString(), by: actor, ...(relationship ? { relationship } : {}) };
    setA((a) => ({ ...a, consents: { ...(a.consents || {}), [id]: record } }));
  }

  async function loadPriorAssessment(id: string) {
    if (!id) { set("baseline", null); return; }
    try {
      const res = await fetch(`/api/assessments/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load that assessment");
      const prior = data.assessment?.assessmentData as AssessmentState | undefined;
      if (!prior) throw new Error("The selected assessment has no saved clinical data");
      const from = snapshot(prior);
      set("baseline", { ...from, from: id });
      setSaveMsg(`Comparison baseline set from ${prior.P?.date || new Date(data.assessment.createdAt).toLocaleDateString("en-IN")}.`);
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Could not load that assessment");
    }
  }

  function exportAssessment() {
    const payload = { format: "vyayama-assessment", version: 1, exportedAt: new Date().toISOString(), patientId: linkedPatientId || null, assessmentData: A };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${(A.P.name || "assessment").trim().replace(/[^a-z0-9-_]+/gi, "-")}-assessment-backup.json`; a.click();
    URL.revokeObjectURL(url);
  }

  async function importAssessment(file?: File) {
    if (!file) return;
    if (file.size > 1_000_000) { setSaveMsg("Backup file is too large (maximum 1 MB)."); return; }
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed?.format === "vyayama-assessment" && parsed.version !== 1) throw new Error("This backup version is not supported by this assessment module.");
      const state = parsed?.format === "vyayama-assessment" ? parsed.assessmentData : parsed?.assessmentData || parsed;
      if (!state || typeof state !== "object" || !state.P || !state.C || !state.regions) throw new Error("This file is not a valid assessment backup.");
      setA({ ...createInitialState(), ...state });
      setLinkedPatientId(typeof parsed.patientId === "string" ? parsed.patientId : "");
      setStep(0);
      setSaveMsg("Backup loaded into the form. Review it, then save it to the clinic record.");
    } catch (e) { setSaveMsg(e instanceof Error ? e.message : "Could not read the backup file."); }
  }

  // ── small render helpers ──────────────────────────────────────────────────
  function chips(list: string[], state: Record<string, boolean> | undefined, onTap: (x: string) => void) {
    return (
      <div className="flex flex-wrap gap-2">
        {list.map((x) => {
          const active = !!(state || {})[x];
          return (
            <button key={x} type="button" onClick={() => onTap(x)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
              style={active
                ? { background: tokens.primary, color: "#fff", borderColor: tokens.primary }
                : { background: tokens.surface, color: tokens.textSecondary, borderColor: tokens.border }}>
              {x}
            </button>
          );
        })}
      </div>
    );
  }
  function oneOf(list: string[], val: string | undefined, onPick: (x: string) => void) {
    return chips(list, Object.fromEntries(list.map((x) => [x, x === val])), (x) => onPick(val === x ? "" : x));
  }
  function label(t: string, sub?: string) {
    return (
      <div className="text-[11px] font-bold uppercase tracking-widest mb-1.5 mt-4" style={{ color: tokens.textSecondary }}>
        {t}{sub && <span className="ml-2 font-medium normal-case text-[11px]" style={{ color: tokens.textMuted }}>{sub}</span>}
      </div>
    );
  }
  function regionPicker() {
    return chips(REGIONS.map((r) => r.lb), Object.fromEntries(REGIONS.map((r) => [r.lb, A.regions.includes(r.id)])),
      (lb) => {
        const r = REGIONS.find((x) => x.lb === lb)!.id;
        setA((a) => ({ ...a, regions: a.regions.includes(r) ? a.regions.filter((x) => x !== r) : [...a.regions, r] }));
      });
  }
  function setMatrix(storeKey: "ph" | "pe", q: PathQuestion, rowIndex: number, colIndex: number) {
    const store = (A[storeKey] as Record<string, unknown>) || {};
    const cur = (store[q.id] as Record<string, number>) || {};
    setIn(storeKey, q.id, { ...cur, [rowIndex]: colIndex });
  }
  function matrixUI(q: PathQuestion, storeKey: "ph" | "pe") {
    const store = (A[storeKey] as Record<string, unknown>) || {};
    const cur = (store[q.id] as Record<string, number>) || {};
    return (
      <div className="flex flex-col gap-2">
        {(q.rows || []).map((r, ri) => (
          <div key={ri} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm">
            <span className="sm:flex-1">{r}</span>
            <div className="flex gap-1 flex-wrap">
              {(q.cols || []).map((c, ci) => (
                <button key={ci} type="button" onClick={() => setMatrix(storeKey, q, ri, ci)}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold border"
                  style={cur[ri] === ci
                    ? { background: tokens.accent, color: "#fff", borderColor: tokens.accent }
                    : { borderColor: tokens.border, color: tokens.textSecondary }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function sectionNotes(key: string) {
    return (
      <>
        {label("Additional notes for this section")}
        <Textarea placeholder="Anything else worth recording here. It's added to the notes." value={A.notes?.[key] || ""} onChange={(e) => setIn("notes", key, e.target.value)} rows={2} />
      </>
    );
  }

  const nav = (
    <div className="flex items-center justify-between mt-8 pt-5" style={{ borderTop: `1px solid ${tokens.border}` }}>
      <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</Button>
      {step < STEPS.length - 1
        ? <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Next: {STEPS[step + 1].nm}</Button>
        : <span />}
    </div>
  );

  function consentPanel(patientFacing = false) {
    const items = [
      { id: "privacy", required: true },
      { id: "assessment", required: true },
      { id: "records", required: false },
      { id: "whatsapp", required: false },
      { id: "photos", required: false },
    ];
    return (
      <div className="mt-6 p-4 rounded-xl" style={{ background: tokens.surfaceAlt, border: `1px solid ${tokens.border}` }}>
        <div className="font-bold text-sm">{patientFacing ? patientCopy(A.P, "selfEntryTitle") : "Patient consent"}</div>
        <p className="text-xs mt-1 mb-3" style={{ color: tokens.textMuted }}>{patientFacing ? patientCopy(A.P, "selfEntryHelp") : "Record the patient's choices. Optional choices are not required for assessment or publication."}</p>
        <p className="text-sm mb-3" style={{ color: tokens.textSecondary }}>{patientCopy(A.P, "notice")}</p>
        {isMinor && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <Input label={patientCopy(A.P, "guardianName")} value={A.P.guardianName || ""} onChange={(e) => setIn("P", "guardianName", e.target.value)} />
          <Input label={patientCopy(A.P, "guardianRelationship")} value={A.P.guardianRelationship || ""} onChange={(e) => setIn("P", "guardianRelationship", e.target.value)} />
        </div>}
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const checked = !!A.consents?.[item.id]?.granted;
            const key = item.id === "privacy" ? "privacy" : item.id;
            const text = patientCopy(A.P, key);
            return <label key={item.id} className="flex items-start gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="mt-1" checked={checked} onChange={(e) => recordConsent(item.id, e.target.checked, isMinor ? A.P.guardianName : (patientFacing ? A.P.name : undefined), isMinor ? A.P.guardianRelationship : undefined)} />
              <span>{text}{item.required && <b className="ml-1" style={{ color: tokens.error }}>*</b>}</span>
            </label>;
          })}
        </div>
        <div className="text-[11px] mt-3" style={{ color: tokens.textMuted }}>When the assessment is saved, each choice includes its timestamp and the name of the person recording it.</div>
      </div>
    );
  }

  function sPatientSelfEntry() {
    return <div className="fixed inset-0 z-[100] overflow-y-auto p-4 sm:p-8" style={{ background: tokens.surfaceAlt, color: tokens.textPrimary }} role="dialog" aria-modal="true" aria-label={patientCopy(A.P, "selfEntryTitle")}>
      <div className="max-w-3xl mx-auto p-4 sm:p-8 rounded-2xl" style={{ background: tokens.surface, border: `1px solid ${tokens.border}` }}>
      <SectionHeader title={patientCopy(A.P, "selfEntryTitle")} subtitle={patientCopy(A.P, "selfEntryHelp")} />
      <Select label="Preferred language / ಭಾಷೆ / भाषा" value={A.P.language || "English"} onChange={(e) => setIn("P", "language", e.target.value)} options={PATIENT_LANGUAGES.map((x) => ({ value: x, label: x }))} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <Input label={patientCopy(A.P, "patientName")} value={A.P.name || ""} onChange={(e) => setIn("P", "name", e.target.value)} />
        <Input label={patientCopy(A.P, "age")} type="number" value={A.P.age || ""} onChange={(e) => setIn("P", "age", e.target.value)} />
        <Input label={patientCopy(A.P, "phone")} value={A.P.phone || ""} onChange={(e) => setIn("P", "phone", e.target.value)} />
      </div>
      <div className="mt-4"><Input label={patientCopy(A.P, "goals")} value={A.C.goals || ""} onChange={(e) => setIn("C", "goals", e.target.value)} /></div>
      <div className="mt-4"><Textarea label="What brings you in today?" rows={3} value={A.C.chief || ""} onChange={(e) => setIn("C", "chief", e.target.value)} /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <Input label="How much is pain affecting your sleep? (0–10)" type="number" value={A.C.sleep ?? ""} onChange={(e) => setIn("C", "sleep", e.target.value === "" ? null : Math.max(0, Math.min(10, Number(e.target.value))))} />
        <Input label="How stressed have you felt? (0–10)" type="number" value={A.C.stress ?? ""} onChange={(e) => setIn("C", "stress", e.target.value === "" ? null : Math.max(0, Math.min(10, Number(e.target.value))))} />
      </div>
      <div className="mt-4">
        {label(patientCopy(A.P, "pain"))}
        <div className="flex flex-wrap gap-2">{Array.from({ length: 11 }, (_, i) => <button key={i} type="button" onClick={() => set("nrs", i)} className="w-9 h-9 rounded-lg border text-sm font-semibold" style={A.nrs === i ? { background: tokens.accent, color: "#fff", borderColor: tokens.accent } : { borderColor: tokens.border }}>{i}</button>)}</div>
      </div>
      {consentPanel(true)}
      <div className="flex gap-3 mt-6">
        <Button onClick={() => { if (!A.P.name?.trim()) { setSaveMsg("Enter the patient's name first."); return; } if (!consentReady) { setSaveMsg("Please record privacy and assessment consent. For a patient under 18, complete guardian details and consent."); return; } setPatientEntryMode(false); setSaveMsg("Patient responses recorded. The clinician can now review and continue the assessment."); }}>
          {patientCopy(A.P, "handBack")}
        </Button>
        <Button variant="ghost" onClick={() => setPatientEntryMode(false)}>Return without submitting</Button>
      </div>
      {saveMsg && <div className="text-sm mt-3" role="status">{saveMsg}</div>}
      </div>
    </div>;
  }

  // ── Step: Patient & pathway ───────────────────────────────────────────────
  function sPatient() {
    if (patientEntryMode) return sPatientSelfEntry();
    return (
      <div>
        <SectionHeader title="Patient & assessment type" subtitle="Link a CRM patient if this is a known patient, then choose the pathway." />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => setPatientEntryMode(true)}>Hand tablet to patient</Button>
          <span className="text-xs" style={{ color: tokens.textMuted }}>Patient self-entry for details, pain, goals and consent.</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          {PATHWAYS.map((p) => (
            <button key={p.id} type="button" onClick={() => choosePath(p.id)} className="text-left p-4 rounded-2xl border transition-colors"
              style={A.path === p.id ? { borderColor: tokens.accent, background: "#FEF0E6" } : { borderColor: tokens.border, background: tokens.surface }}>
              <div className="font-bold text-sm" style={{ color: tokens.textPrimary }}>{p.n}</div>
              <div className="text-xs mt-1" style={{ color: tokens.textMuted }}>{p.who}</div>
            </button>
          ))}
        </div>

        <div className="mt-8 relative" ref={searchRef}>
          {label("CRM patient link")}
          <Input placeholder="Search by name or phone…" value={patientSearch}
            onChange={(e) => { setPatientSearch(e.target.value); setLinkedPatientId(""); }} />
          {searchLoading && <div className="absolute right-3 top-9"><Spinner size="sm" /></div>}
          {patientResults.length > 0 && !linkedPatientId && (
            <div className="absolute z-10 mt-1 w-full rounded-xl shadow-lg" style={{ background: tokens.surface, border: `1px solid ${tokens.border}` }}>
              {patientResults.map((p) => (
                <button key={p.id} type="button" className="block w-full text-left px-4 py-2.5 text-sm hover:bg-black/5"
                  onClick={() => {
                    setLinkedPatientId(p.id); setPatientSearch(p.name); setPatientResults([]);
                    setA((a) => ({ ...a, P: { ...a.P, name: p.name, phone: p.phone ?? a.P.phone, age: p.age != null ? String(p.age) : a.P.age } }));
                  }}>
                  {p.name}{p.phone ? ` · ${p.phone}` : ""}
                </button>
              ))}
            </div>
          )}
          {linkedPatientId && <Badge variant="success" className="mt-2">Linked to CRM patient</Badge>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <Input label="Full name" value={A.P.name || ""} onChange={(e) => setIn("P", "name", e.target.value)} />
          <Input label="Age" type="number" value={A.P.age || ""} onChange={(e) => setIn("P", "age", e.target.value)} />
          <Select label="Gender" value={A.P.gender || ""} onChange={(e) => setIn("P", "gender", e.target.value)}
            options={[{ value: "", label: "Choose…" }, { value: "Female", label: "Female" }, { value: "Male", label: "Male" }, { value: "Other", label: "Other" }]} />
          <Input label="Phone" value={A.P.phone || ""} onChange={(e) => setIn("P", "phone", e.target.value)} />
          <Input label="Occupation" value={A.P.occupation || ""} onChange={(e) => setIn("P", "occupation", e.target.value)} />
          <Select label="Visit type" value={A.P.visit || "first"} onChange={(e) => setIn("P", "visit", e.target.value)}
            options={[{ value: "first", label: "First assessment" }, { value: "review", label: "Reassessment" }, { value: "discharge", label: "Discharge review" }]} />
          <Select label="Work" value={A.P.work || ""} onChange={(e) => setIn("P", "work", e.target.value)}
            options={["", "Desk / IT", "Manager", "Field / sales", "Operations / manual", "Driver", "Homemaker", "Student", "Retired", "Other"].map((x) => ({ value: x, label: x || "Choose…" }))} />
          <Input label="Work details" placeholder="e.g. 9-hour laptop days, 40 km two-wheeler commute" value={A.P.workDetails || ""} onChange={(e) => setIn("P", "workDetails", e.target.value)} />
          <Select label="Activity level" value={A.P.activity || ""} onChange={(e) => setIn("P", "activity", e.target.value)}
            options={["", "Sedentary", "Lightly active", "Moderately active", "Very active"].map((x) => ({ value: x, label: x || "Choose…" }))} />
          <Select label="How they found us" value={A.P.howFound || ""} onChange={(e) => setIn("P", "howFound", e.target.value)}
            options={["", "Doctor referral", "Family or friend", "Online search", "Social media", "Walk-in", "Repeat patient", "Other"].map((x) => ({ value: x, label: x || "Choose…" }))} />
          <Input label="Referring doctor" placeholder="e.g. Dr. A. Rao, Orthopaedics" value={A.P.referredBy || ""} onChange={(e) => setIn("P", "referredBy", e.target.value)} />
          <Input label="Doctor's reg. no. (optional)" placeholder="State medical council no." value={A.P.doctorReg || ""} onChange={(e) => setIn("P", "doctorReg", e.target.value)} />
          <Select label="Payment" value={A.P.payer || ""} onChange={(e) => setIn("P", "payer", e.target.value)}
            options={["", "Self-pay", "Insurance", "Corporate / TPA", "Government scheme"].map((x) => ({ value: x, label: x || "Choose…" }))} />
          <Input label="ABHA number (optional)" placeholder="14-digit Ayushman Bharat Health Account" value={A.P.abha || ""} onChange={(e) => setIn("P", "abha", e.target.value)} />
          <Select label="Preferred patient language" value={A.P.language || "English"} onChange={(e) => setIn("P", "language", e.target.value)} options={PATIENT_LANGUAGES.map((x) => ({ value: x, label: x }))} />
        </div>
        {consentPanel(false)}
        {sectionNotes("patient")}
        {nav}
      </div>
    );
  }

  // ── Step: Safety screen ───────────────────────────────────────────────────
  function sSafety() {
    return (
      <div>
        <SectionHeader title="Safety screen" subtitle="Ask these before you examine. Tick only what the patient confirms." />
        {serious && <div className="mt-4 p-4 rounded-xl text-sm font-semibold" style={{ background: tokens.errorBg, color: tokens.error }}>
          Serious pathology suspected — stop the physical examination and refer. Record the referral below.
        </div>}
        {RF_GROUPS.map((g) => {
          const r = rfa.find((x) => x.id === g.id)!;
          return (
            <div key={g.id} className="mt-6">
              <div className="flex items-center justify-between">
                {label(g.n)}
                {r.level !== "None" && <Badge variant={r.level === "Emergency" || r.level === "High" ? "error" : "warning"}>{r.level}</Badge>}
              </div>
              <div className="flex flex-col gap-1.5">
                {g.items.map((f) => (
                  <label key={f.id} className="flex items-start gap-2 text-sm cursor-pointer">
                    <input type="checkbox" className="mt-0.5" checked={!!A.flags[f.id]} onChange={() => togIn("flags", f.id)} />
                    <span>{f.label}{f.key && <span className="ml-1 text-[10px] font-bold uppercase" style={{ color: tokens.error }}>Key</span>}</span>
                  </label>
                ))}
              </div>
              {r.action && <div className="mt-2 text-xs font-medium" style={{ color: tokens.textSecondary }}>{r.action}</div>}
            </div>
          );
        })}
        {serious && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Referred to" value={A.referTo || ""} onChange={(e) => set("referTo", e.target.value)}
              options={["", "Emergency department", "Orthopaedic surgeon", "Spine surgeon", "Neurologist", "General physician", "Oncologist", "Rheumatologist"].map((x) => ({ value: x, label: x || "Choose…" }))} />
            <label className="flex items-center gap-2 text-sm mt-6">
              <input type="checkbox" checked={!!A.referralAck} onChange={() => set("referralAck", !A.referralAck)} />
              Referral advised and documented
            </label>
          </div>
        )}

        {label("Cauda equina safety-net")}
        <div className="text-xs mb-2" style={{ color: tokens.textMuted }}>For anyone with back pain or leg symptoms, say this and give it in writing:</div>
        <div className="p-3 rounded-xl text-sm italic" style={{ background: tokens.surfaceAlt }}>&ldquo;{SAFETY_NET_SCRIPT}&rdquo;</div>
        <label className="flex items-center gap-2 text-sm mt-2">
          <input type="checkbox" checked={!!A.safetyNet} onChange={() => set("safetyNet", !A.safetyNet)} /> Safety-net advice given and understood
        </label>
        {sectionNotes("safety")}
        {nav}
      </div>
    );
  }

  // ── Step: Pain & story ────────────────────────────────────────────────────
  function sStory() {
    const PC = [
      "Pain", "Stiffness", "Weakness", "Giving way / instability", "Numbness or tingling", "Swelling", "Clicking or locking",
      "Poor balance or falls", "Difficulty with daily tasks", "Recovery after surgery", "Posture concern", "Leaking or pelvic symptoms",
      "Headache", "Dizziness", "Check-up / prevention",
    ];
    const n1to5 = (val: number | null | undefined, onPick: (n: number) => void, lowLbl: string, highLbl: string) => (
      <div>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => onPick(n)} className="w-9 h-9 rounded-full text-sm font-bold border"
              style={val === n ? { background: tokens.accent, color: "#fff", borderColor: tokens.accent } : { borderColor: tokens.border, color: tokens.textSecondary }}>
              {n}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-[11px] mt-1" style={{ color: tokens.textMuted }}><span>{lowLbl}</span><span>{highLbl}</span></div>
      </div>
    );
    return (
      <div>
        <SectionHeader title="Pain and their story" subtitle="Regions, complaint, pain score and goals." />
        {label("Body pain map", "tap a zone, then set its severity")}
        <BodyMap zones={A.zones} onChange={(zones) => set("zones", zones)} />

        {label("What it feels like")}
        {chips(PAIN_TYPES, A.ptype, (x) => togIn("ptype", x))}
        {label("Through the day")}
        {chips(PAIN_PATTERNS, A.ppattern, (x) => togIn("ppattern", x))}

        {label("Regions to examine")}
        {regionPicker()}
        {label("Presenting complaint")}
        {chips(PC, A.C.pc, (x) => setIn("C", "pc", tog(A.C.pc, x)))}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <Select label="Side" value={A.C.side || ""} onChange={(e) => setIn("C", "side", e.target.value)}
            options={["", "Right", "Left", "Both sides", "Central / midline", "Not applicable"].map((x) => ({ value: x, label: x || "Choose…" }))} />
          <Select label="How long" value={A.C.duration || ""} onChange={(e) => setIn("C", "duration", e.target.value)}
            options={["", "Less than a week", "1–4 weeks", "1–3 months", "3–6 months", "6–12 months", "Over a year"].map((x) => ({ value: x, label: x || "Choose…" }))} />
          <Select label="Onset" value={A.C.onset || ""} onChange={(e) => setIn("C", "onset", e.target.value)}
            options={["", "Sudden, with an injury", "Sudden, no clear cause", "Slowly over time", "After surgery", "Keeps coming back"].map((x) => ({ value: x, label: x || "Choose…" }))} />
        </div>
        <Textarea label="In their words (optional)" value={A.C.chief || ""} onChange={(e) => setIn("C", "chief", e.target.value)} className="mt-4" rows={2} />

        {label("Since it started")}
        {chips(COURSE_OPTS, Object.fromEntries(COURSE_OPTS.map((x) => [x, A.C.course === x])), (x) => setIn("C", "course", A.C.course === x ? "" : x))}
        {label("Previous episodes")}
        {chips(PREV_EP_OPTS, Object.fromEntries(PREV_EP_OPTS.map((x) => [x, A.C.prevEp === x])), (x) => setIn("C", "prevEp", A.C.prevEp === x ? "" : x))}
        {label("How it started")}
        {chips(MECH_OPTS, A.C.mech, (x) => setIn("C", "mech", tog(A.C.mech, x)))}

        {label("Pain score (NRS) — right now", "required")}
        <div className="flex gap-1.5 flex-wrap">
          {Array.from({ length: 11 }, (_, i) => i).map((n) => (
            <button key={n} type="button" onClick={() => set("nrs", A.nrs === n ? null : n)}
              className="w-9 h-9 rounded-full text-sm font-bold border"
              style={A.nrs === n ? { background: tokens.accent, color: "#fff", borderColor: tokens.accent } : { borderColor: tokens.border, color: tokens.textSecondary }}>
              {n}
            </button>
          ))}
        </div>

        {label("Makes it worse")}
        {chips([
          "Sitting", "Sitting cross-legged on the floor", "Squatting / Indian-style toilet", "Getting up from the floor", "Standing",
          "Walking", "Bending", "Lifting", "Carrying a child", "Stairs", "Overhead reach", "Screen work", "Phone use",
          "Two-wheeler riding", "Driving in traffic", "Sweeping / mopping", "Kneeling for prayer", "Lying down", "Sport", "Yoga",
        ], A.C.agg, (x) => setIn("C", "agg", tog(A.C.agg, x)))}
        {label("Makes it better")}
        {chips(["Rest", "Movement", "Heat / hot water bag", "Ice", "Lying down", "Changing position", "Painkillers", "Balm or pain-relief gel", "Oil massage", "Stretching", "Walking"], A.C.ease, (x) => setIn("C", "ease", tog(A.C.ease, x)))}

        {label("Treatment so far")}
        {chips(TX_SOFAR, A.C.tx, (x) => setIn("C", "tx", tog(A.C.tx, x)))}

        {label("Goals")}
        {chips([
          "Work without pain", "Sit through the working day", "Sleep through the night", "Walk further", "Climb stairs",
          "Sit on the floor or squat", "Lift and carry", "Play with children", "Return to sport", "Run", "Train at the gym",
          "Prevent it coming back", "Avoid surgery", "Prepare for surgery", "Recover after surgery", "Better balance, fewer falls",
          "Pelvic floor control", "Return to running after baby", "Stay independent at home",
        ], A.C.goalsSel, (x) => setIn("C", "goalsSel", tog(A.C.goalsSel, x)))}

        {label("Patient-Specific Functional Scale")}
        <div className="flex flex-col gap-3">
          {A.psfs.map((p, i) => (
            <div key={i} className="flex items-center gap-3">
              <Input placeholder={`Activity ${i + 1}`} value={p.a} className="flex-1"
                onChange={(e) => set("psfs", A.psfs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
              <Select value={p.s != null ? String(p.s) : ""} onChange={(e) => set("psfs", A.psfs.map((x, j) => (j === i ? { ...x, s: e.target.value === "" ? null : Number(e.target.value) } : x)))}
                options={[{ value: "", label: "/10" }, ...Array.from({ length: 11 }, (_, n) => ({ value: String(n), label: String(n) }))]} className="w-24" />
            </div>
          ))}
        </div>

        {label("Sleep quality")}
        {n1to5(A.C.sleep, (n) => setIn("C", "sleep", A.C.sleep === n ? null : n), "Poor", "Good")}
        {label("Stress")}
        {n1to5(A.C.stress, (n) => setIn("C", "stress", A.C.stress === n ? null : n), "Low", "High")}
        {label("Day-to-day activity")}
        {n1to5(A.C.act, (n) => setIn("C", "act", A.C.act === n ? null : n), "Very little", "A lot")}
        {label("Confidence", "How sure are you that you can manage this pain yourself?")}
        {n1to5(A.selfEff, (n) => set("selfEff", A.selfEff === n ? null : n), "Not at all", "Very sure")}

        {label("Ideas, concerns and expectations (ICE)")}
        <div className="text-xs font-semibold mb-1" style={{ color: tokens.textMuted }}>What they think is causing it</div>
        {chips(ICE_IDEA, Object.fromEntries(ICE_IDEA.map((x) => [x, A.ice?.idea === x])), (x) => setIn("ice", "idea", A.ice?.idea === x ? "" : x))}
        <div className="text-xs font-semibold mt-3 mb-1" style={{ color: tokens.textMuted }}>Worries</div>
        {chips(ICE_CONCERNS, A.ice?.concern, (x) => togDeep("ice", "concern", x))}
        <div className="text-xs font-semibold mt-3 mb-1" style={{ color: tokens.textMuted }}>Hoping for</div>
        {chips(ICE_EXPECT, A.ice?.expect, (x) => togDeep("ice", "expect", x))}
        {sectionNotes("story")}
        {nav}
      </div>
    );
  }

  // ── Step: History & screening ─────────────────────────────────────────────
  function sHistory() {
    const hxSections = PATH_HX[A.path] || [];
    const hasNeck = A.regions.includes("cervical" as Region);
    const hasLumbar = A.regions.includes("lumbar" as Region);
    return (
      <div>
        <SectionHeader title="History and screening" subtitle="Medical history, severity/irritability/nature, and pathway-specific history." />
        {label("Medical history")}
        <div className="text-xs mb-2" style={{ color: tokens.textMuted }}>Vitamin D or B12 deficiency, diabetes and post-chikungunya joint pain are common causes of persistent aches here. Ask about recent blood tests.</div>
        {chips(PMH, A.hist.pmh, (x) => setIn("hist", "pmh", tog(A.hist.pmh, x)))}

        {label("Drug history")}
        {chips(DRUG_HISTORY, A.hist.dh, (x) => setIn("hist", "dh", tog(A.hist.dh, x)))}
        <div className="text-sm font-medium mb-1 mt-3">How many medicines a day</div>
        {chips(MEDS_COUNT, Object.fromEntries(MEDS_COUNT.map((x) => [x, A.hist.nmeds === x])), (x) => setIn("hist", "nmeds", A.hist.nmeds === x ? "" : x))}

        {label("Family history")}
        {chips(FAMILY_HISTORY, A.hist.fh, (x) => setIn("hist", "fh", tog(A.hist.fh, x)))}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <Select label="Severity" value={A.sin.sev || ""} onChange={(e) => setIn("sin", "sev", e.target.value)} options={["", "Low", "Moderate", "High"].map((x) => ({ value: x, label: x || "Choose…" }))} />
          <Select label="Irritability" value={A.sin.irr || ""} onChange={(e) => setIn("sin", "irr", e.target.value)} options={["", "Low", "Moderate", "High"].map((x) => ({ value: x, label: x || "Choose…" }))} />
          <Select label="Nature" value={A.sin.nature || ""} onChange={(e) => setIn("sin", "nature", e.target.value)}
            options={["", "Mechanical / nociceptive", "Neuropathic (nerve-related)", "Nociplastic (sensitised)", "Inflammatory", "Mixed"].map((x) => ({ value: x, label: x || "Choose…" }))} />
        </div>

        {hasNeck && (
          <>
            {label("Neck vascular screen (IFOMPT)")}
            <div className="text-xs font-semibold mb-1" style={{ color: tokens.textMuted }}>Risk factors</div>
            {chips(CAD_RISK, A.cad.risk, (x) => togDeep("cad", "risk", x))}
            <div className="text-xs font-semibold mb-1 mt-3" style={{ color: tokens.textMuted }}>Symptoms (any one is a stop sign)</div>
            {chips(CAD_SIGNS, A.cad.signs, (x) => togDeep("cad", "signs", x))}
            <label className="flex items-center gap-2 text-sm mt-2">
              <input type="checkbox" checked={!!A.cad.done} onChange={() => setIn("cad", "done", !A.cad.done)} /> Screen completed
            </label>
            {(() => { const c = cadAssess(A); return c ? <div className="mt-2 text-sm font-medium" style={{ color: c.level === "High" ? tokens.error : tokens.textSecondary }}>{c.msg}</div> : null; })()}

            <label className="flex items-center gap-2 text-sm mt-4">
              <input type="checkbox" checked={!!A.ccr.used} onChange={() => setIn("ccr", "used", !A.ccr.used)} /> Neck pain after trauma (Canadian C-spine rule)
            </label>
            {A.ccr.used && (
              <div className="mt-2">
                <div className="text-xs font-semibold mb-1" style={{ color: tokens.textMuted }}>High-risk factors</div>
                {chips(CCR_HIGH, A.ccr.high, (x) => togDeep("ccr", "high", x))}
                <div className="text-xs font-semibold mb-1 mt-2" style={{ color: tokens.textMuted }}>Low-risk factors</div>
                {chips(CCR_LOW, A.ccr.low, (x) => togDeep("ccr", "low", x))}
                <div className="text-xs font-semibold mb-1 mt-2" style={{ color: tokens.textMuted }}>Can actively rotate 45° left and right?</div>
                {oneOf(["Yes", "No"], A.ccr.rot === "yes" ? "Yes" : A.ccr.rot === "no" ? "No" : "", (x) => setIn("ccr", "rot", x === "Yes" ? "yes" : x === "No" ? "no" : ""))}
                {(() => { const c = ccrAssess(A); return c ? <div className="mt-2 text-sm font-medium">{c.msg}</div> : null; })()}
              </div>
            )}
          </>
        )}

        {A.regions.includes("lumbar" as Region) && (
          <>
            {label("STarT Back Screening Tool", "© Keele University 2007")}
            <div className="flex flex-col gap-2">
              {STARTBACK.map((q, i) => (
                <div key={i} className="flex items-center justify-between gap-3 text-sm">
                  <span>{i + 1}. {q}</span>
                  {oneOf(["Disagree", "Agree"], A.sbt?.["q" + i] === "A" ? "Agree" : A.sbt?.["q" + i] === "D" ? "Disagree" : "", (x) => setIn("sbt", "q" + i, x === "Agree" ? "A" : x === "Disagree" ? "D" : null))}
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 text-sm mt-1">
                <span>9. Overall, how bothersome has it been in the last 2 weeks?</span>
                <Select value={A.sbt?.q8 || ""} onChange={(e) => setIn("sbt", "q8", e.target.value)} className="w-48"
                  options={["", ...STARTBACK_Q9].map((x) => ({ value: x, label: x || "Choose…" }))} />
              </div>
            </div>
            {(() => { const sb = startBack(A); return sb ? <div className="mt-2 text-sm font-semibold">{sb.risk} risk · {sb.total}/9 — {RISK_ADVICE[sb.risk]}</div> : null; })()}
          </>
        )}

        {A.regions.length > 0 && !hasLumbar && (
          <>
            {label("Keele STarT MSK Tool", "© Keele University")}
            <Input type="number" min={0} max={12} helpText="Total score, 0–12 (sum of items answered 'yes'/'agree')" className="max-w-[160px]"
              value={A.kmsk || ""} onChange={(e) => set("kmsk", e.target.value)} />
            {(() => { const km = keeleMsk(A); return km ? <div className="mt-2 text-sm font-semibold">{km.risk} risk · {km.total}/12 — {RISK_ADVICE[km.risk]}</div> : null; })()}
          </>
        )}

        {label("Psychosocial (yellow flags)")}
        {chips(YELLOW_FLAGS, A.yf, (x) => togIn("yf", x))}

        {label("Social history")}
        <div className="text-sm font-medium mb-1">Lives with</div>
        {chips(SH_LIVES_WITH, Object.fromEntries(SH_LIVES_WITH.map((x) => [x, A.sh?.livesWith === x])), (x) => setIn("sh", "livesWith", A.sh?.livesWith === x ? "" : x))}
        <div className="text-sm font-medium mb-1 mt-3">At home</div>
        {chips(SH_AT_HOME, A.sh?.atHome as Record<string, boolean>, (x) => togDeep("sh", "atHome", x))}
        <div className="text-sm font-medium mb-1 mt-3">Gets around by</div>
        {chips(SH_GETS_AROUND, A.sh?.getsAround as Record<string, boolean>, (x) => togDeep("sh", "getsAround", x))}
        <div className="text-sm font-medium mb-1 mt-3">Screen time outside work or school</div>
        {chips(SH_SCREEN_TIME, Object.fromEntries(SH_SCREEN_TIME.map((x) => [x, A.sh?.screenTime === x])), (x) => setIn("sh", "screenTime", A.sh?.screenTime === x ? "" : x))}
        <div className="text-sm font-medium mb-1 mt-3">Exercise days a week</div>
        {chips(SH_EXERCISE_DAYS, Object.fromEntries(SH_EXERCISE_DAYS.map((x) => [x, A.sh?.exerciseDays === x])), (x) => setIn("sh", "exerciseDays", A.sh?.exerciseDays === x ? "" : x))}
        <div className="text-sm font-medium mb-1 mt-3">Sleep a night</div>
        {chips(SH_SLEEP, Object.fromEntries(SH_SLEEP.map((x) => [x, A.sh?.sleepHours === x])), (x) => setIn("sh", "sleepHours", A.sh?.sleepHours === x ? "" : x))}
        <div className="text-sm font-medium mb-1 mt-3">Diet</div>
        {chips(SH_DIET, Object.fromEntries(SH_DIET.map((x) => [x, A.sh?.diet === x])), (x) => setIn("sh", "diet", A.sh?.diet === x ? "" : x))}
        <div className="text-sm font-medium mb-1 mt-3">Smoking or tobacco</div>
        {chips(SH_TOBACCO, Object.fromEntries(SH_TOBACCO.map((x) => [x, A.sh?.tobacco === x])), (x) => setIn("sh", "tobacco", A.sh?.tobacco === x ? "" : x))}
        <div className="text-sm font-medium mb-1 mt-3">Alcohol</div>
        {chips(SH_ALCOHOL, Object.fromEntries(SH_ALCOHOL.map((x) => [x, A.sh?.alcohol === x])), (x) => setIn("sh", "alcohol", A.sh?.alcohol === x ? "" : x))}

        {label("Other history and tests")}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Textarea label="Other history" value={A.hist.pmhNote || ""} onChange={(e) => setIn("hist", "pmhNote", e.target.value)} rows={2} />
          <Textarea label="Medicine names and doses (optional)" placeholder="Names and dose if known, including ay…" value={A.hist.meds || ""} onChange={(e) => setIn("hist", "meds", e.target.value)} rows={2} />
          <Select label="Imaging / tests done" value={A.hist.imaging || ""} onChange={(e) => setIn("hist", "imaging", e.target.value)}
            options={["", "None", "X-ray", "MRI", "CT scan", "Ultrasound", "Blood tests", "Nerve conduction study", "Other"].map((x) => ({ value: x, label: x || "Choose…" }))} />
        </div>
        {A.hist.imaging && A.hist.imaging !== "None" && (
          <Textarea label="Imaging / test findings" className="mt-3" value={A.hist.imgFind || ""} onChange={(e) => setIn("hist", "imgFind", e.target.value)} rows={2} />
        )}

        <div className="text-sm font-medium mb-1 mt-4">Recent blood tests (enter values if known)</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {BLOOD_TESTS.map((t) => (
            <Input key={t} label={t} placeholder="value / date" value={A.hist.blood?.[t] || ""} onChange={(e) => setIn("hist", "blood", { ...(A.hist.blood || {}), [t]: e.target.value })} />
          ))}
        </div>

        {hxSections.length > 0 && (
          <>
            {label(`${path.n}: history`)}
            {hxSections.map((sec) => (
              <div key={sec.h} className="mt-4">
                <div className="font-bold text-sm mb-2">{sec.h}</div>
                {sec.note && <div className="text-xs mb-2" style={{ color: tokens.textMuted }}>{sec.note}</div>}
                {(sec.qs || []).filter((q) => !q.when || q.when(A)).map((q) => (
                  <div key={q.id} className="mb-3">
                    <div className="text-sm font-medium mb-1">{q.q}</div>
                    {q.t === "multi" && chips(q.o || [], (A.ph as Record<string, Record<string, boolean>>)[q.id], (x) => togDeep("ph", q.id, x))}
                    {q.t === "one" && oneOf(q.o || [], (A.ph as Record<string, string>)[q.id], (x) => setIn("ph", q.id, x))}
                    {q.t === "num" && <Input type="number" value={(A.ph as Record<string, string>)[q.id] || ""} onChange={(e) => setIn("ph", q.id, e.target.value)} helpText={q.u} className="max-w-[160px]" />}
                    {q.t === "date" && <Input type="date" value={(A.ph as Record<string, string>)[q.id] || ""} onChange={(e) => setIn("ph", q.id, e.target.value)} className="max-w-[200px]" />}
                    {q.t === "text" && <Input value={(A.ph as Record<string, string>)[q.id] || ""} onChange={(e) => setIn("ph", q.id, e.target.value)} />}
                    {q.t === "matrix" && matrixUI(q, "ph")}
                  </div>
                ))}
              </div>
            ))}
          </>
        )}

        {pFlags.filter((f) => f.src === "hx").length > 0 && (
          <div className="mt-4 p-3 rounded-xl text-sm" style={{ background: tokens.errorBg, color: tokens.error }}>
            {pFlags.filter((f) => f.src === "hx").map((f, i) => <div key={i}><b>{f.lv}:</b> {f.msg}</div>)}
          </div>
        )}
        {sectionNotes("history")}
        {nav}
      </div>
    );
  }

  // ── Step: Objective examination ───────────────────────────────────────────
  function sExam() {
    const examSections = PATH_EXAM[A.path] || [];
    return (
      <div>
        <SectionHeader title="Objective examination" subtitle="Record only what you examine today." />
        {A.regions.length === 0 && <div className="mt-4 text-sm" style={{ color: tokens.textMuted }}>Choose regions in the Pain & story step to see exam fields.</div>}

        {label("Observation")}
        {chips(OBS_ITEMS, A.obs.obs, (x) => togDeep("obs", "obs", x))}
        {label("Posture")}
        {chips(POSTURE.map((p) => p.l), Object.fromEntries(POSTURE.map((p) => [p.l, !!A.obs.posture?.[p.id]])), (lb) => togDeep("obs", "posture", POSTURE.find((p) => p.l === lb)!.id))}
        {label("Gait")}
        {chips(GAIT, A.obs.gait, (x) => togDeep("obs", "gait", x))}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <Input label="BP systolic" type="number" helpText="mmHg" value={A.vitals.sys || ""} onChange={(e) => setIn("vitals", "sys", e.target.value)} />
          <Input label="BP diastolic" type="number" helpText="mmHg" value={A.vitals.dia || ""} onChange={(e) => setIn("vitals", "dia", e.target.value)} />
          <Input label="Heart rate" type="number" helpText="bpm" value={A.vitals.hr || ""} onChange={(e) => setIn("vitals", "hr", e.target.value)} />
          <Input label="Height" type="number" helpText="cm" value={A.vitals.ht || ""} onChange={(e) => setIn("vitals", "ht", e.target.value)} />
          <Input label="Weight" type="number" helpText="kg" value={A.vitals.wt || ""} onChange={(e) => setIn("vitals", "wt", e.target.value)} />
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: tokens.textSecondary }}>BMI</div>
            <div className="text-sm font-semibold py-2.5">{bmi(A) ?? "–"}{bmi(A) != null && <span className="ml-2 font-normal" style={{ color: tokens.textMuted }}>{bmiBand(bmi(A))}</span>}</div>
          </div>
        </div>

        {label("Breathing pattern")}
        {chips(BREATH_PATTERNS, A.breath?.pattern, (x) => togDeep("breath", "pattern", x))}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
          <Input label="Respiratory rate" type="number" helpText="breaths/min" value={A.breath?.rr || ""} onChange={(e) => setIn("breath", "rr", e.target.value)} />
          <Input label="Control pause" type="number" helpText="seconds" value={A.breath?.cp || ""} onChange={(e) => setIn("breath", "cp", e.target.value)} />
          <Select label="Rib expansion" value={A.breath?.hilo || ""} onChange={(e) => setIn("breath", "hilo", e.target.value)}
            options={["", "Upper chest dominant", "Lower / diaphragm dominant", "Even"].map((x) => ({ value: x, label: x || "Choose…" }))} />
        </div>

        {label("Tissue findings on palpation")}
        {chips(TISSUE, A.tissue, (x) => togIn("tissue", x))}
        <Textarea placeholder="Palpation notes (optional)" className="mt-2" value={A.palpNote || ""} onChange={(e) => set("palpNote", e.target.value)} rows={2} />

        {A.regions.map((rid) => (
          <div key={rid} className="mt-8 p-4 rounded-2xl" style={{ background: tokens.surfaceAlt, border: `1px solid ${tokens.border}` }}>
            <div className="font-black text-sm mb-3" style={{ color: tokens.primary }}>{regionName(rid)}</div>

            <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: tokens.textSecondary }}>Palpation</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mb-3">
              {(PALP[rid] || []).map((s) => (
                <div key={s} className="flex items-center justify-between text-sm py-1">
                  <span>{s}</span>
                  <Select value={String(A.palp[s]?.g ?? "")} onChange={(e) => setIn("palp", s, { ...(A.palp[s] || {}), g: e.target.value === "" ? null : Number(e.target.value) })}
                    className="w-20" options={["", "0", "1", "2", "3", "4"].map((x) => ({ value: x, label: x || "–" }))} />
                </div>
              ))}
            </div>

            <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: tokens.textSecondary }}>Range of motion</div>
            <div className="grid grid-cols-1 gap-2 mb-3">
              {(ROM[rid] || []).map((m) => {
                const d = A.rom[m.id] || {};
                const setR = (k: string, v: string) => setIn("rom", m.id, { ...d, [k]: v });
                return (
                  <div key={m.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="w-48">{m.m} <span className="text-xs" style={{ color: tokens.textMuted }}>({m.deficit ? "0°" : m.n + "°"})</span></span>
                    {m.bi ? (<>
                      <Input placeholder="AROM R" type="number" value={(d.ar as string) || ""} onChange={(e) => setR("ar", e.target.value)} className="w-24" />
                      <Input placeholder="AROM L" type="number" value={(d.al as string) || ""} onChange={(e) => setR("al", e.target.value)} className="w-24" />
                    </>) : (
                      <Input placeholder="AROM" type="number" value={(d.a as string) || ""} onChange={(e) => setR("a", e.target.value)} className="w-24" />
                    )}
                    <Select value={d.ef || ""} onChange={(e) => setR("ef", e.target.value)} className="w-40" options={["", ...END_FEEL].map((x) => ({ value: x, label: x || "End-feel" }))} />
                    <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!d.pain} onChange={(e) => setIn("rom", m.id, { ...d, pain: e.target.checked })} /> painful</label>
                  </div>
                );
              })}
            </div>

            <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: tokens.textSecondary }}>Strength (Oxford 0–5)</div>
            <div className="grid grid-cols-1 gap-2 mb-3">
              {(STR_MUSCLES[rid] || []).map((m) => {
                const d = A.str[m.id] || {};
                const mk = (side: string) => (
                  <Select key={side} value={String((d as Record<string, number | null | undefined>)[side] ?? "")}
                    onChange={(e) => setIn("str", m.id, { ...d, [side]: e.target.value === "" ? null : Number(e.target.value) })}
                    className="w-20" options={["", "0", "1", "2", "3", "4", "5"].map((x) => ({ value: x, label: x || "–" }))} />
                );
                return (
                  <div key={m.id} className="flex items-center gap-2 text-sm">
                    <span className="w-48">{m.n}</span>
                    {m.b ? (<>{mk("r")}{mk("l")}</>) : mk("s")}
                  </div>
                );
              })}
            </div>

            {(TIGHT_MUSCLES[rid] || []).length > 0 && (
              <>
                <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: tokens.textSecondary }}>Reduced muscle length</div>
                <div className="mb-3">{chips((TIGHT_MUSCLES[rid] || []).map((m) => m.n), Object.fromEntries((TIGHT_MUSCLES[rid] || []).map((m) => [m.n, !!A.tight[m.id]])),
                  (lb) => togIn("tight", (TIGHT_MUSCLES[rid] || []).find((m) => m.n === lb)!.id))}</div>
              </>
            )}

            <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: tokens.textSecondary }}>Special tests</div>
            <div className="flex flex-col gap-1.5 mb-1">
              {(TESTS[rid]?.ts || []).map((t) => {
                const d = A.tests[t.id] || {};
                const seg = (side: "r" | "l" | "s") => (
                  <div key={side} className="flex gap-1">
                    {(["POS", "NEG"] as const).map((v) => (
                      <button key={v} type="button" onClick={() => setIn("tests", t.id, { ...d, [side]: d[side] === v ? null : v })}
                        className="px-2 py-1 rounded text-xs font-bold border"
                        style={d[side] === v ? { background: v === "POS" ? tokens.error : tokens.success, color: "#fff", borderColor: "transparent" } : { borderColor: tokens.border, color: tokens.textMuted }}>
                        {v === "POS" ? "+" : "−"}{side !== "s" ? ` ${side.toUpperCase()}` : ""}
                      </button>
                    ))}
                  </div>
                );
                return (
                  <div key={t.id} className="flex items-center justify-between gap-3 text-sm py-0.5">
                    <span title={t.desc}>{t.n} <span className="text-xs" style={{ color: tokens.textMuted }}>({t.p})</span></span>
                    <div className="flex gap-2">{t.bi ? <>{seg("r")}{seg("l")}</> : seg("s")}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {label("Neuro screen", "do this whenever there are limb symptoms, numbness, weakness or a spinal problem. Reflexes: 2+ is normal.")}
        <div className="flex gap-2 mb-2">
          {(["U", "L"] as const).map((g) => (
            <button key={g} type="button" onClick={() => setIn("neuro", g === "U" ? "showU" : "showL", !(g === "U" ? A.neuro.showU : A.neuro.showL))}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border"
              style={(g === "U" ? A.neuro.showU : A.neuro.showL) ? { background: tokens.primary, color: "#fff", borderColor: tokens.primary } : { borderColor: tokens.border, color: tokens.textSecondary }}>
              {g === "U" ? "Upper limb" : "Lower limb"}
            </button>
          ))}
        </div>
        {!A.neuro.showU && !A.neuro.showL && <div className="text-sm" style={{ color: tokens.textMuted }}>Choose upper or lower limb to start.</div>}
        {([["U", A.neuro.showU, NEURO_U], ["L", A.neuro.showL, NEURO_L]] as const).filter(([, show]) => show).map(([grpId, , grp]) => {
          const setNeuro = (id: string, side: "r" | "l", val: string | number | null) => {
            const vals = A.neuro.vals || {};
            setIn("neuro", "vals", { ...vals, [id]: { ...(vals[id] || {}), [side]: val } });
          };
          const row = (id: string, lbl: string, opts: Array<{ value: string; label: string }>, numeric: boolean) => {
            const v = A.neuro.vals[id] || {};
            const parse = (x: string) => (x === "" ? null : numeric ? Number(x) : x);
            return (
              <div key={id} className="flex items-center justify-between gap-3 text-sm py-1">
                <span>{lbl}</span>
                <div className="flex gap-2">
                  <Select value={v.r != null ? String(v.r) : ""} onChange={(e) => setNeuro(id, "r", parse(e.target.value))} className="w-28" options={[{ value: "", label: "R" }, ...opts]} />
                  <Select value={v.l != null ? String(v.l) : ""} onChange={(e) => setNeuro(id, "l", parse(e.target.value))} className="w-28" options={[{ value: "", label: "L" }, ...opts]} />
                </div>
              </div>
            );
          };
          return (
            <div key={grpId} className="mt-3">
              <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: tokens.textSecondary }}>Dermatomes (sensation)</div>
              {grp.derm.map((d) => row(d.id, d.l, SENS_OPTS.map((o) => ({ value: o.v, label: o.l })), false))}
              <div className="text-xs font-bold uppercase tracking-widest mb-1 mt-3" style={{ color: tokens.textSecondary }}>Myotomes (0–5)</div>
              {grp.myo.map((m) => row(m.id, m.l, ["0", "1", "2", "3", "4", "5"].map((x) => ({ value: x, label: x })), true))}
              <div className="text-xs font-bold uppercase tracking-widest mb-1 mt-3" style={{ color: tokens.textSecondary }}>Reflexes (0–4)</div>
              {grp.ref.map((r) => row(r.id, r.l, ["0", "1", "2", "3", "4"].map((x) => ({ value: x, label: x })), true))}
              <div className="text-xs font-bold uppercase tracking-widest mb-1 mt-3" style={{ color: tokens.textSecondary }}>Upper motor neuron signs</div>
              {grp.umn.map((u) => row(u.id, u.l, [{ value: "NEG", label: "Negative" }, { value: "POS", label: "Positive" }], false))}
            </div>
          );
        })}

        {label("Movement screen")}
        <div className="flex flex-col gap-3">
          {MPATS.map((m) => {
            const d = A.mov[m.id] || {};
            return (
              <div key={m.id} className="text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span>{m.n} <span className="text-xs" style={{ color: tokens.textMuted }}>{m.d}</span></span>
                  {oneOf(["Good", "Fair", "Poor"], d.q === "G" ? "Good" : d.q === "F" ? "Fair" : d.q === "P" ? "Poor" : "",
                    (x) => setIn("mov", m.id, { ...d, q: x === "Good" ? "G" : x === "Fair" ? "F" : x === "Poor" ? "P" : null }))}
                </div>
                {(d.q === "F" || d.q === "P") && (
                  <div className="mt-1.5 pl-2">
                    {chips(MOV_FAULTS, d.f, (x) => setIn("mov", m.id, { ...d, f: tog(d.f, x) }))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {examSections.length > 0 && (
          <>
            {label(`${path.n}: examination`)}
            {examSections.map((sec) => (
              <div key={sec.h} className="mt-4">
                <div className="font-bold text-sm mb-2">{sec.h}</div>
                {sec.note && <div className="text-xs mb-2" style={{ color: tokens.textMuted }}>{sec.note}</div>}
                {(sec.qs || []).filter((q) => !q.when || q.when(A)).map((q) => (
                  <div key={q.id} className="mb-3">
                    <div className="text-sm font-medium mb-1">{q.q}</div>
                    {q.t === "multi" && chips(q.o || [], (A.pe as Record<string, Record<string, boolean>>)[q.id], (x) => togDeep("pe", q.id, x))}
                    {q.t === "one" && oneOf(q.o || [], (A.pe as Record<string, string>)[q.id], (x) => setIn("pe", q.id, x))}
                    {q.t === "num" && <Input type="number" value={(A.pe as Record<string, string>)[q.id] || ""} onChange={(e) => setIn("pe", q.id, e.target.value)} helpText={q.u} className="max-w-[160px]" />}
                    {q.t === "matrix" && matrixUI(q, "pe")}
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
        {sectionNotes("exam")}
        {nav}
      </div>
    );
  }

  // ── Step: Measured tests ──────────────────────────────────────────────────
  function sTests() {
    const avail = FX.filter((t) =>
      (t.paths || []).includes(A.path) &&
      (!t.regions || t.regions.some((r) => A.regions.includes(r))) &&
      (!t.equipReq || A.kit?.[t.equipReq]));
    const byCat = FX_CATS.map((c) => ({ c, items: avail.filter((t) => t.cat === c) })).filter((g) => g.items.length > 0);
    const gated = FX.filter((t) => t.equipReq && !A.kit?.[t.equipReq] && (t.paths || []).includes(A.path) && (!t.regions || t.regions.some((r) => A.regions.includes(r))));
    return (
      <div>
        <SectionHeader title="Measured tests" subtitle="No-instrument functional tests appropriate to this pathway and the regions chosen. None of these feed the Mobility Score — they stand on their own." />
        {label("Extra equipment available")}
        {chips(EXTRA_KIT.map((k) => k.l), Object.fromEntries(EXTRA_KIT.map((k) => [k.l, !!A.kit?.[k.id]])), (lb) => togIn("kit", EXTRA_KIT.find((k) => k.l === lb)!.id))}

        {avail.length === 0 && <div className="mt-6 text-sm" style={{ color: tokens.textMuted }}>No matching tests yet — choose a pathway and regions first.</div>}
        {byCat.map((g) => (
          <div key={g.c} className="mt-8">
            <div className="font-black text-sm mb-3" style={{ color: tokens.primary }}>{g.c}</div>
            <div className="flex flex-col gap-4">
              {g.items.map((t) => (
                <FxTestCard key={t.id} A={A} t={t} d={A.fx[t.id] || {}} onUpdate={(next) => setIn("fx", t.id, next)} />
              ))}
            </div>
          </div>
        ))}

        {gated.length > 0 && (
          <div className="mt-8 text-xs" style={{ color: tokens.textMuted }}>
            Needs equipment not yet ticked above: {gated.map((t) => t.n).join(", ")}.
          </div>
        )}
        {sectionNotes("tests")}
        {nav}
      </div>
    );
  }

  // ── Step: Questionnaires & pillars ────────────────────────────────────────
  function sForms() {
    const FOCUS_AREAS: Array<{ lb: string; key: string }> = [
      { lb: "Women's health", key: "odi" }, { lb: "Workstation", key: "ndi" }, { lb: "Sport", key: "koos" }, { lb: "Persistent pain", key: "qdash" },
    ];
    const allOutcomeKeys = [...new Set([...outcomeKeys, ...extraOutcomes])];
    return (
      <div>
        <SectionHeader title="Questionnaires and Vyayāma pillars" subtitle="Outcome measures and the 5-pillar mobility score." />
        <div className="mt-4 p-4 rounded-2xl flex items-center gap-4" style={{ background: tokens.surfaceAlt }}>
          <div className="text-3xl font-black" style={{ color: tokens.primary }}>{pillars.total ?? "–"}<span className="text-sm font-medium">/100</span></div>
          <div className="text-sm font-semibold">{pillars.total != null ? pillars.grade : `${pillars.n} of 5 pillars scored — needs 3 for a score`}</div>
        </div>
        <div className="flex flex-col gap-4 mt-4">
          {pillars.items.map((p) => (
            <div key={p.id} className="p-3 rounded-2xl" style={{ background: tokens.surfaceAlt }}>
              <div className="flex items-center justify-between">
                <span><b>{p.name}</b> <span style={{ color: tokens.textMuted }}>{p.en}</span></span>
              </div>
              <div className="text-xs mt-1" style={{ color: tokens.textMuted }}>From: {p.src}</div>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span className="w-16" style={{ color: tokens.textMuted }}>Clinician</span>
                <div className="flex-1 h-2 rounded-full" style={{ background: tokens.border }}>
                  <div className="h-2 rounded-full" style={{ background: tokens.primary, width: `${((p.clin ?? 0) / 20) * 100}%` }} />
                </div>
                <span className="w-10 text-right">{p.clin ?? "–"}/20</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-xs">
                <span className="w-16" style={{ color: tokens.textMuted }}>Patient</span>
                <div className="flex-1 h-2 rounded-full" style={{ background: tokens.border }}>
                  <div className="h-2 rounded-full" style={{ background: tokens.accent, width: `${((p.pt ?? 0) / 20) * 100}%` }} />
                </div>
                <span className="w-10 text-right">{p.pt ?? "–"}/20</span>
              </div>

              {p.id === "akriti" && (
                <div className="mt-3">
                  <div className="text-xs font-semibold mb-1" style={{ color: tokens.textSecondary }}>Your posture rating</div>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => setIn("vy", "posture", A.vy.posture === n ? null : n)}
                        className="w-9 h-9 rounded-full text-sm font-bold border"
                        style={A.vy.posture === n ? { background: tokens.accent, color: "#fff", borderColor: tokens.accent } : { borderColor: tokens.border, color: tokens.textSecondary }}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-[11px] mt-1" style={{ color: tokens.textMuted }}><span>Marked faults</span><span>Balanced</span></div>
                </div>
              )}

              <div className="text-xs font-semibold mt-3 mb-1" style={{ color: tokens.textSecondary }}>Ask the patient to rate this 0–10</div>
              <div className="flex gap-1 flex-wrap">
                {Array.from({ length: 11 }, (_, n) => n).map((n) => (
                  <button key={n} type="button" onClick={() => setIn("pt", p.id, (A.pt[p.id] === n ? null : n))}
                    className="w-7 h-7 rounded-full text-[11px] font-bold border"
                    style={A.pt[p.id] === n ? { background: tokens.accent, color: "#fff", borderColor: tokens.accent } : { borderColor: tokens.border, color: tokens.textSecondary }}>
                    {n}
                  </button>
                ))}
              </div>
              <Textarea placeholder="Your notes" className="mt-2" rows={2} value={A.notes?.[`pillar_${p.id}`] || ""} onChange={(e) => setIn("notes", `pillar_${p.id}`, e.target.value)} />
            </div>
          ))}
        </div>

        {label("Add a focus area", "pulls in a questionnaire from outside the regions examined")}
        {chips(FOCUS_AREAS.map((f) => f.lb), Object.fromEntries(FOCUS_AREAS.map((f) => [f.lb, extraOutcomes.includes(f.key)])),
          (lb) => { const k = FOCUS_AREAS.find((f) => f.lb === lb)!.key; setExtraOutcomes((xs) => (xs.includes(k) ? xs.filter((x) => x !== k) : [...xs, k])); })}

        {allOutcomeKeys.length === 0 && <div className="mt-6 text-sm" style={{ color: tokens.textMuted }}>No region chosen yet, so there's no questionnaire to show.</div>}
        {allOutcomeKeys.map((k) => {
          const qs = QUESTIONNAIRES[k].items;
          const cur = A.out[k] || [];
          const scored = scoreQuestionnaire(k, cur);
          return (
            <div key={k} className="mt-8">
              <div className="font-bold text-sm mb-2">{QUESTIONNAIRES[k].name}</div>
              <div className="flex flex-col gap-3">
                {qs.map((q, qi) => (
                  <div key={qi}>
                    <div className="text-sm font-medium mb-1">{qi + 1}. {q.q}</div>
                    <Select value={cur[qi] != null ? String(cur[qi]) : ""} onChange={(e) => {
                      const v = e.target.value === "" ? null : parseInt(e.target.value.match(/\((-?\d+)\)/)?.[1] || "0", 10);
                      setA((a) => { const arr = [...(a.out[k] || [])]; arr[qi] = v; return { ...a, out: { ...a.out, [k]: arr } }; });
                    }} options={[{ value: "", label: "Choose…" }, ...q.o.map((o, oi) => ({ value: `${o}|${oi}`, label: o.replace(/\s*\(-?\d+\)\s*$/, "") }))]} />
                  </div>
                ))}
              </div>
              {scored && <div className="mt-2 text-sm font-semibold" style={{ color: tokens.success }}>{scored.text}</div>}
            </div>
          );
        })}
        {sectionNotes("forms")}
        {nav}
      </div>
    );
  }

  // ── Step: Diagnosis ────────────────────────────────────────────────────────
  function sDx() {
    const pcons = PATH_CONS[A.path] || [];
    return (
      <div>
        <SectionHeader title="Provisional diagnosis" subtitle="Suggestions update live from your findings. Fit % weighs supporting against contradicting evidence." />
        {hold.length > 0 && <div className="mt-4 p-4 rounded-xl text-sm font-semibold" style={{ background: tokens.errorBg, color: tokens.error }}>Hold loading: {hold.join(" ")}</div>}
        {dxList.length === 0 && <div className="mt-6 text-sm" style={{ color: tokens.textMuted }}>Not enough findings yet. Answer the history and exam steps to see suggestions here.</div>}
        <div className="flex flex-col gap-3 mt-4">
          {dxList.filter((d) => d.fit >= 25).map((d, i) => {
            const isPicked = A.dx.picked[d.id] === true || (A.dx.picked[d.id] === undefined && i < 3 && d.fit >= 40);
            return (
              <div key={d.id} className="p-4 rounded-2xl" style={{ background: tokens.surfaceAlt, border: `1px solid ${tokens.border}` }}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1" checked={isPicked} onChange={(e) => setA((a) => ({ ...a, dx: { ...a.dx, picked: { ...a.dx.picked, [d.id]: e.target.checked } } }))} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{d.name}</span>
                      <Badge variant={d.fit >= 60 ? "success" : d.fit >= 40 ? "warning" : "neutral"}>{d.fit}% · {fitWord(d.fit)}</Badge>
                    </div>
                    <div className="text-xs mt-1" style={{ color: tokens.textMuted }}>ICD-10 {d.icd}{d.icd11 ? ` · ICD-11 ${d.icd11}` : ""} · {regionName(d.region === "any" ? "" : d.region) || "Any region"}</div>
                    {d.sup.length > 0 && <div className="text-xs mt-1" style={{ color: tokens.success }}>+ {d.sup.join("; ")}</div>}
                    {d.against.length > 0 && <div className="text-xs mt-0.5" style={{ color: tokens.error }}>− {d.against.join("; ")}</div>}
                    {d.refer && <div className="text-xs mt-1 font-semibold" style={{ color: tokens.error }}>Referral: {d.refer}</div>}
                  </div>
                </label>
              </div>
            );
          })}
        </div>

        {pcons.length > 0 && (
          <>
            {label(`${path.short}: conditions to consider`)}
            <div className="flex flex-col gap-1.5">
              {pcons.map((c) => (
                <label key={c.id} className="flex items-start gap-2 text-sm cursor-pointer">
                  <input type="checkbox" className="mt-0.5" checked={!!A.pcons?.[c.id]} onChange={() => togIn("pcons", c.id)} />
                  <span>{c.n} <span className="text-xs" style={{ color: tokens.textMuted }}>({c.icd}) — {c.cue}</span></span>
                </label>
              ))}
            </div>
          </>
        )}

        <div className="flex items-center justify-between mt-6">
          <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: tokens.textSecondary }}>Clinical impression</div>
          <button type="button" className="text-xs font-semibold" style={{ color: tokens.accent }} onClick={() => set("dx", { ...A.dx, custom: report.assessment })}>Fill from findings</button>
        </div>
        <Textarea placeholder="Fills in once you tick an impression above or record enough findings" value={A.dx.custom || ""} onChange={(e) => set("dx", { ...A.dx, custom: e.target.value })} rows={3} />

        <div className="flex items-center justify-between mt-4">
          <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: tokens.textSecondary }}>Key drivers / root cause</div>
          <button type="button" className="text-xs font-semibold" style={{ color: tokens.accent }} onClick={() => set("vy", { ...A.vy, keyDrivers: report.rootCauses.map((r) => `${r.t}: ${r.why} ${r.fix}`).join(" ") })}>Fill from findings</button>
        </div>
        <Textarea placeholder="Fills in from posture, strength, movement, work and lifestyle findings" value={A.vy.keyDrivers || ""} onChange={(e) => setIn("vy", "keyDrivers", e.target.value)} rows={3} />
        <div className="text-xs mt-1" style={{ color: tokens.textMuted }}>These are provisional physiotherapy classifications, not a medical diagnosis.</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Select label="Load classification" value={A.vy.load || ""} onChange={(e) => setIn("vy", "load", e.target.value)}
            options={["", "M1 Overload failure", "M2 Load deprivation", "M3 Repetitive micro-trauma", "M4 Compression dominance", "M5 Shear / instability", "M6 Neural load intolerance"].map((x) => ({ value: x, label: x || "Choose…" }))} />
          <Select label="Current phase" value={A.vy.stage || ""} onChange={(e) => setIn("vy", "stage", e.target.value)}
            options={["", "calm", "heal", "mobilise", "strengthen", "flourish"].map((x) => ({ value: x, label: x ? x.charAt(0).toUpperCase() + x.slice(1) : "Choose…" }))} />
        </div>
        {sectionNotes("dx")}
        {nav}
      </div>
    );
  }

  // ── Step: Plan & programme ────────────────────────────────────────────────
  const PLANS = [
    { id: "reset", name: "Reset", sessions: 18, price: 14900, validity: "3 months" },
    { id: "restore", name: "Restore", sessions: 30, price: 22900, validity: "6 months" },
    { id: "recover", name: "Recover", sessions: 50, price: 34900, validity: "9 months" },
    { id: "revive", name: "Revive", sessions: 75, price: 49900, validity: "12 months" },
    { id: "renew", name: "Renew", sessions: 110, price: 68900, validity: "12 months" },
  ];
  function sPlan() {
    const tx = path.id !== "gen" ? pathTx(A) : null;
    const pgm = regions[0] ? fullProgramme(A, regions[0], { noFloor: A.pgm?.noFloor, noBand: A.pgm?.noBand }) : null;
    const ppg = pathProgramme(A, { noFloor: A.pgm?.noFloor, noBand: A.pgm?.noBand });
    const thermoPick = suggestThermo(A);
    const txWarnings = txSafety(A, A.treat?.mods, hold);
    return (
      <div>
        <SectionHeader title="Plan and programme" subtitle="Choose a Recovery Investment Plan; the exercise programme is generated from your findings." />
        {hold.length > 0 && <div className="mt-4 p-4 rounded-xl text-sm font-semibold" style={{ background: tokens.errorBg, color: tokens.error }}>Programme on hold: {hold.join(" ")}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
          {PLANS.map((p) => (
            <button key={p.id} type="button" onClick={() => set("plan", p.id)} className="p-3 rounded-2xl text-left border"
              style={A.plan === p.id ? { borderColor: tokens.accent, background: "#FEF0E6" } : { borderColor: tokens.border }}>
              <div className="font-bold text-sm">{p.name}</div>
              <div className="text-xs" style={{ color: tokens.textMuted }}>{p.sessions} sessions · {p.validity}</div>
              <div className="text-sm font-black mt-1" style={{ color: tokens.primary }}>₹{p.price.toLocaleString("en-IN")}</div>
            </button>
          ))}
        </div>
        {A.plan && (() => {
          const p = PLANS.find((x) => x.id === A.plan)!;
          const first = Math.round(p.price * 0.7), rest = p.price - first;
          return <div className="text-xs mt-2" style={{ color: tokens.textMuted }}>70:30 option for {p.name}: ₹{first.toLocaleString("en-IN")} at the start, ₹{rest.toLocaleString("en-IN")} later.</div>;
        })()}

        {label("Exercise programme adjustments")}
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={!!A.pgm?.noFloor} onChange={() => setIn("pgm", "noFloor", !A.pgm?.noFloor)} /> Patient can&apos;t get down to the floor (leave out floor exercises)
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer mt-1">
          <input type="checkbox" checked={!!A.pgm?.noBand} onChange={() => setIn("pgm", "noBand", !A.pgm?.noBand)} /> No resistance band at home
        </label>

        {tx && (
          <div className="mt-6 p-4 rounded-2xl text-sm" style={{ background: tokens.surfaceAlt }}>
            <div className="font-bold mb-1">{path.n}: treatment focus</div>
            <ul className="list-disc ml-5">{tx.focus.map((x, i) => <li key={i}>{x}</li>)}</ul>
            {tx.dose && <div className="mt-2">{tx.dose}</div>}
            {tx.cautions.length > 0 && <div className="mt-2 font-semibold" style={{ color: tokens.warning }}>Cautions: {tx.cautions.join(" ")}</div>}
          </div>
        )}

        {!hold.length && pgm && (
          <div className="mt-6">
            <div className="font-bold text-sm mb-2">{regionName(pgm.region)} programme</div>
            {(["calm", "heal", "mobilise", "strengthen", "flourish"] as const).map((ph) => {
              const phc = pgm.phases[ph];
              if (!phc.clinic.length && !phc.home.length) return null;
              return (
                <div key={ph} className="mb-3">
                  <div className="text-xs font-bold uppercase tracking-widest" style={{ color: tokens.accent }}>{ph}</div>
                  <div className="text-xs mb-1" style={{ color: tokens.textMuted }}>{phc.goal}</div>
                  {phc.home.map((e, i) => (
                    <div key={i} className="text-sm py-0.5">• <b>{e.n}</b> <span style={{ color: tokens.textMuted }}>({e.d})</span></div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <Select label="Prognosis" value={A.prog.prognosis || ""} onChange={(e) => setIn("prog", "prognosis", e.target.value)}
            options={["", "Excellent", "Good", "Fair", "Guarded"].map((x) => ({ value: x, label: x || "Choose…" }))} />
          <Input label="Sessions / week" type="number" value={A.prog.freq || ""} onChange={(e) => setIn("prog", "freq", e.target.value)} />
          <Input label="Expected weeks" type="number" value={A.prog.weeks || ""} onChange={(e) => setIn("prog", "weeks", e.target.value)} />
        </div>

        {label("SMART goals")}
        <div className="flex flex-col gap-3">
          {A.goals.map((g, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input placeholder="Goal" value={g.t} onChange={(e) => set("goals", A.goals.map((x, j) => (j === i ? { ...x, t: e.target.value } : x)))} />
              <Input placeholder="How we'll measure it" value={g.m} onChange={(e) => set("goals", A.goals.map((x, j) => (j === i ? { ...x, m: e.target.value } : x)))} />
              <Input placeholder="By when" value={g.by} onChange={(e) => set("goals", A.goals.map((x, j) => (j === i ? { ...x, by: e.target.value } : x)))} />
            </div>
          ))}
        </div>

        {label("Heat / cold advice")}
        {thermoPick && (
          <div className="text-sm mb-2" style={{ color: thermoPick.caution ? tokens.warning : tokens.textSecondary }}>
            Suggested: <b>{THERMO[thermoPick.id]?.n}</b> — {thermoPick.why}{thermoPick.caution ? " (use with caution — check skin sensation first)" : ""}
          </div>
        )}
        <Select value={A.thermo || ""} onChange={(e) => set("thermo", e.target.value)}
          options={["", ...Object.keys(THERMO)].map((k) => ({ value: k, label: k ? THERMO[k].n : "Choose…" }))} className="max-w-xs" />
        {A.thermo && <div className="text-xs mt-1" style={{ color: tokens.textMuted }}>{THERMO[A.thermo]?.how}</div>}

        {label("Today's treatment")}
        {chips(TREAT_MODS, A.treat?.mods, (x) => togDeep("treat", "mods", x))}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <Input placeholder="Parameters (e.g. 10 min, grade II mobilisation)" value={A.treat?.params || ""} onChange={(e) => setIn("treat", "params", e.target.value)} />
          <Select label="Response to treatment" value={A.treat?.resp || ""} onChange={(e) => setIn("treat", "resp", e.target.value)}
            options={["", "Better after treatment", "No change", "Worse after treatment", "Too early to tell"].map((x) => ({ value: x, label: x || "Choose…" }))} />
        </div>
        {txWarnings.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5">
            {txWarnings.map((w, i) => (
              <div key={i} className="text-xs font-semibold p-2 rounded-lg" style={{ background: w.level === "avoid" ? tokens.errorBg : tokens.warningBg, color: w.level === "avoid" ? tokens.error : tokens.warning }}>
                {w.mods.join("/")} ({w.level}): {w.msg}
              </div>
            ))}
            <label className="flex items-center gap-2 text-sm mt-1">
              <input type="checkbox" checked={!!A.treat?.ack} onChange={() => setIn("treat", "ack", !A.treat?.ack)} /> Reviewed these safety notes
            </label>
          </div>
        )}
        {sectionNotes("plan")}
        {nav}
      </div>
    );
  }

  // ── Step: Report ───────────────────────────────────────────────────────────
  function sReport() {
    const TABS: Array<{ k: typeof reportTab; nm: string }> = [
      { k: "summary", nm: "Summary" },
      { k: "soap", nm: "SOAP" },
      { k: "programme", nm: "Programme" },
      { k: "lifestyle", nm: "Lifestyle" },
      { k: "patient", nm: "For the patient" },
      { k: "sessions", nm: "Sessions" },
    ];

    function downloadText(filename: string, content: string) {
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    }
    async function downloadPDF(filename: string, html: string) {
      if (pdfDownloading) return;
      setPdfDownloading(true);
      setSaveMsg("Preparing PDF…");
      const frame = document.createElement("iframe");
      frame.setAttribute("aria-hidden", "true");
      frame.style.cssText = "position:fixed;left:-10000px;top:0;width:850px;height:1200px;border:0;";
      try {
        const loaded = new Promise<void>((resolve, reject) => {
          frame.onload = () => resolve();
          frame.onerror = () => reject(new Error("Could not prepare the report for PDF export."));
        });
        frame.srcdoc = html;
        document.body.appendChild(frame);
        await loaded;
        const pdfDocument = frame.contentDocument;
        if (!pdfDocument?.body) throw new Error("Could not read the report for PDF export.");
        await Promise.all(Array.from(pdfDocument.images).map((image) => image.decode().catch(() => undefined)));
        await pdfDocument.fonts?.ready;
        const { default: html2pdf } = await import("html2pdf.js");
        const pdfName = filename.replace(/\.html?$/i, "").replace(/\.pdf$/i, "") + ".pdf";
        await html2pdf().set({
          margin: [0.35, 0.35, 0.4, 0.35],
          filename: pdfName,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff" },
          jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
        }).from(pdfDocument.body).save();
        setSaveMsg("PDF downloaded.");
      } catch (error) {
        console.error("Assessment PDF export failed", error);
        setSaveMsg("PDF could not be generated. Please try again or use Print → Save as PDF.");
      } finally {
        frame.remove();
        setPdfDownloading(false);
      }
    }
    function esc(s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;"); }
    function htmlShell(title: string, bodyHtml: string) {
      return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
        body{font-family:Arial, sans-serif;color:#3F170E;max-width:850px;margin:0 auto;padding:28px;line-height:1.55;background:#fff;}
        .letterhead{display:flex;align-items:center;justify-content:space-between;gap:18px;border-bottom:4px solid #D56A34;padding:0 0 16px;margin-bottom:22px;}
        .band{background:#3F170E;color:#FBF5EE;padding:16px 22px;flex:1;}
        .band h1{font-family:Georgia,serif;margin:0;font-weight:500;font-size:24px;} .band p{margin:4px 0 0;font-size:12px;opacity:.9;}
        .brand-logo{width:94px;height:72px;object-fit:contain;}
        h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#6E5148;border-bottom:1px solid #E7DED4;padding-bottom:4px;margin-top:28px;}
        p,li{font-size:14px;white-space:pre-wrap;} .muted{color:#A89990;font-size:12px;}
        .patient-meta{display:flex;flex-wrap:wrap;gap:4px 18px;padding:10px 0;border-bottom:1px solid #E7DED4;font-size:13px;}
        @media print{body{padding:0;}.letterhead{break-inside:avoid;}}
      </style></head><body>
        <header class="letterhead"><div class="band"><h1>Vyayāma Physio</h1><p>Physiotherapy · Kempapura, Bengaluru</p><p>Behind Anjaneya Temple, Yemalur, Bengaluru 560037</p><p>${esc(A.P.therapist || session?.user?.name || "")}${A.P.doctorReg ? ` · Reg. ${esc(A.P.doctorReg)}` : ""}</p></div><img class="brand-logo" src="${window.location.origin}/logo.png" alt="Vyayāma Physio logo"></header>
        ${bodyHtml}
      </body></html>`;
    }
    function buildReportHTML() {
      return htmlShell(`${A.P.name || "Patient"} — assessment report`, `
        <div class="patient-meta"><span><b>Patient:</b> ${esc(A.P.name || "")}</span><span><b>Age/sex:</b> ${esc(A.P.age || "–")}/${esc(A.P.gender || "–")}</span><span><b>Date:</b> ${esc(A.P.date || "")}</span><span><b>Assessed by:</b> ${esc(A.P.therapist || session?.user?.name || "")}</span>${A.P.doctorReg ? `<span><b>Registration:</b> ${esc(A.P.doctorReg)}</span>` : ""}</div>
        <h2>Subjective</h2><p>${esc(report.subjective)}</p>
        <h2>Objective</h2><p>${esc(report.objective)}</p>
        <h2>Assessment</h2><p>${esc(report.assessment)}</p>
        <h2>Plan</h2><p>${esc(report.plan)}</p>
        <h2>Provisional impressions</h2>${report.impressions.map((d) => `<p><b>${esc(d.dx)}</b> ${d.fit != null ? `(${d.fit}%)` : ""} — ${esc(d.icd10)}</p>`).join("")}
        ${Object.keys(A.consents || {}).length ? `<h2>Consent record</h2>${Object.entries(A.consents || {}).map(([key, c]) => `<p><b>${esc(key)}:</b> ${c.granted ? "Given" : "Not given / withdrawn"} · ${esc(new Date(c.at).toLocaleString("en-IN"))} · recorded by ${esc(c.by)}${c.relationship ? ` (${esc(c.relationship)})` : ""}</p>`).join("")}` : ""}
        <p class="muted">Physiotherapy impressions are provisional and based on today's examination.</p>
      `);
    }
    function buildPatientPackHTML() {
      const allProgrammes = [...(report.pathwayProgramme ? [report.pathwayProgramme] : []), ...report.programmes];
      const exList = allProgrammes.flatMap((p) => (["calm", "heal", "mobilise", "strengthen", "flourish"] as const).flatMap((ph) => [...p.phases[ph].clinic, ...p.phases[ph].home]));
      return htmlShell(`${A.P.name || "Patient"} — home programme`, `
        <p>Hi ${esc(A.P.name?.split(" ")[0] || "there")}, ${esc(patientCopy(A.P, "packIntro"))}</p>
        <h2>${esc(patientCopy(A.P, "summaryHeading"))}</h2><p>${esc(report.patientStory)}</p>
        <h2>${esc(patientCopy(A.P, "exercisesHeading"))}</h2>${exList.filter((e) => !A.pgm?.off?.[e.n]).map((e) => `<p><b>${esc(e.n)}</b> — ${esc(e.d)}<br/><span class="muted">${esc(e.c)}</span></p>`).join("") || "<p>Exercises to follow once regions are examined.</p>"}
        <h2>${esc(patientCopy(A.P, "lifestyleHeading"))}</h2>${report.lifestyle.map((s) => `<p><b>${esc(s.h)}</b></p><ul>${s.items.map((it) => `<li>${esc(it)}</li>`).join("")}</ul>`).join("")}
        ${(A.safetyNet || A.regions.includes("lumbar") || A.regions.includes("hip")) ? `<h2>${esc(patientCopy(A.P, "urgentHeading"))}</h2><p>${esc(patientCopy(A.P, "safetyNet"))}</p>` : ""}
        <p class="muted">Kempapura, behind Anjaneya Temple, Yemalur, Bengaluru 560037</p>
      `);
    }
    function toggleEx(name: string) {
      const off = A.pgm?.off || {};
      setIn("pgm", "off", { ...off, [name]: !off[name] });
    }
    function startSession() { set("sdraft", newSession(A)); }
    function saveSession() {
      if (!A.sdraft) return;
      set("sessions", [...(A.sessions || []), A.sdraft]);
      set("sdraft", undefined);
    }
    function addAddendum(sessionId: number, text: string) {
      if (!text.trim()) return;
      set("sessions", (A.sessions || []).map((s) => (s.id === sessionId
        ? { ...s, addenda: [...(s.addenda || []), { at: new Date().toISOString(), by: A.P.therapist || "", text }] }
        : s)));
    }
    function startReassessment() {
      const today = new Date().toISOString().slice(0, 10);
      const carriedBaseline = A.baseline || snapshot(A);
      setA((a) => ({
        ...createInitialState(),
        P: { ...a.P, visit: "review", date: today },
        path: a.path,
        goals: a.goals,
        plan: a.plan,
        baseline: carriedBaseline,
        sessions: a.sessions || [],
      }));
      setStep(0); setSavedId(null); setSaveMsg(""); setReportTab("summary"); setWhatsappDraft(null); setLetterDraft(null);
    }

    const soapText = [`S: ${report.subjective}`, `O: ${report.objective}`, `A: ${report.assessment}`, `P: ${report.plan}`].join("\n\n");
    const allProgrammes = [...(report.pathwayProgramme ? [report.pathwayProgramme] : []), ...report.programmes];
    const prescribedExNames = [...new Set(allProgrammes.flatMap((p) => (["calm", "heal", "mobilise", "strengthen", "flourish"] as const).flatMap((ph) => [...p.phases[ph].clinic, ...p.phases[ph].home].map((e) => e.n))))];

    return (
      <div>
        <style>{"@media print { .no-print { display: none !important; } }"}</style>
        <SectionHeader title="Assessment report" subtitle="Deterministic, rule-based — review before saving." />
        <div className="mt-3 no-print">
          <Badge variant={A.reviewed ? "success" : "warning"}>{A.reviewed ? "Reviewed" : "Not yet reviewed"}</Badge>
          {!A.reviewed && <button type="button" className="ml-3 text-xs font-semibold" style={{ color: tokens.accent }} onClick={() => set("reviewed", true)}>I&apos;ve reviewed this</button>}
        </div>
        <div className="flex gap-2 flex-wrap mt-4 no-print">
          {TABS.map((t) => (
            <button key={t.k} type="button" onClick={() => setReportTab(t.k)}
              className="px-3 py-1.5 rounded-full text-xs font-bold border"
              style={reportTab === t.k ? { background: tokens.accent, color: "#fff", borderColor: tokens.accent } : { borderColor: tokens.border, color: tokens.textMuted }}>
              {t.nm}
            </button>
          ))}
        </div>

        {report.hold.length > 0 && <div className="mt-4 p-4 rounded-xl text-sm font-semibold" style={{ background: tokens.errorBg, color: tokens.error }}>{report.hold.join(" ")}</div>}

        {reportTab === "summary" && (
          <div className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><div className="text-xs font-bold uppercase" style={{ color: tokens.textMuted }}>Load</div><div className="text-sm">{report.loadClass || "–"}</div></div>
              <div><div className="text-xs font-bold uppercase" style={{ color: tokens.textMuted }}>Stage</div><div className="text-sm">{report.stage || "–"}</div></div>
              <div><div className="text-xs font-bold uppercase" style={{ color: tokens.textMuted }}>Irritability</div><div className="text-sm">{report.irritability || "–"}</div></div>
              <div><div className="text-xs font-bold uppercase" style={{ color: tokens.textMuted }}>Pathway</div><div className="text-sm">{pathOf(A).n}</div></div>
            </div>

            {report.pillars?.total != null && (
              <div className="mt-4 p-4 rounded-2xl flex items-center gap-4" style={{ background: tokens.surfaceAlt }}>
                <div className="text-3xl font-black" style={{ color: tokens.primary }}>{report.pillars.total}<span className="text-sm font-medium">/100</span></div>
                <div className="text-sm font-semibold">{report.pillars.grade}</div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3">
              {report.impressions.map((d, i) => (
                <div key={i} className="p-3 rounded-xl" style={{ background: tokens.surfaceAlt }}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{d.dx}</span>
                    {d.fit != null && <Badge variant={d.fit >= 60 ? "success" : d.fit >= 40 ? "warning" : "neutral"}>{d.fit}%</Badge>}
                  </div>
                  <div className="text-xs mt-1" style={{ color: tokens.textMuted }}>{d.icd10}{d.icd11 ? ` · ${d.icd11}` : ""}</div>
                  {d.refer && <div className="text-xs mt-1 font-semibold" style={{ color: tokens.error }}>Referral: {d.referNote}</div>}
                </div>
              ))}
              {report.impressions.length === 0 && <div className="text-sm" style={{ color: tokens.textMuted }}>No provisional diagnosis selected.</div>}
            </div>

            {report.investmentPlan && (
              <div className="mt-6 text-sm"><b>Recovery Investment Plan:</b> {report.investmentPlan.name} — {report.investmentPlan.sessions} sessions, ₹{report.investmentPlan.price.toLocaleString("en-IN")}</div>
            )}
            {report.txSafety.length > 0 && (
              <div className="mt-4 flex flex-col gap-1.5">
                {report.txSafety.map((w, i) => (
                  <div key={i} className="text-xs font-semibold p-2 rounded-lg" style={{ background: w.level === "avoid" ? tokens.errorBg : tokens.warningBg, color: w.level === "avoid" ? tokens.error : tokens.warning }}>
                    {w.mods.join("/")} ({w.level}): {w.msg}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {reportTab === "soap" && (
          <div className="mt-4">
            <Card><CardHeader><span className="font-bold text-sm">S · Subjective</span></CardHeader><CardBody><p className="text-sm whitespace-pre-wrap">{report.subjective}</p></CardBody></Card>
            <Card className="mt-4"><CardHeader><span className="font-bold text-sm">O · Objective</span></CardHeader><CardBody><p className="text-sm whitespace-pre-wrap">{report.objective}</p></CardBody></Card>
            <Card className="mt-4"><CardHeader><span className="font-bold text-sm">A · Assessment</span></CardHeader><CardBody><p className="text-sm whitespace-pre-wrap">{report.assessment}</p></CardBody></Card>
            <Card className="mt-4"><CardHeader><span className="font-bold text-sm">P · Plan</span></CardHeader><CardBody><p className="text-sm whitespace-pre-wrap">{report.plan}</p></CardBody></Card>
            <div className="flex gap-3 mt-4 no-print">
              <Button variant="secondary" onClick={() => downloadText(`${A.P.name || "patient"}-soap.txt`, soapText)}>Download SOAP (.txt)</Button>
              <Button variant="secondary" disabled={pdfDownloading} onClick={() => void downloadPDF(`${A.P.name || "patient"}-report.pdf`, buildReportHTML())}>{pdfDownloading ? "Preparing PDF…" : "Download report (PDF)"}</Button>
              <Button variant="ghost" onClick={() => window.print()}>Print</Button>
            </div>
          </div>
        )}

        {reportTab === "programme" && (
          <div className="mt-4">
            {allProgrammes.map((pgmR, pi) => (
              <div key={pi} className="mb-6">
                <div className="font-black text-sm mb-2" style={{ color: tokens.primary }}>{pgmR.region === "path" ? `${pathOf(A).n} programme` : `${regionName(pgmR.region)} programme`}</div>
                {(["calm", "heal", "mobilise", "strengthen", "flourish"] as const).map((ph) => {
                  const phc = pgmR.phases[ph];
                  if (!phc.clinic.length && !phc.home.length) return null;
                  return (
                    <div key={ph} className="mb-3">
                      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: tokens.accent }}>{ph}</div>
                      <div className="text-xs mb-1" style={{ color: tokens.textMuted }}>{phc.goal}</div>
                      {[...phc.clinic, ...phc.home].map((e, i) => (
                        <label key={i} className="flex items-start gap-2 text-sm py-0.5 cursor-pointer">
                          <input type="checkbox" className="mt-1" checked={!A.pgm?.off?.[e.n]} onChange={() => toggleEx(e.n)} />
                          <span><b>{e.n}</b> <span style={{ color: tokens.textMuted }}>({e.d})</span> — {e.c}</span>
                        </label>
                      ))}
                    </div>
                  );
                })}
                {pgmR.cautions.length > 0 && <div className="text-xs mt-2 font-semibold" style={{ color: tokens.warning }}>Cautions: {pgmR.cautions.join(" ")}</div>}
              </div>
            ))}
            {allProgrammes.length === 0 && <div className="text-sm" style={{ color: tokens.textMuted }}>{report.hold.length ? "Programme withheld — see the warning above." : "No programme yet."}</div>}
          </div>
        )}

        {reportTab === "lifestyle" && (
          <div className="mt-4 flex flex-col gap-6">
            {report.rootCauses.length > 0 && (
              <div><div className="font-bold text-sm mb-2">Root causes</div>{report.rootCauses.map((r, i) => <div key={i} className="text-sm mb-2"><b>{r.t}</b> — {r.why} {r.fix}</div>)}</div>
            )}
            {report.lifestyle.map((s, i) => (
              <div key={`l${i}`}><div className="font-bold text-sm mb-1">{s.h}</div><ul className="list-disc ml-5 text-sm">{s.items.map((it, j) => <li key={j}>{it}</li>)}</ul></div>
            ))}
            {report.ergonomics.map((s, i) => (
              <div key={`e${i}`}><div className="font-bold text-sm mb-1">{s.h}</div><ul className="list-disc ml-5 text-sm">{s.items.map((it, j) => <li key={j}>{it}</li>)}</ul></div>
            ))}
            {report.stressPlan && (
              <div>
                <div className="font-bold text-sm mb-1">Stress and sleep</div>
                {report.stressPlan.sections.map((s, i) => (
                  <div key={i} className="mb-2"><div className="text-sm font-semibold">{s.h}</div><ul className="list-disc ml-5 text-sm">{s.items.map((it, j) => <li key={j}>{it}</li>)}</ul></div>
                ))}
              </div>
            )}
            {report.thermo && (
              <div><div className="font-bold text-sm mb-1">Heat / cold advice</div><div className="text-sm">{report.thermo.name}: {report.thermo.how} — {report.thermo.why}</div></div>
            )}
            {Object.keys(report.outcomeMeasures).length > 0 && (
              <div>
                <div className="font-bold text-sm mb-1">Outcome measures</div>
                {Object.values(report.outcomeMeasures).map((o, i) => <div key={i} className="text-sm">{o.text}</div>)}
              </div>
            )}
          </div>
        )}

        {reportTab === "patient" && (
          <div className="mt-4 flex flex-col gap-6">
            {report.patientStory && <Card><CardHeader><span className="font-bold text-sm">Patient summary</span></CardHeader><CardBody><p className="text-sm">{report.patientStory}</p></CardBody></Card>}

            <div>
              <div className="flex items-center justify-between">
                <div className="font-bold text-sm mb-1">WhatsApp message</div>
                {whatsappDraft != null && <button type="button" className="text-xs font-semibold no-print" style={{ color: tokens.accent }} onClick={() => setWhatsappDraft(null)}>Reset to generated</button>}
              </div>
              <Textarea rows={4} value={whatsappDraft ?? report.whatsapp} onChange={(e) => setWhatsappDraft(e.target.value)} />
              <div className="flex gap-3 mt-2 no-print">
                <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(whatsappDraft ?? report.whatsapp)}>Copy</Button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <div className="font-bold text-sm mb-1">Doctor's letter</div>
                {letterDraft != null && <button type="button" className="text-xs font-semibold no-print" style={{ color: tokens.accent }} onClick={() => setLetterDraft(null)}>Reset to generated</button>}
              </div>
              <Textarea rows={10} value={letterDraft ?? report.doctorLetter} onChange={(e) => setLetterDraft(e.target.value)} />
              <div className="flex gap-3 mt-2 no-print">
                <Button variant="secondary" onClick={() => downloadText(`${A.P.name || "patient"}-doctor-letter.txt`, letterDraft ?? report.doctorLetter)}>Download</Button>
                <Button variant="ghost" onClick={() => window.print()}>Print</Button>
              </div>
            </div>

            <div className="no-print">
              <Button variant="secondary" disabled={pdfDownloading} onClick={() => void downloadPDF(`${A.P.name || "patient"}-home-plan.pdf`, buildPatientPackHTML())}>{pdfDownloading ? "Preparing PDF…" : "Download patient pack (PDF)"}</Button>
            </div>
          </div>
        )}

        {reportTab === "sessions" && (
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div className="font-bold text-sm">Baseline</div>
              <Button variant="secondary" onClick={() => set("baseline", snapshot(A))}>{A.baseline ? "Update baseline from today" : "Set today as baseline"}</Button>
            </div>
            {linkedPatientId && <div className="mt-3">
              <Select label="Compare with an earlier saved assessment" value={A.baseline?.from || ""} onChange={(e) => void loadPriorAssessment(e.target.value)}
                options={[{ value: "", label: priorAssessmentLoading ? "Loading assessments…" : "Choose an earlier assessment…" }, ...priorAssessments.filter((x) => x.id !== savedId).map((x) => ({ value: x.id, label: `${new Date(x.createdAt).toLocaleDateString("en-IN")} · ${x.primaryComplaint || x.pathway || "Assessment"} · ${x.status.toLowerCase()}` }))]} />
              {!priorAssessmentLoading && priorAssessments.length === 0 && <p className="text-xs mt-1" style={{ color: tokens.textMuted }}>No earlier saved assessments were found for this patient.</p>}
            </div>}
            {A.baseline && <div className="text-xs mt-1" style={{ color: tokens.textMuted }}>Recorded {A.baseline.date}: NRS {A.baseline.nrs ?? "–"}, PSFS {A.baseline.psfs ?? "–"}, Mobility {A.baseline.mob ?? "–"}; {Object.keys(A.baseline.fx || {}).length} measured tests captured.</div>}

            {report.progress.length > 0 && (
              <div className="mt-4">
                <div className="font-bold text-sm mb-2">Progress since baseline</div>
                <div className="flex flex-col gap-1">
                  {report.progress.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1" style={{ borderBottom: `1px solid ${tokens.border}` }}>
                      <span>{r.label}</span>
                      <span>{r.base ?? "–"} → {r.now ?? "–"} {r.change != null && <b style={{ color: r.better ? tokens.success : tokens.error }}>({r.change > 0 ? "+" : ""}{r.change})</b>}{r.met && <Badge variant="success" className="ml-2">MCID met</Badge>}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8">
              <div className="flex items-center justify-between">
                <div className="font-bold text-sm">Today&apos;s session note</div>
                {!A.sdraft && <Button variant="secondary" onClick={startSession}>Start session {(A.sessions?.length || 0) + 1}</Button>}
              </div>
              {A.sdraft && (() => {
                const sd: SessionNote = A.sdraft;
                return (
                  <div className="mt-3 flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input label="Date" type="date" value={sd.date || ""} onChange={(e) => set("sdraft", { ...sd, date: e.target.value })} />
                      <Input label="Treated by" value={sd.therapist || ""} onChange={(e) => set("sdraft", { ...sd, therapist: e.target.value })} />
                      <Select label="Phase" value={sd.phase || ""} onChange={(e) => set("sdraft", { ...sd, phase: e.target.value as SessionNote["phase"] })}
                        options={["", "calm", "heal", "mobilise", "strengthen", "flourish"].map((x) => ({ value: x, label: x ? x.charAt(0).toUpperCase() + x.slice(1) : "Choose…" }))} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input label="Pain before (NRS)" type="number" value={sd.nrsPre ?? ""} onChange={(e) => set("sdraft", { ...sd, nrsPre: e.target.value === "" ? null : Number(e.target.value) })} />
                      <Input label="Pain after (NRS)" type="number" value={sd.nrsPost ?? ""} onChange={(e) => set("sdraft", { ...sd, nrsPost: e.target.value === "" ? null : Number(e.target.value) })} />
                    </div>

                    <div className="text-sm font-medium mb-1">Treatment given</div>
                    {chips(TREAT_MODS, sd.mods, (x) => set("sdraft", { ...sd, mods: tog(sd.mods, x) }))}
                    <Input placeholder="Parameters and areas (e.g. IFT 4 kHz 15 min L-spine; grade III PA L4–5; DN R glute med)" value={sd.params || ""} onChange={(e) => set("sdraft", { ...sd, params: e.target.value })} />

                    <div className="text-sm font-medium mb-1 mt-2">Exercises done today</div>
                    {prescribedExNames.length
                      ? chips(prescribedExNames, sd.ex, (x) => set("sdraft", { ...sd, ex: tog(sd.ex, x) }))
                      : <div className="text-xs" style={{ color: tokens.textMuted }}>No programme generated yet to pick exercises from.</div>}

                    <div className="text-sm font-medium mb-1 mt-2">Re-test (optional)</div>
                    <div className="text-xs mb-1" style={{ color: tokens.textMuted }}>Repeat a test from the assessment the same way.</div>
                    <Select value={retestPick} onChange={(e) => setRetestPick(e.target.value)} className="max-w-xs"
                      options={["", ...Object.keys(A.fx)].map((id) => ({ value: id, label: id ? FXI[id]?.n || id : "Choose a test…" }))} />
                    {retestPick && FXI[retestPick] && (
                      <FxTestCard A={A} t={FXI[retestPick]} d={sd.retest?.[retestPick] || {}}
                        onUpdate={(next) => set("sdraft", { ...sd, retest: { ...(sd.retest || {}), [retestPick]: next } })} />
                    )}

                    <Select label="Home programme adherence" value={sd.hep || ""} onChange={(e) => set("sdraft", { ...sd, hep: e.target.value })}
                      options={["", ...HEP_ADH].map((x) => ({ value: x, label: x || "Choose…" }))} />
                    <Select label="Response to session" value={sd.resp || ""} onChange={(e) => set("sdraft", { ...sd, resp: e.target.value })}
                      options={["", ...RESP_OPTS].map((x) => ({ value: x, label: x || "Choose…" }))} />
                    <Select label="Adverse reaction" value={sd.adverse || "None"} onChange={(e) => set("sdraft", { ...sd, adverse: e.target.value })}
                      options={ADVERSE_OPTS.map((x) => ({ value: x, label: x }))} />
                    <Textarea label="Notes" rows={2} value={sd.notes || ""} onChange={(e) => set("sdraft", { ...sd, notes: e.target.value })} />
                    <Textarea label="Plan for next session" rows={2} value={sd.next || ""} onChange={(e) => set("sdraft", { ...sd, next: e.target.value })} />
                    <div className="flex gap-3">
                      <Button onClick={saveSession}>Save session</Button>
                      <Button variant="ghost" onClick={() => { set("sdraft", undefined); setRetestPick(""); }}>Discard</Button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {(A.sessions || []).length > 0 && (
              <div className="mt-8">
                <div className="font-bold text-sm mb-2">Session history</div>
                <div className="flex flex-col gap-3">
                  {(A.sessions || []).slice().reverse().map((s) => (
                    <div key={s.id} className="p-3 rounded-xl text-sm" style={{ background: tokens.surfaceAlt }}>
                      <p className="whitespace-pre-wrap">{sessionText(A, s)}</p>
                      <div className="flex gap-2 mt-2 no-print">
                        <Input placeholder="Add an addendum…" value={addendumDraft[s.id] || ""} className="flex-1"
                          onChange={(e) => setAddendumDraft((d) => ({ ...d, [s.id]: e.target.value }))} />
                        <Button variant="secondary" onClick={() => { addAddendum(s.id, addendumDraft[s.id] || ""); setAddendumDraft((d) => ({ ...d, [s.id]: "" })); }}>Add</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 mt-8 no-print">
          <Button variant="secondary" disabled={saving} onClick={() => saveAssessment("DRAFT")}>{saving ? "Saving…" : "Save draft"}</Button>
          <Button disabled={saving || !linkedPatientId || !consentReady} title={!linkedPatientId ? "Link a CRM patient first" : !consentReady ? "Record required consent before publishing" : ""} onClick={() => saveAssessment("PUBLISHED")}>
            {saving ? "Publishing…" : "Publish to patient"}
          </Button>
          {saveMsg && <span className="text-sm font-semibold">{saveMsg}</span>}
        </div>
        {!consentReady && <p className="mt-2 text-xs no-print" style={{ color: tokens.warning }}>Publishing requires privacy and assessment consent. Patients under 18 also require guardian name, relationship, and consent.</p>}
        <div className="mt-5 p-4 rounded-xl no-print" style={{ background: tokens.surfaceAlt, border: `1px solid ${tokens.border}` }}>
          <div className="font-bold text-sm">Assessment backup</div>
          <p className="text-xs mt-1 mb-3" style={{ color: tokens.textMuted }}>Export this assessment as JSON or load a previously exported backup. Imported data is not saved to the clinic until you choose Save draft.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={exportAssessment}>Download backup</Button>
            <label className="text-xs font-semibold">
              Restore backup file
              <input className="block mt-1 text-xs" type="file" accept="application/json,.json" onChange={(e) => { void importAssessment(e.target.files?.[0]); e.currentTarget.value = ""; }} />
            </label>
          </div>
        </div>
        {savedId && <div className="mt-3"><Badge variant="success">Saved (…{savedId.slice(-6)})</Badge></div>}
        <div className="flex gap-3 mt-6 no-print">
          <Button variant="ghost" onClick={startReassessment}>Start reassessment</Button>
          <Button variant="ghost" onClick={() => { setA(createInitialState()); setStep(0); setSavedId(null); setSaveMsg(""); setLinkedPatientId(""); setPatientSearch(""); setWhatsappDraft(null); setLetterDraft(null); setReportTab("summary"); }}>New assessment</Button>
        </div>
        <div className="mt-8 no-print"><Button variant="ghost" onClick={() => setStep(0)}>Back to start</Button></div>
      </div>
    );
  }

  const RENDER: Record<string, () => React.ReactNode> = {
    patient: sPatient, safety: sSafety, story: sStory, history: sHistory, exam: sExam, tests: sTests, forms: sForms, dx: sDx, plan: sPlan, report: sReport,
  };

  if (authStatus === "loading") return <PageWrapper><div className="p-10"><Spinner /></div></PageWrapper>;

  return (
    <PageWrapper>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex gap-2 flex-wrap mb-6">
          {STEPS.map((s, i) => (
            <button key={s.k} type="button" onClick={() => setStep(i)}
              className="px-3 py-1.5 rounded-full text-xs font-bold border"
              style={i === step ? { background: tokens.primary, color: "#fff", borderColor: tokens.primary } : { borderColor: tokens.border, color: tokens.textMuted }}>
              {i + 1}. {s.nm}
            </button>
          ))}
        </div>
        <Card padding="lg">
          <CardBody>
            {RENDER[STEPS[step].k]()}
          </CardBody>
        </Card>
      </div>
    </PageWrapper>
  );
}
