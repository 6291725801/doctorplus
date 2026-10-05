import { getSession } from "@/lib/auth/session";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";
import { getPatientPaymentHistory } from "@/lib/services/patient.service";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    const data = await getPatientPaymentHistory(session.userId);
    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}
