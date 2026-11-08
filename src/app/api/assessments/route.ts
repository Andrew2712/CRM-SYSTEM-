/**
 * src/app/api/assessments/route.ts
 *
 * POST /api/assessments — Doctor saves an assessment (DRAFT or PUBLISHED).
 * GET  /api/assessments — List assessments (doctor sees own; admin/receptionist see all).
 *
 * The assessment report (diagnoses, programme, outcome scores) is always
 * generated server-side by the deterministic rule-based engine in
 * src/lib/assessment — the client never sends, and the server never trusts,
 * a pre-computed report.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/rbac";
import { auditAssessment } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { rateLimitRead, rateLimitWrite, rateLimitResponse } from "@/lib/rateLimit";
import { validate, AssessmentSaveSchema } from "@/lib/validation";
import { buildReport } from "@/lib/assessment/reportBuilder";
import type { AssessmentState } from "@/lib/assessment/types";

// ─── POST — Create assessment ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const rl = await rateLimitWrite(req);
    if (!rl.success) return rateLimitResponse(rl);

    const session = await requireAuth();
    requireRole(session, ["DOCTOR", "ADMIN"]);

    const body = await req.json();
    const validated = validate(AssessmentSaveSchema, body);
    if (!validated.data) return NextResponse.json({ error: validated.error }, { status: 400 });

    const { patientId, appointmentId, status: saveStatus } = validated.data;
    const assessmentData = validated.data.assessmentData as unknown as AssessmentState;

    let patient: { id: string; name: string; passwordHash: string | null } | null = null;
    if (patientId) {
      patient = await prisma.patient.findUnique({
        where: { id: patientId, isActive: true },
        select: { id: true, name: true, passwordHash: true },
      });
      if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // ── Server-side, deterministic report generation (no LLM) ──────────────
    const report = buildReport(assessmentData);

    const topImpression = report.impressions[0] || null;
    const primaryDiagnosis = topImpression
      ? topImpression.dx.replace(/^Suggestive of /i, "").replace(/^./, (c) => c.toUpperCase())
      : null;
    const ndiScore = report.outcomeMeasures.ndi?.score ?? null;
    const investmentPlanStr = report.investmentPlan
      ? `${report.investmentPlan.name} · ${report.investmentPlan.sessions} sessions`
      : null;

    const publishedAt = saveStatus === "PUBLISHED" ? new Date() : undefined;

    const assessment = await prisma.patientAssessment.create({
      data: {
        patientId: patientId ?? null,
        doctorId: session.user.id,
        appointmentId: appointmentId ?? null,
        pathway: assessmentData.path ?? null,

        primaryComplaint: assessmentData.C?.chief ?? null,
        nrsScore: assessmentData.nrs ?? null,
        ndiScore,
        mobilityScore: report.pillars?.total ?? null,
        mobilityGrade: report.pillars?.grade || null,
        primaryDiagnosis,
        primaryDxIcd: topImpression?.icd10 || null,
        diagnosisConfidence: topImpression?.fit ?? null,
        irritability: report.irritability || null,
        stage: report.stage || null,
        loadClassification: report.loadClass || null,
        totalSessions: report.investmentPlan ? String(report.investmentPlan.sessions) : null,
        timelineWeeks: assessmentData.prog?.weeks || null,
        investmentPlan: investmentPlanStr,
        hasRedFlags: report.hold.length > 0 || report.redFlags.some((g) => g.level !== "None"),

        assessmentData: assessmentData as object,
        aiDiagnosis: { impressions: report.impressions, redFlags: report.redFlags, hold: report.hold, pillars: report.pillars, outcomeMeasures: report.outcomeMeasures, loadClass: report.loadClass, stage: report.stage, irritability: report.irritability, schemaVersion: report.schemaVersion } as object,
        aiDocuments: { subjective: report.subjective, objective: report.objective, assessment: report.assessment, plan: report.plan, programmes: report.programmes, pathwayProgramme: report.pathwayProgramme, pathwayTreatment: report.pathwayTreatment, rootCauses: report.rootCauses, lifestyle: report.lifestyle, ergonomics: report.ergonomics, patientStory: report.patientStory, whatsapp: report.whatsapp, cautions: report.cautions, avoid: report.avoid, investmentPlan: report.investmentPlan, schemaVersion: report.schemaVersion } as object,

        status: saveStatus,
        publishedAt,
      } as any, // unchecked create — patientId is nullable in DB
    });

    const patientName = patient?.name ?? assessmentData?.P?.name ?? "unknown";
    await auditAssessment(session, req, "CREATE", assessment.id, { patientName, status: saveStatus });

    if (saveStatus === "PUBLISHED" && patient?.passwordHash && patientId) {
      await prisma.inAppNotification.create({
        data: {
          userId: patientId,
          type: "ASSESSMENT_PUBLISHED",
          title: "Your Assessment Report is Ready",
          body: `Your physiotherapy assessment report from ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} has been published. You can now view and download it.`,
          entityId: assessment.id,
        },
      }).catch(() => {});
    }

    logger.info("Assessment saved", { assessmentId: assessment.id, patientId: patientId ?? "unlinked", status: saveStatus });
    return NextResponse.json({ assessment }, { status: 201 });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    logger.error("POST /api/assessments failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── GET — List assessments ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const rl = await rateLimitRead(req);
    if (!rl.success) return rateLimitResponse(rl);

    const session = await requireAuth();
    requireRole(session, ["DOCTOR", "ADMIN", "RECEPTIONIST"]);

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");
    const pathway = searchParams.get("pathway");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "20")));

    const where: Record<string, unknown> = {};
    if (session.user.role === "DOCTOR") where.doctorId = session.user.id;
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;
    if (pathway) where.pathway = pathway;

    const [assessments, total] = await Promise.all([
      prisma.patientAssessment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, patientId: true, doctorId: true, appointmentId: true, pathway: true,
          primaryComplaint: true, nrsScore: true, ndiScore: true, mobilityScore: true, mobilityGrade: true,
          primaryDiagnosis: true, primaryDxIcd: true, diagnosisConfidence: true, irritability: true, stage: true,
          investmentPlan: true, hasRedFlags: true, status: true, publishedAt: true, createdAt: true, updatedAt: true,
          patient: { select: { name: true, patientCode: true, age: true } },
          doctor: { select: { name: true } },
        },
      }),
      prisma.patientAssessment.count({ where }),
    ]);

    return NextResponse.json({ assessments, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    logger.error("GET /api/assessments failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
