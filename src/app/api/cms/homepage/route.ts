import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getHomepageData, updatePageSection, getActiveClinic } from "@/lib/services/cms.service";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";

export async function GET() {
  try {
    const data = await getHomepageData();
    return successResponse(data);
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

    const { sectionType, title, subtitle, content, isVisible, sortOrder } = body;

    if (!sectionType) {
      return errorResponse("sectionType is required", "VALIDATION_ERROR", 422);
    }

    const updatedSection = await updatePageSection(
      clinicId,
      "home",
      sectionType,
      {
        title,
        subtitle,
        content,
        isVisible,
        sortOrder,
      },
      session.userId
    );

    return successResponse(updatedSection, `Homepage section "${sectionType}" updated successfully`);
  } catch (error) {
    return handleApiError(error);
  }
}
