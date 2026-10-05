import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { updateAppointmentStatus, getAppointmentById } from "@/lib/services/appointment.service";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";
import { AppointmentStatus } from "@prisma/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !["SUPER_ADMIN", "CLINIC_ADMIN", "RECEPTIONIST", "DOCTOR"].includes(session.role)) {
      return errorResponse("Forbidden", "FORBIDDEN", 403);
    }

    const { id } = await params;
    const existing = await getAppointmentById(id);
    if (!existing) {
      return errorResponse("Appointment not found", "NOT_FOUND", 404);
    }

    // If doctor, ensure it is their own appointment
    if (session.role === "DOCTOR" && existing.doctor.userId !== session.userId) {
      return errorResponse("Forbidden: Cannot manage another doctor's appointments", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const { status, notes, cancellationReason } = body;

    if (!status || !Object.values(AppointmentStatus).includes(status)) {
      return errorResponse("Invalid or missing status", "VALIDATION_ERROR", 400);
    }

    const updated = await updateAppointmentStatus(
      id,
      status as AppointmentStatus,
      { notes, cancellationReason },
      session.userId
    );

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
