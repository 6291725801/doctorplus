import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { rescheduleAppointment, getAppointmentById } from "@/lib/services/appointment.service";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    const { id } = await params;
    const existing = await getAppointmentById(id);
    if (!existing) {
      return errorResponse("Appointment not found", "NOT_FOUND", 404);
    }

    if (session.role === "PATIENT" && existing.patientProfile?.userId !== session.userId) {
      return errorResponse("Forbidden", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const { newDate, newTime, reason } = body;

    if (!newDate || !newTime) {
      return errorResponse("newDate and newTime are required for rescheduling", "VALIDATION_ERROR", 400);
    }

    const rescheduled = await rescheduleAppointment(id, newDate, newTime, reason, session.userId);
    return successResponse(rescheduled);
  } catch (error) {
    return handleApiError(error);
  }
}
