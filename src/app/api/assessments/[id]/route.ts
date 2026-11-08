// src/app/api/assessments/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/rbac";
import { auditAssessment } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { rateLimitRead, rateLimitWrite, rateLimitResponse } from "@/lib/rateLimit";
import { validate, AssessmentStatusSchema } from "@/lib/validation";

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await rateLimitRead(req);
    if (!rl.success) return rateLimitResponse(rl);

    const { id } = await params;
    const session = await requireAuth();
    requireRole(session, ["DOCTOR", "ADMIN", "RECEPTIONIST"]);

    const assessment = await prisma.patientAssessment.findUnique({
      where: { id },
      include: {
        patient: { select: { name: true, patientCode: true, age: true, gender: true, phone: true } },
        doctor: { select: { name: true, email: true } },
      },
    });

    if (!assessment) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    if (session.user.role === "DOCTOR" && assessment.doctorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ assessment });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    logger.error(`GET /api/assessments/[id] failed: ${err instanceof Error ? err.message : String(err)}`);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await rateLimitWrite(req);
    if (!rl.success) return rateLimitResponse(rl);

    const { id } = await params;
    const session = await requireAuth();
    requireRole(session, ["DOCTOR", "ADMIN"]);

    const body = await req.json();
    const validated = validate(AssessmentStatusSchema, body);
    if (!validated.data) return NextResponse.json({ error: validated.error }, { status: 400 });
    const { status } = validated.data;

    const existing = await prisma.patientAssessment.findUnique({
      where: { id },
      select: { doctorId: true, patientId: true, status: true },
    });
    if (!existing) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    if (session.user.role === "DOCTOR" && existing.doctorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.patientAssessment.update({
      where: { id },
      data: { status, publishedAt: status === "PUBLISHED" ? new Date() : undefined },
    });

    if (status === "PUBLISHED" && existing.status !== "PUBLISHED" && existing.patientId) {
      const patient = await prisma.patient.findUnique({ where: { id: existing.patientId }, select: { passwordHash: true } });
      if (patient?.passwordHash) {
        await prisma.inAppNotification.create({
          data: {
            userId: existing.patientId,
            type: "ASSESSMENT_PUBLISHED" as any,
            title: "Your Assessment Report is Ready",
            body: "Your physiotherapy assessment report has been published. You can now view and download it from your dashboard.",
            entityId: id,
          },
        }).catch(() => {});
      }
    }

    await auditAssessment(session, req, "UPDATE", id, { status, old: { status: existing.status }, new: { status } });
    return NextResponse.json({ assessment: updated });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    logger.error(`PATCH /api/assessments/[id] failed: ${err instanceof Error ? err.message : String(err)}`);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await rateLimitWrite(req);
    if (!rl.success) return rateLimitResponse(rl);

    const { id } = await params;
    const session = await requireAuth();
    requireRole(session, ["DOCTOR", "ADMIN"]);

    const existing = await prisma.patientAssessment.findUnique({ where: { id }, select: { doctorId: true } });
    if (!existing) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    if (session.user.role === "DOCTOR" && existing.doctorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.patientAssessment.update({ where: { id }, data: { status: "ARCHIVED" } });
    await auditAssessment(session, req, "DELETE", id, {});
    return NextResponse.json({ message: "Assessment archived" });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    logger.error(`DELETE /api/assessments/[id] failed: ${err instanceof Error ? err.message : String(err)}`);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
