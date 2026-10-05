import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";
import { getPatientProfile, updatePatientProfile } from "@/lib/services/patient.service";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    const data = await getPatientProfile(session.userId);
    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    const body = await request.json();
    const updated = await updatePatientProfile(session.userId, body);
    return successResponse(updated, "Profile updated successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
