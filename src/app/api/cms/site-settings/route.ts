import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSiteSettings, updateSiteSettings, getActiveClinic } from "@/lib/services/cms.service";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";

export async function GET() {
  try {
    const settings = await getSiteSettings();
    return successResponse(settings);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const allowedRoles = ["SUPER_ADMIN", "CLINIC_ADMIN", "CONTENT_MANAGER"];
    if (!allowedRoles.includes(session.role)) {
      return errorResponse("Forbidden: Insufficient privileges", "FORBIDDEN", 403);
    }

    const activeClinic = await getActiveClinic();
    const clinicId = session.clinicId || activeClinic.id;
    const body = await request.json();

    const updated = await updateSiteSettings(clinicId, body, session.userId);

    return successResponse(updated, "Site settings successfully updated");
  } catch (error) {
    return handleApiError(error);
  }
}
