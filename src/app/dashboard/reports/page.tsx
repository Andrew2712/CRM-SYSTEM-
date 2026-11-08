"use client";

/**
 * src/app/dashboard/reports/page.tsx
 *
 * Assessment Reports Viewer — Doctor & Admin.
 * Renders the deterministic report produced by src/lib/assessment/reportBuilder
 * and persisted as aiDiagnosis / aiDocuments JSON by POST /api/assessments.
 */

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  FileText, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Clock, Archive,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Impression {
  likelihood: string; dx: string; icd10: string; icd11?: string; icf?: string;
  fit: number | null; why: string; further?: string; refer?: boolean; referNote?: string;
}
interface RedFlagGroup { id: string; n: string; level: string; action: string }
interface AiDiagnosis {
  schemaVersion?: number;
  impressions?: Impression[];
  redFlags?: RedFlagGroup[];
  hold?: string[];
  pillars?: { total: number | null; grade: string } | null;
  outcomeMeasures?: Record<string, { label: string; score: number | null; text: string }>;
  loadClass?: string; stage?: string; irritability?: string;
}
interface Exercise { n: string; d: string; c: string; why: string }
interface PhaseContent { clinic: Exercise[]; home: Exercise[] }
interface RegionProgramme { region: string; phases: Record<string, PhaseContent>; avoid: string[] }
interface AiDocuments {
  schemaVersion?: number;
  subjective?: string; objective?: string; assessment?: string; plan?: string;
  programmes?: RegionProgramme[];
  pathwayProgramme?: RegionProgramme | null;
  rootCauses?: Array<{ t: string; why: string; fix: string }>;
  patientStory?: string; whatsapp?: string;
  cautions?: string[]; avoid?: string[];
  investmentPlan?: { name: string; sessions: number; price: number } | null;
}

interface Assessment {
  id: string;
  patientId: string | null;
  doctorId: string;
  pathway: string | null;
  primaryComplaint: string | null;
  nrsScore: number | null;
  ndiScore: number | null;
  mobilityScore: number | null;
  mobilityGrade: string | null;
  primaryDiagnosis: string | null;
  primaryDxIcd: string | null;
  diagnosisConfidence: number | null;
  irritability: string | null;
  stage: string | null;
  investmentPlan: string | null;
  hasRedFlags: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt: string | null;
  createdAt: string;
  patient: { name: string; patientCode: string; age: number | null } | null;
  doctor: { name: string };
}
interface FullAssessment extends Assessment {
  patient: (Assessment["patient"] & { gender?: string | null; phone?: string | null }) | null;
  aiDiagnosis?: AiDiagnosis | null;
  aiDocuments?: AiDocuments | null;
}

const PATHWAY_NAME: Record<string, string> = {
  gen: "General MSK", quick: "Quick consult", desk: "Workstation & ergonomics", corp: "Corporate screening",
  sport: "Sports & active", kids: "Children & adolescents", women: "Women's health", senior: "Senior & falls",
  preop: "Pre-operative", postop: "Post-operative", neuro: "Neuro rehab", chronic: "Persistent pain",
};

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  DRAFT:     { label: "Draft",     className: "bg-[#F4EFE6] text-[#8A7055] border border-[#DDD3C0]",   icon: <Clock      className="h-3 w-3" /> },
  PUBLISHED: { label: "Published", className: "bg-[#EFF9F3] text-[#1E6640] border border-[#96D4B0]",   icon: <CheckCircle className="h-3 w-3" /> },
  ARCHIVED:  { label: "Archived",  className: "bg-[#FFF8E6] text-[#9A6A00] border border-[#F0D080]",   icon: <Archive    className="h-3 w-3" /> },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.className}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-[#EDE8DF]" />
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#8A7055] px-1">{title}</h4>
        <div className="h-px flex-1 bg-[#EDE8DF]" />
      </div>
      {children}
    </div>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex gap-2 text-sm mb-1.5">
      <span className="text-[#8A7055] min-w-[150px] shrink-0 text-xs">{label}</span>
      <span className="text-[#2C150A] font-semibold text-xs">{value}</span>
    </div>
  );
}

// ─── Outcome Measures Table (dynamic — whichever questionnaire was administered) ──

function OutcomeTable({ assessment }: { assessment: FullAssessment }) {
  const measures = assessment.aiDiagnosis?.outcomeMeasures || {};
  const keys = Object.keys(measures);
  if (!keys.length) {
    return <p className="text-xs text-[#8A7055] italic">No region-specific questionnaire was recorded for this assessment.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-[#DDD3C0]">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-[#F4EFE6]">
            {["Measure", "Score", "Interpretation"].map((h) => (
              <th key={h} className="text-left px-3 py-2.5 font-bold text-[#3D1A0E] border-b border-[#DDD3C0] text-[11px] uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {keys.map((k, i) => {
            const m = measures[k];
            return (
              <tr key={k} className={i % 2 === 0 ? "bg-white" : "bg-[#F9F6F1]"}>
                <td className="px-3 py-2.5 border-b border-[#EDE8DF] font-bold text-[#C4622D]">{m.label}</td>
                <td className="px-3 py-2.5 border-b border-[#EDE8DF] font-semibold text-[#2C150A]">{m.score != null ? m.score : "—"}</td>
                <td className="px-3 py-2.5 border-b border-[#EDE8DF] text-[#8A7055]">{m.text}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Full Report Expanded Panel ───────────────────────────────────────────────

function ReportPanel({ assessment }: { assessment: FullAssessment }) {
  const ai = assessment.aiDiagnosis;
  const docs = assessment.aiDocuments;
  const isLegacy = ai?.schemaVersion == null && docs?.schemaVersion == null;

  if (isLegacy) {
    return (
      <div className="mt-3 pt-4 border-t border-[#EDE8DF]">
        <div className="bg-[#FFF8E6] border border-[#F0D080] rounded-xl p-4 text-sm text-[#9A6A00]">
          This assessment was saved by an earlier version of the tool and can&apos;t be rendered in full here.
          Basic details are shown below; open the raw record if you need everything from the original report.
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-0.5 bg-[#F9F6F1] rounded-xl p-3 border border-[#EDE8DF] mt-3">
          <KV label="Primary Diagnosis" value={assessment.primaryDiagnosis} />
          <KV label="ICD Code" value={assessment.primaryDxIcd} />
          <KV label="NRS Pain Score" value={assessment.nrsScore != null ? `${assessment.nrsScore}/10` : null} />
          <KV label="Investment Plan" value={assessment.investmentPlan} />
        </div>
      </div>
    );
  }

  const impressions = ai?.impressions || [];
  const redFlags = (ai?.redFlags || []).filter((g) => g.level !== "None");

  return (
    <div className="mt-3 pt-4 border-t border-[#EDE8DF] space-y-1">
      <Section title="Patient & Session">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-0.5 bg-[#F9F6F1] rounded-xl p-3 border border-[#EDE8DF]">
          <KV label="Patient" value={assessment.patient?.name ?? "—"} />
          <KV label="Patient Code" value={assessment.patient?.patientCode ?? "—"} />
          <KV label="Age" value={assessment.patient?.age ? `${assessment.patient.age} yrs` : null} />
          <KV label="Doctor" value={assessment.doctor.name} />
          <KV label="Date" value={new Date(assessment.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} />
          <KV label="Pathway" value={assessment.pathway ? PATHWAY_NAME[assessment.pathway] || assessment.pathway : "General MSK"} />
          <KV label="Status" value={<StatusBadge status={assessment.status} />} />
        </div>
      </Section>

      <Section title="Clinical Summary">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-0.5 bg-[#F9F6F1] rounded-xl p-3 border border-[#EDE8DF]">
          <KV label="Primary Complaint" value={assessment.primaryComplaint} />
          <KV label="Primary Diagnosis" value={assessment.primaryDiagnosis} />
          <KV label="ICD Code" value={assessment.primaryDxIcd} />
          <KV label="Fit" value={assessment.diagnosisConfidence != null ? `${assessment.diagnosisConfidence}%` : null} />
          <KV label="NRS Pain Score" value={assessment.nrsScore !== null ? `${assessment.nrsScore}/10` : null} />
          <KV label="Mobility Score" value={ai?.pillars?.total != null ? `${ai.pillars.total}/100` : null} />
          <KV label="Mobility Grade" value={ai?.pillars?.grade || assessment.mobilityGrade} />
          <KV label="Irritability" value={ai?.irritability || assessment.irritability} />
          <KV label="Stage" value={ai?.stage || assessment.stage} />
          <KV label="Load classification" value={ai?.loadClass} />
          <KV label="Investment Plan" value={assessment.investmentPlan} />
          <KV label="Red Flags" value={assessment.hasRedFlags ? <span className="text-[#A83030] font-bold">⚠️ Yes</span> : <span className="text-[#1E6640]">None</span>} />
        </div>
      </Section>

      <Section title="Outcome Measures">
        <OutcomeTable assessment={assessment} />
      </Section>

      {impressions.length > 0 && (
        <Section title="Provisional Diagnoses">
          <div className="space-y-2">
            {impressions.map((d, i) => (
              <div key={i} className="bg-[#F9F6F1] rounded-xl p-3 border border-[#EDE8DF]">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] font-bold uppercase text-[#8A7055]">{d.likelihood}</span>
                  <span className="font-bold text-[#2C150A] text-xs">{d.dx}</span>
                  <span className="text-[10px] text-[#C4622D] bg-[#FDF3EC] border border-[#E8C8A8] px-2 py-0.5 rounded-full">{d.icd10}{d.icd11 ? ` / ${d.icd11}` : ""}</span>
                  {d.fit != null && (
                    <span className="ml-auto text-[10px] bg-[#EFF9F3] text-[#1E6640] border border-[#96D4B0] px-2 py-0.5 rounded-full font-semibold">{d.fit}% fit</span>
                  )}
                </div>
                {d.why && <p className="text-[11px] text-[#8A7055]">{d.why}</p>}
                {d.refer && <p className="text-[11px] text-[#A83030] font-semibold mt-1">Referral: {d.referNote}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {docs?.subjective || docs?.objective || docs?.assessment || docs?.plan ? (
        <Section title="SOAP Note">
          <div className="grid md:grid-cols-2 gap-2">
            {[
              { v: docs?.subjective, label: "S — Subjective" },
              { v: docs?.objective, label: "O — Objective" },
              { v: docs?.assessment, label: "A — Assessment" },
              { v: docs?.plan, label: "P — Plan" },
            ].map(({ v, label }) => v ? (
              <div key={label} className="bg-[#F9F6F1] rounded-xl p-3 border border-[#EDE8DF]">
                <div className="text-[10px] font-bold text-[#C4622D] uppercase tracking-wide mb-1.5">{label}</div>
                <p className="text-xs text-[#3D1A0E] leading-relaxed">{v}</p>
              </div>
            ) : null)}
          </div>
        </Section>
      ) : null}

      {docs?.rootCauses && docs.rootCauses.length > 0 && (
        <Section title="Root causes and drivers">
          <div className="space-y-2">
            {docs.rootCauses.map((r, i) => (
              <div key={i} className="bg-[#F9F6F1] rounded-xl p-3 border border-[#EDE8DF]">
                <div className="font-bold text-[#2C150A] text-xs">{r.t}</div>
                <p className="text-[11px] text-[#8A7055] mt-0.5">{r.why}</p>
                <p className="text-[11px] text-[#1E6640] mt-0.5">Fix: {r.fix}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {redFlags.length > 0 && (
        <Section title="Safety screen">
          <div className="bg-[#FDF0F0] border border-[#E8B8B8] rounded-xl p-3">
            <ul className="space-y-1">
              {redFlags.map((f, i) => (
                <li key={i} className="text-xs text-[#A83030] flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /><b>{f.n} ({f.level}):</b>&nbsp;{f.action}
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      {(docs?.programmes || []).concat(docs?.pathwayProgramme ? [docs.pathwayProgramme] : []).map((pg, pi) => (
        <Section key={pi} title={`Exercise programme — ${pg.region === "path" ? "pathway" : pg.region}`}>
          {Object.entries(pg.phases).map(([phase, content]) => (
            (content.home.length > 0 || content.clinic.length > 0) && (
              <div key={phase} className="mb-2">
                <div className="text-[10px] font-bold text-[#C4622D] uppercase tracking-wide mb-1">{phase}</div>
                <div className="grid md:grid-cols-2 gap-2">
                  {content.home.map((ex, i) => (
                    <div key={i} className="bg-[#EFF9F3] rounded-xl p-3 border border-[#96D4B0]">
                      <div className="font-bold text-[#1E6640] text-xs mb-1">{ex.n}</div>
                      <div className="text-xs text-[#2E7D52] mb-1">{ex.d}</div>
                      {ex.c && <p className="text-[11px] text-[#3D8C5C]">{ex.c}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
          {pg.avoid?.length > 0 && <p className="text-[11px] text-[#8A7055] mt-2"><b>Avoid for now:</b> {pg.avoid.join("; ")}</p>}
        </Section>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsDashboardPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [assessments, setAssessments]     = useState<Assessment[]>([]);
  const [pagination, setPagination]       = useState<{ page: number; pages: number; total: number } | null>(null);
  const [loading, setLoading]             = useState(true);
  const [page, setPage]                   = useState(1);
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState("");
  const [expanded, setExpanded]           = useState<string | null>(null);
  const [fullReports, setFullReports]     = useState<Record<string, FullAssessment>>({});
  const [loadingReport, setLoadingReport] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.replace("/auth/login");
    if (authStatus === "authenticated" && !["ADMIN", "DOCTOR", "RECEPTIONIST"].includes(session?.user?.role ?? "")) router.replace("/dashboard");
  }, [authStatus, session, router]);

  const fetchAssessments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20", ...(statusFilter ? { status: statusFilter } : {}) });
      const res = await fetch(`/api/assessments?${params}`);
      const data = await res.json();
      if (data.assessments) { setAssessments(data.assessments); setPagination(data.pagination); }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { if (authStatus === "authenticated") fetchAssessments(); }, [authStatus, fetchAssessments]);

  async function toggleExpand(id: string) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (fullReports[id]) return;
    setLoadingReport(id);
    try {
      const res = await fetch(`/api/assessments/${id}`);
      const data = await res.json();
      if (data.assessment) setFullReports((p) => ({ ...p, [id]: data.assessment }));
    } catch { /* silent */ }
    finally { setLoadingReport(null); }
  }

  const visible = search
    ? assessments.filter((a) => (a.patient?.name ?? "").toLowerCase().includes(search.toLowerCase()) || (a.primaryDiagnosis ?? "").toLowerCase().includes(search.toLowerCase()))
    : assessments;

  if (authStatus === "loading") return null;

  return (
    <div className="min-h-screen bg-[#F4EFE6] p-5">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-[#2C150A] flex items-center justify-center">
              <FileText className="h-4 w-4 text-[#F4EFE6]" />
            </div>
            <h1 className="text-2xl font-bold text-[#2C150A]">Assessment Reports</h1>
          </div>
          <p className="text-sm text-[#8A7055] ml-12">View and review all saved physiotherapy assessment reports</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A7055]" />
            <input type="text" placeholder="Search patient or diagnosis…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#DDD3C0] bg-white text-sm text-[#2C150A] placeholder-[#B0A090] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D]" />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl border border-[#DDD3C0] bg-white text-sm text-[#2C150A] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D]">
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-[#DDD3C0] p-12 text-center text-[#8A7055] shadow-sm"><div className="animate-pulse">Loading reports…</div></div>
        ) : visible.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#DDD3C0] p-12 text-center shadow-sm">
            <FileText className="h-10 w-10 mx-auto mb-3 text-[#DDD3C0]" />
            <p className="text-[#8A7055] text-sm">No assessment reports found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((a) => {
              const isOpen = expanded === a.id;
              const full = fullReports[a.id];
              const isLoading = loadingReport === a.id;
              return (
                <div key={a.id} className="bg-white rounded-2xl border border-[#DDD3C0] overflow-hidden shadow-sm">
                  <button onClick={() => toggleExpand(a.id)} className="w-full text-left p-4 hover:bg-[#F9F6F1] transition-colors">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-[#2C150A]">{a.patient?.name ?? "Unnamed Patient"}</span>
                          {a.patient?.patientCode && (
                            <span className="text-[10px] bg-[#F4EFE6] text-[#8A7055] border border-[#DDD3C0] px-2 py-0.5 rounded-full font-medium">{a.patient.patientCode}</span>
                          )}
                          {a.pathway && a.pathway !== "gen" && (
                            <span className="text-[10px] bg-[#FDF3EC] text-[#C4622D] border border-[#E8C8A8] px-2 py-0.5 rounded-full font-medium">{PATHWAY_NAME[a.pathway] || a.pathway}</span>
                          )}
                          <StatusBadge status={a.status} />
                          {a.hasRedFlags && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-[#A83030] bg-[#FDF0F0] border border-[#E8B8B8] px-2 py-0.5 rounded-full font-semibold">
                              <AlertTriangle className="h-3 w-3" /> Red Flags
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-[#3D1A0E] font-medium">
                          {a.primaryDiagnosis ?? "No diagnosis"}
                          {a.primaryDxIcd && <span className="ml-2 text-[11px] text-[#C4622D] bg-[#FDF3EC] border border-[#E8C8A8] px-1.5 py-0.5 rounded-md">{a.primaryDxIcd}</span>}
                        </div>
                        <div className="flex gap-2 mt-1.5 flex-wrap text-xs text-[#8A7055]">
                          <span>Dr. {a.doctor.name}</span>
                          <span className="text-[#DDD3C0]">·</span>
                          <span>{new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                          {a.nrsScore !== null && <><span className="text-[#DDD3C0]">·</span><span>NRS {a.nrsScore}/10</span></>}
                          {a.mobilityGrade && <><span className="text-[#DDD3C0]">·</span><span>Mobility {a.mobilityGrade}</span></>}
                          {a.stage && <><span className="text-[#DDD3C0]">·</span><span>{a.stage}</span></>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[#8A7055] shrink-0">
                        {isLoading ? <span className="text-xs animate-pulse">Loading…</span> : isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4">
                      {isLoading ? (
                        <div className="py-6 text-center text-[#8A7055] text-sm animate-pulse">Loading full report…</div>
                      ) : full ? (
                        <ReportPanel assessment={full} />
                      ) : (
                        <div className="py-6 text-center text-[#8A7055] text-sm">Could not load report details.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between mt-4 bg-white rounded-2xl border border-[#DDD3C0] px-4 py-3 shadow-sm">
            <span className="text-sm text-[#8A7055]">Page {pagination.page} of {pagination.pages} · {pagination.total} total</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-[#DDD3C0] bg-white disabled:opacity-40 hover:bg-[#F4EFE6] transition-colors">
                <ChevronLeft className="h-4 w-4 text-[#8A7055]" />
              </button>
              <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="p-1.5 rounded-lg border border-[#DDD3C0] bg-white disabled:opacity-40 hover:bg-[#F4EFE6] transition-colors">
                <ChevronRight className="h-4 w-4 text-[#8A7055]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
