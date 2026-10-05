import { NextRequest } from "next/server";
import { getDoctorAvailableSlots } from "@/lib/services/schedule.service";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctorId");
    const date = searchParams.get("date");

    if (!doctorId || !date) {
      return errorResponse("Missing required parameters: doctorId and date (YYYY-MM-DD)", "VALIDATION_ERROR", 400);
    }

    const slotInfo = await getDoctorAvailableSlots(doctorId, date);
    return successResponse(slotInfo);
  } catch (error) {
    return handleApiError(error);
  }
}
