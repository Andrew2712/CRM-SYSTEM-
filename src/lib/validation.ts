/**
 * src/lib/validation.ts
 * Shared Zod schemas for every API route body.
 */

import { z } from "zod";
import { PatientStatus } from "@prisma/client";

// ── Auth ──────────────────────────────────────────────────────────────────────

export const SignupSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[0-9]/, "Must contain number")
    .regex(/[^A-Za-z0-9]/, "Must contain special character"),
  role: z.enum(["ADMIN", "DOCTOR", "RECEPTIONIST"]),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/).optional(),
});

export const ResetPasswordSchema = z.object({
  userId: z.string().cuid(),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[0-9]/, "Must contain number"),
});

// ── Appointments ──────────────────────────────────────────────────────────────

export const CreateAppointmentSchema = z.object({
  patientId: z.string().cuid(),
  doctorId: z.string().cuid(),
  sessionType: z.enum(["INITIAL_ASSESSMENT", "FOLLOW_UP", "SPECIALIZED"]),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  notes: z.string().max(1000).optional(),
});

export const UpdateAppointmentSchema = z.object({
  status: z
    .enum(["CONFIRMED", "ATTENDED", "MISSED", "CANCELLED", "RESCHEDULED"])
    .optional(),
  notes: z.string().max(1000).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
});

// ── Patients ──────────────────────────────────────────────────────────────────

export const CreatePatientSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/),
  email: z.string().email().optional().or(z.literal("")),
  dob: z.string().datetime().optional(),
  address: z.string().max(500).optional(),
  age: z.number().int().min(0).max(150).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  medicalConditions: z.string().max(2000).optional(),
  phase: z.enum(["PHASE_1", "PHASE_2", "PHASE_3", "PHASE_4", "PHASE_5"]).optional(),
  purposeOfVisit: z.string().max(500).optional(),
  totalSessionsPlanned: z.number().int().min(0).default(0),
  status: z.nativeEnum(PatientStatus).optional(),
});

// ── Expenses ──────────────────────────────────────────────────────────────────

export const CreateExpenseSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).optional(),
  category: z.enum([
    "SALARY", "RENT", "ELECTRICITY", "INTERNET", "EQUIPMENT",
    "MEDICINE", "MAINTENANCE", "MARKETING", "TRANSPORT", "OTHER",
  ]),
  amount: z.number().positive().max(10_000_000),
  expenseDate: z.string().datetime(),
  paymentMode: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER"]),
});

// ── Patient assessments ─────────────────────────────────────────────────────
// `assessmentData` is the full doctor-filled wizard state (see
// src/lib/assessment/types.ts AssessmentState). It's deeply nested and
// mostly optional fields, so we validate it as a size-bounded record rather
// than an exhaustive nested schema, and only require the fields that matter
// for a PUBLISHED (patient-visible) report.
const MAX_ASSESSMENT_BYTES = 400_000;

export const AssessmentSaveSchema = z
  .object({
    patientId: z.string().cuid().nullable().optional(),
    appointmentId: z.string().cuid().nullable().optional(),
    assessmentData: z.record(z.string(), z.unknown()),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  })
  .superRefine((val, ctx) => {
    if (JSON.stringify(val.assessmentData).length > MAX_ASSESSMENT_BYTES) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "assessmentData is too large" });
    }
    if (val.status === "PUBLISHED") {
      const d = val.assessmentData as Record<string, unknown>;
      if (d.nrs == null) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Pain score (NRS) is required before publishing" });
      if (!Array.isArray(d.regions) || d.regions.length === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "At least one region must be examined before publishing" });
      const patient = (d.P && typeof d.P === "object" ? d.P : {}) as Record<string, unknown>;
      const consents = (d.consents && typeof d.consents === "object" ? d.consents : {}) as Record<string, unknown>;
      for (const key of ["privacy", "assessment"]) {
        const record = consents[key] as Record<string, unknown> | undefined;
        if (!record || record.granted !== true || typeof record.at !== "string" || typeof record.by !== "string" || !record.by.trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Recorded ${key} consent is required before publishing` });
        }
      }
      const age = Number(patient.age);
      if (Number.isFinite(age) && age > 0 && age < 18) {
        const guardian = String(patient.guardianName || "").trim();
        if (!guardian || !String(patient.guardianRelationship || "").trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Parent or guardian name and relationship are required for patients under 18" });
        }
        for (const key of ["privacy", "assessment"]) {
          const record = consents[key] as Record<string, unknown> | undefined;
          if (!guardian || record?.by !== guardian) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required consent for a patient under 18 must be recorded from the named parent or guardian" });
            break;
          }
        }
      } else {
        const patientName = String(patient.name || "").trim();
        for (const key of ["privacy", "assessment"]) {
          const record = consents[key] as Record<string, unknown> | undefined;
          if (!patientName || record?.by !== patientName) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required consent must be recorded under the patient's name" });
            break;
          }
        }
      }
    }
  });

export const AssessmentStatusSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

// ── Helper ────────────────────────────────────────────────────────────────────

// The two branches use `data: T` vs `data: undefined` (not `data?: never`).
// This gives TypeScript a true discriminated union it can narrow via
// `if (!result.data)` — after that guard, `result.data` is always T.
type ValidateSuccess<T> = { data: T;         error: undefined; status?: never  };
type ValidateFailure    = { data: undefined; error: string;   status: 400     };

export function validate<T>(
  schema: z.ZodType<T>,
  body: unknown
): ValidateSuccess<T> | ValidateFailure {
  const result = schema.safeParse(body);
  if (!result.success) {
    const messages = result.error.issues.map((e) => e.message).join("; ");
    return { data: undefined, error: messages, status: 400 };
  }
  return { data: result.data, error: undefined };
}
