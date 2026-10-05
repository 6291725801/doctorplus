import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { recordAuditLog } from "@/lib/services/audit.service";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";
import { AppointmentStatus } from "@prisma/client";

/**
 * POST /api/doctor/consultation
 * Strict RBAC: Accessible by DOCTOR (for their assigned patients) or CLINIC_ADMIN/SUPER_ADMIN.
 * Records clinical consultation notes, follow-up date, and prescription regimen.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["DOCTOR", "SUPER_ADMIN", "CLINIC_ADMIN"].includes(session.role)) {
      return errorResponse("Forbidden: Only doctors and clinical administrators can submit consultations", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const { appointmentId, status, consultationNotes, followUpDate, prescription, lifestyleAdvice } = body;

    if (!appointmentId) {
      return errorResponse("Missing appointmentId", "VALIDATION_ERROR", 400);
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: {
          select: { id: true, userId: true },
        },
        patientProfile: {
          include: {
            user: { select: { fullName: true } },
          },
        },
      },
    });

    if (!appointment) {
      return errorResponse("Appointment not found", "NOT_FOUND", 404);
    }

    // Strict RBAC: If role is DOCTOR, they can ONLY consult on their own assigned appointments
    if (session.role === "DOCTOR" && appointment.doctor.userId !== session.userId) {
      return errorResponse("Forbidden: Cannot modify consultation records for another doctor's patient", "FORBIDDEN", 403);
    }

    // Structure clinical document data
    const clinicalPayload = {
      notes: consultationNotes?.trim() || "",
      followUpDate: followUpDate || null,
      prescription: Array.isArray(prescription) ? prescription : [],
      lifestyleAdvice: lifestyleAdvice?.trim() || null,
      updatedByDoctorUserId: session.userId,
      recordedAt: new Date().toISOString(),
    };

    const targetStatus = status === "IN_CONSULTATION" ? AppointmentStatus.IN_CONSULTATION : AppointmentStatus.COMPLETED;

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: targetStatus,
        doctorNotes: JSON.stringify(clinicalPayload),
        ...(targetStatus === AppointmentStatus.COMPLETED ? { completedAt: new Date() } : {}),
      },
      include: {
        doctor: { include: { user: { select: { fullName: true } } } },
        patientProfile: { include: { user: { select: { fullName: true, email: true, phone: true } } } },
        service: true,
      },
    });

    // Create immutable audit log for sensitive clinical record update
    await recordAuditLog({
      userId: session.userId,
      clinicId: updated.clinicId,
      action: targetStatus === AppointmentStatus.COMPLETED ? "DOCTOR_CONSULTATION_COMPLETED" : "DOCTOR_CONSULTATION_UPDATED",
      entity: "Appointment",
      entityId: updated.id,
      metadata: {
        appointmentNumber: updated.appointmentNumber,
        patientName: updated.patientProfile.user.fullName,
        hasPrescription: clinicalPayload.prescription.length > 0,
        followUpDate: clinicalPayload.followUpDate,
      },
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
