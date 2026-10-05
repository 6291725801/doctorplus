import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAppointmentById } from "@/lib/services/appointment.service";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    const { id } = await params;
    const appointment = await getAppointmentById(id);

    if (!appointment) {
      return errorResponse("Appointment not found", "NOT_FOUND", 404);
    }

    // Authorization checks
    if (session.role === "PATIENT" && appointment.patientProfile?.userId !== session.userId) {
      return errorResponse("Forbidden", "FORBIDDEN", 403);
    }

    if (session.role === "DOCTOR" && appointment.doctor.userId !== session.userId) {
      return errorResponse("Forbidden", "FORBIDDEN", 403);
    }

    return successResponse(appointment);
  } catch (error) {
    return handleApiError(error);
  }
}
