import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  updateNotificationTemplate,
  resetNotificationTemplate,
} from "@/lib/services/notification.service";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !["SUPER_ADMIN", "CLINIC_ADMIN", "CONTENT_MANAGER"].includes(session.role)) {
      return errorResponse("Forbidden: Insufficient privileges", "FORBIDDEN", 403);
    }

    const { id } = await context.params;
    const body = await request.json();

    const updated = await updateNotificationTemplate(id, {
      subject: body.subject,
      body: body.body,
      isActive: body.isActive,
      name: body.name,
    });

    return successResponse(updated, "Notification template updated successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !["SUPER_ADMIN", "CLINIC_ADMIN"].includes(session.role)) {
      return errorResponse("Forbidden: Insufficient privileges", "FORBIDDEN", 403);
    }

    const { id } = await context.params;
    const reset = await resetNotificationTemplate(id);

    return successResponse(reset, "Template reset to default specification");
  } catch (error) {
    return handleApiError(error);
  }
}
