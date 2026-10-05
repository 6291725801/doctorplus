import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { cancelAppointment, getAppointmentById } from "@/lib/services/appointment.service";
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

    // Patient can only cancel their own appointment
    if (session.role === "PATIENT" && existing.patientProfile?.userId !== session.userId) {
      return errorResponse("Forbidden", "FORBIDDEN", 403);
    }

    let reason: string | undefined = undefined;
    try {
      const body = await request.json();
      reason = body.reason;
    } catch {
      // Body is optional
    }

    const cancelled = await cancelAppointment(id, reason, session.userId);
    return successResponse(cancelled);
  } catch (error) {
    return handleApiError(error);
  }
}
