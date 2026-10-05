import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { deleteMediaAsset, updateMediaAsset, getActiveClinic } from "@/lib/services/cms.service";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const allowedRoles = ["SUPER_ADMIN", "CLINIC_ADMIN", "CONTENT_MANAGER"];
    if (!allowedRoles.includes(session.role)) {
      return errorResponse("Forbidden: Insufficient privileges", "FORBIDDEN", 403);
    }

    const { id } = await params;
    const activeClinic = await getActiveClinic();
    const clinicId = session.clinicId || activeClinic.id;

    await deleteMediaAsset(id, clinicId, session.userId);
    return successResponse({ deleted: true }, "Media asset deleted successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const allowedRoles = ["SUPER_ADMIN", "CLINIC_ADMIN", "CONTENT_MANAGER"];
    if (!allowedRoles.includes(session.role)) {
      return errorResponse("Forbidden: Insufficient privileges", "FORBIDDEN", 403);
    }

    const { id } = await params;
    const activeClinic = await getActiveClinic();
    const clinicId = session.clinicId || activeClinic.id;
    const body = await request.json();

    const updated = await updateMediaAsset(id, clinicId, body, session.userId);
    return successResponse(updated, "Media metadata updated successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
