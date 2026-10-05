import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getNotificationLogs } from "@/lib/services/notification.service";
import { getActiveClinic } from "@/lib/services/cms.service";
import { NotificationType, NotificationChannel, NotificationDeliveryStatus } from "@prisma/client";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["SUPER_ADMIN", "CLINIC_ADMIN", "CONTENT_MANAGER"].includes(session.role)) {
      return errorResponse("Forbidden: Insufficient privileges", "FORBIDDEN", 403);
    }

    const { searchParams } = new URL(request.url);
    const event = searchParams.get("event") as NotificationType | undefined;
    const channel = searchParams.get("channel") as NotificationChannel | undefined;
    const status = searchParams.get("status") as NotificationDeliveryStatus | undefined;
    const search = searchParams.get("search") || undefined;
    const limit = Number(searchParams.get("limit")) || 50;
    const offset = Number(searchParams.get("offset")) || 0;

    const clinic = await getActiveClinic();
    const clinicId = session.clinicId || clinic?.id;

    const data = await getNotificationLogs({
      clinicId,
      event,
      channel,
      status,
      search,
      limit,
      offset,
    });

    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}
