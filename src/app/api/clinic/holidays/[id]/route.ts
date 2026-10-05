import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { deleteClinicHoliday } from "@/lib/services/schedule.service";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session || !["SUPER_ADMIN", "CLINIC_ADMIN"].includes(session.role)) {
      return errorResponse("Forbidden: Admin privileges required", "FORBIDDEN", 403);
    }

    const { id } = await params;
    await deleteClinicHoliday(id, session.userId);

    return successResponse({ deleted: true }, "Holiday deleted successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
