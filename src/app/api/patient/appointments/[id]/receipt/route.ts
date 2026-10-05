import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";
import { getAppointmentReceipt } from "@/lib/services/patient.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    const { id } = await params;
    const receipt = await getAppointmentReceipt(id, session.userId);
    return successResponse(receipt);
  } catch (error) {
    return handleApiError(error);
  }
}
