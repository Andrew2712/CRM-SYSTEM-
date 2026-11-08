"use client";

/**
 * src/app/patient/assessments/page.tsx
 *
 * Patient-facing assessment viewer. Shows PUBLISHED assessments only.
 * Renders the deterministic report produced by src/lib/assessment/reportBuilder
 * and persisted as aiDiagnosis / aiDocuments JSON by POST /api/assessments.
 */

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Impression { likelihood: string; dx: string; icd10: string; icd11?: string; fit: number | null; why: string }
interface RedFlagGroup { id: string; n: string; level: string; action: string }
interface Exercise { n: string; d: string; c: string; why: string }
interface PhaseContent { clinic: Exercise[]; home: Exercise[] }
interface RegionProgramme { region: string; phases: Record<string, PhaseContent>; avoid: string[] }
interface AiDiagnosis {
  schemaVersion?: number;
  impressions?: Impression[];
  redFlags?: RedFlagGroup[];
  pillars?: { total: number | null; grade: string } | null;
}
interface AiDocuments {
  schemaVersion?: number;
  subjective?: string; objective?: string; assessment?: string; plan?: string;
  programmes?: RegionProgramme[];
  pathwayProgramme?: RegionProgramme | null;
  patientStory?: string; whatsapp?: string;
}

interface Assessment {
  id: string;
  pathway: string | null;
  primaryComplaint: string | null;
  primaryDiagnosis: string | null;
  primaryDxIcd: string | null;
  diagnosisConfidence: number | null;
  nrsScore: number | null;
  mobilityGrade: string | null;
  irritability: string | null;
  stage: string | null;
  investmentPlan: string | null;
  hasRedFlags: boolean;
  publishedAt: string;
  aiDiagnosis: AiDiagnosis | null;
  aiDocuments: AiDocuments | null;
  doctor: { name: string };
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=DM+Sans:opsz,wght@9..40,400;9..40,500&display=swap');
*{box-sizing:border-box}
:root{--bg:#F4EFE6;--w:#fff;--br:#2C150A;--br2:#3D1A0E;--te:#C4622D;--or:#E8884A;--mu:#8A7055;--bd:#DDD3C0;--pc:#A83030;--pb:#FDF0F0;--pbb:#E8B8B8;--nc:#1E6640;--nb:#EFF9F3;--nbb:#96D4B0}
body{background:var(--bg);font-family:'DM Sans',sans-serif;color:var(--br2);font-size:13px}
.wrap{max-width:720px;margin:0 auto;padding:16px}
.hdr{background:var(--br);border-radius:12px;padding:12px 16px;margin-bottom:14px}
.hn{font-family:'Cormorant Garamond',serif;font-size:17px;color:#F4EFE6;font-weight:600}
.hs{font-size:10px;color:var(--or);letter-spacing:.5px;margin-top:2px}
.card{background:var(--w);border:1px solid var(--bd);border-radius:12px;padding:15px;margin-bottom:12px}
.ct{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:600;color:var(--br2);margin-bottom:3px}
.cs{font-size:11px;color:var(--mu);margin-bottom:10px}
.pill{padding:3px 9px;border-radius:12px;font-size:10px;font-weight:500;border:1px solid;display:inline-block;margin-right:4px;margin-bottom:3px}
.rtabs{display:flex;gap:4px;overflow-x:auto;margin-bottom:12px;scrollbar-width:none}
.rtabs::-webkit-scrollbar{display:none}
.rtab{padding:5px 12px;border-radius:20px;border:1px solid var(--bd);background:var(--w);font-size:11px;cursor:pointer;white-space:nowrap;font-family:inherit;color:var(--mu)}
.rtab.a{background:var(--te);color:#fff;border-color:var(--te)}
.sec{background:var(--bg);border:1px solid var(--bd);border-radius:9px;padding:10px 13px;margin-bottom:8px}
.slbl{font-size:9px;font-weight:500;color:var(--mu);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px}
.sval{font-size:12px;color:var(--br2);line-height:1.7}
.btn{padding:8px 16px;border-radius:8px;font-family:inherit;font-size:12px;font-weight:500;cursor:pointer;border:1px solid var(--bd);background:var(--w);color:var(--mu)}
.btn:hover{border-color:var(--te);color:var(--te)}
.disclaimer{font-size:9px;color:var(--mu);text-align:center;padding:8px 0;opacity:.8;line-height:1.6}
`;

const PHASE_COLORS: Record<string, string> = { calm: "#C4622D", heal: "#D47830", mobilise: "#B87040", strengthen: "#9A5A30", flourish: "#5F7F5B" };
const PHASE_LABEL: Record<string, string> = { calm: "Calm", heal: "Heal", mobilise: "Mobilise", strengthen: "Strengthen", flourish: "Flourish" };

export default function PatientAssessmentsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selected, setSelected] = useState<Assessment | null>(null);
  const [rTab, setRTab] = useState("summary");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    if (authStatus === "authenticated" && session?.user?.role !== "PATIENT") { router.replace("/dashboard"); return; }
    if (authStatus === "authenticated") {
      fetch("/api/patient/assessments").then((r) => r.json())
        .then((d) => { setAssessments(d.assessments ?? []); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [authStatus, session, router]);

  function cp(text: string, key: string) {
    try { navigator.clipboard.writeText(text); } catch { /* ignore */ }
    setCopied(key);
    setTimeout(() => setCopied(""), 2200);
  }

  if (authStatus === "loading" || loading) {
    return (<><style>{CSS}</style><div className="wrap"><div style={{ textAlign: "center", padding: 40, color: "var(--mu)", fontSize: 13 }}>Loading your reports…</div></div></>);
  }

  if (selected) {
    const d = selected.aiDiagnosis;
    const docs = selected.aiDocuments;
    const isLegacy = d?.schemaVersion == null && docs?.schemaVersion == null;
    const redFlags = (d?.redFlags || []).filter((g) => g.level !== "None");
    const programmes = [...(docs?.programmes || []), ...(docs?.pathwayProgramme ? [docs.pathwayProgramme] : [])];
    const tabs = [["summary", "Summary"], ["dx", "Diagnoses"], ["plan", "Rehab Plan"], ["soap", "Clinical Note"]] as const;

    return (
      <>
        <style>{CSS}</style>
        <style>{`@media print { .no-print { display: none !important; } }`}</style>
        <div className="wrap">
          <div className="hdr">
            <div className="hn">Vyayāma Physio — Your Assessment Report</div>
            <div className="hs">{new Date(selected.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · {selected.doctor.name}</div>
          </div>

          <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button className="btn" onClick={() => setSelected(null)}>← All Reports</button>
            <button className="btn" onClick={() => window.print()}>🖨 Print / Save PDF</button>
            {docs?.whatsapp && (
              <button className="btn" onClick={() => cp(docs.whatsapp!, "wa")} style={{ marginLeft: "auto" }}>
                {copied === "wa" ? "✓ Copied" : "📱 Copy WhatsApp"}
              </button>
            )}
          </div>

          {isLegacy ? (
            <div className="card">
              <div className="ct">This report was created by an earlier version of the assessment tool</div>
              <div className="sval">The basic details below are still available. Please contact the clinic if you need the full original report.</div>
            </div>
          ) : (<>
            {redFlags.length > 0 && (
              <div style={{ background: "#FDF5F5", border: "1px solid #F0CCCC", borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#C0392B", marginBottom: 3 }}>🚩 Important — Please contact us immediately</div>
                {redFlags.map((f, i) => <div key={i} style={{ fontSize: 11, color: "#983020" }}>• {f.n}: {f.action}</div>)}
              </div>
            )}

            <div style={{ marginBottom: 10 }}>
              {selected.irritability && <span className="pill" style={{ background: "#FEF4EE", borderColor: "#F0B898", color: "var(--te)" }}>Irritability: {selected.irritability}</span>}
              {selected.stage && <span className="pill" style={{ background: "var(--bg)", borderColor: "var(--bd)", color: "var(--br2)" }}>Stage: {selected.stage}</span>}
              {(d?.pillars?.grade || selected.mobilityGrade) && <span className="pill" style={{ background: "var(--nb)", borderColor: "var(--nbb)", color: "var(--nc)" }}>Mobility: {d?.pillars?.grade || selected.mobilityGrade}</span>}
            </div>

            {selected.investmentPlan && (
              <div style={{ background: "var(--br)", color: "#F4EFE6", borderRadius: 10, padding: "11px 14px", marginBottom: 10 }}>
                <div style={{ fontSize: 9, opacity: .65, letterSpacing: ".5px", textTransform: "uppercase", marginBottom: 2 }}>Recommended Programme</div>
                <div style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 16, color: "#E8884A" }}>{selected.investmentPlan}</div>
              </div>
            )}

            <div className="rtabs no-print">
              {tabs.map(([id, lb]) => (<button key={id} className={`rtab ${rTab === id ? "a" : ""}`} onClick={() => setRTab(id)}>{lb}</button>))}
            </div>

            {rTab === "summary" && (
              <div>
                {docs?.patientStory && (
                  <div style={{ background: "var(--nb)", border: "1px solid var(--nbb)", borderRadius: 9, padding: "10px 13px", marginBottom: 8 }}>
                    <div className="slbl" style={{ color: "var(--nc)" }}>In Plain English</div>
                    <div className="sval">{docs.patientStory}</div>
                  </div>
                )}
                {!docs?.patientStory && <div className="sec"><div className="sval">Your physiotherapist is still preparing your written summary.</div></div>}
              </div>
            )}

            {rTab === "dx" && (
              <div>
                {(d?.impressions ?? []).map((dx, i) => (
                  <div key={i} style={{ border: "1px solid var(--bd)", borderRadius: 10, padding: 12, marginBottom: 8, background: "var(--w)" }}>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 4, gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--mu)" }}>{dx.likelihood}</span>
                      <span style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 14, fontWeight: 600, color: "var(--br2)", flex: 1 }}>{dx.dx}</span>
                      {dx.fit != null && <span style={{ fontSize: 11, color: "var(--te)", fontWeight: 500 }}>{dx.fit}% fit</span>}
                    </div>
                    {dx.fit != null && (
                      <div style={{ height: 4, borderRadius: 2, background: "var(--bd)", marginBottom: 6, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 2, background: "linear-gradient(90deg,var(--or),var(--te))", width: dx.fit + "%" }} />
                      </div>
                    )}
                    {dx.why && <div style={{ fontSize: 11, color: "var(--mu)", fontStyle: "italic" }}>{dx.why}</div>}
                  </div>
                ))}
                <div className="disclaimer">These are provisional clinical classifications, not a definitive medical diagnosis. Always follow the advice of your physiotherapist.</div>
              </div>
            )}

            {rTab === "plan" && (
              <div>
                {programmes.length === 0 && <div className="sec"><div className="sval">Your exercise programme will appear here once it's been issued.</div></div>}
                {programmes.map((pg, pi) => (
                  <div key={pi}>
                    <div style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 14, fontWeight: 600, margin: "10px 0 4px" }}>
                      {pg.region === "path" ? "" : `${pg.region.charAt(0).toUpperCase()}${pg.region.slice(1)} programme`}
                    </div>
                    {Object.entries(pg.phases).filter(([, c]) => c.home.length > 0).map(([phase, content]) => (
                      <div key={phase} style={{ border: "1px solid var(--bd)", borderRadius: 10, overflow: "hidden", marginBottom: 10, background: "var(--w)" }}>
                        <div style={{ padding: "8px 12px", background: (PHASE_COLORS[phase] || "#999") + "18", borderBottom: `2px solid ${(PHASE_COLORS[phase] || "#999")}30` }}>
                          <span style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 14, fontWeight: 600, color: "var(--br2)" }}>{PHASE_LABEL[phase] || phase}</span>
                        </div>
                        <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                          {content.home.map((ex, j) => (
                            <div key={j} style={{ fontSize: 11 }}>
                              <b style={{ color: "var(--br2)" }}>{ex.n}</b> <span style={{ color: "var(--mu)" }}>({ex.d})</span>
                              {ex.c && <div style={{ color: "var(--te)" }}>{ex.c}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {pg.avoid?.length > 0 && <div className="disclaimer" style={{ textAlign: "left" }}><b>Avoid for now:</b> {pg.avoid.join("; ")}</div>}
                  </div>
                ))}
              </div>
            )}

            {rTab === "soap" && (docs?.subjective || docs?.objective || docs?.assessment || docs?.plan) && (
              <div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 7 }} className="no-print">
                  <button className="btn" onClick={() => cp(`S: ${docs?.subjective}\n\nO: ${docs?.objective}\n\nA: ${docs?.assessment}\n\nP: ${docs?.plan}`, "soap")}>
                    {copied === "soap" ? "✓ Copied" : "Copy Note"}
                  </button>
                </div>
                {[["S", "Subjective (What you reported)", docs?.subjective], ["O", "Objective (What was found)", docs?.objective], ["A", "Assessment (Clinical impression)", docs?.assessment], ["P", "Plan (What happens next)", docs?.plan]].map(([l, lb, c]) => c ? (
                  <div key={l as string} style={{ background: "var(--w)", border: "1px solid var(--bd)", borderRadius: 9, marginBottom: 7, overflow: "hidden" }}>
                    <div style={{ padding: "6px 12px", background: "var(--bg)", borderBottom: "1px solid var(--bd)", display: "flex", gap: 7, alignItems: "center" }}>
                      <span style={{ width: 19, height: 19, borderRadius: "50%", background: "var(--te)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{l}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: "var(--br2)" }}>{lb}</span>
                    </div>
                    <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--br2)", lineHeight: 1.7 }}>{c}</div>
                  </div>
                ) : null)}
              </div>
            )}
          </>)}

          <div className="disclaimer">
            ⚕ Your recovery journey is personalised. Recommendations may be modified based on clinical findings, progress, and response to treatment.<br />
            Vyayāma Physio · Dr. Sayalee Sohoni-Pethe, B.P.Th, PG Diploma Manual Therapy · M.I.A.P 63221 · Bengaluru
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="wrap">
        <div className="hdr">
          <div className="hn">Your Assessment Reports</div>
          <div className="hs">{assessments.length} report{assessments.length !== 1 ? "s" : ""} available</div>
        </div>
        {assessments.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "32px 16px" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 16, color: "var(--br2)", marginBottom: 4 }}>No reports yet</div>
            <div style={{ fontSize: 12, color: "var(--mu)" }}>Your assessment reports will appear here once your physiotherapist publishes them after your session.</div>
          </div>
        ) : (
          assessments.map((a) => (
            <div key={a.id} className="card" style={{ cursor: "pointer" }} onClick={() => { setSelected(a); setRTab("summary"); }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div className="ct">{a.primaryDiagnosis || a.primaryComplaint || "Assessment"}</div>
                  <div className="cs">
                    {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                    {" · "}Dr. {a.doctor.name}
                  </div>
                </div>
                <div style={{ color: "var(--te)", fontSize: 18 }}>→</div>
              </div>
              <div>
                {a.primaryDxIcd && <span className="pill" style={{ background: "var(--bg)", borderColor: "var(--bd)", color: "var(--mu)" }}>{a.primaryDxIcd}</span>}
                {a.nrsScore != null && <span className="pill" style={{ background: a.nrsScore >= 7 ? "var(--pb)" : "#FFF7E0", borderColor: a.nrsScore >= 7 ? "var(--pbb)" : "#EDD060", color: a.nrsScore >= 7 ? "var(--pc)" : "#7A5A00" }}>Pain: {a.nrsScore}/10</span>}
                {a.mobilityGrade && <span className="pill" style={{ background: "var(--nb)", borderColor: "var(--nbb)", color: "var(--nc)" }}>{a.mobilityGrade}</span>}
                {a.hasRedFlags && <span className="pill" style={{ background: "var(--pb)", borderColor: "var(--pbb)", color: "var(--pc)" }}>🚩 Flags present</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
