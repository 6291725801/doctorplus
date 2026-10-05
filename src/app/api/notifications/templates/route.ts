import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getNotificationTemplates, seedDefaultTemplates } from "@/lib/services/notification.service";
import { getActiveClinic } from "@/lib/services/cms.service";
import { providerRegistry } from "@/lib/notifications/registry";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !["SUPER_ADMIN", "CLINIC_ADMIN", "CONTENT_MANAGER"].includes(session.role)) {
      return errorResponse("Forbidden: Insufficient privileges", "FORBIDDEN", 403);
    }

    const clinic = await getActiveClinic();
    const clinicId = session.clinicId || clinic?.id;

    const templates = await getNotificationTemplates(clinicId);

    // Secure provider status: DO NOT expose secrets in frontend!
    const providerStatuses = providerRegistry.getProviderStatuses();

    return successResponse({
      templates,
      providers: providerStatuses,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["SUPER_ADMIN", "CLINIC_ADMIN"].includes(session.role)) {
      return errorResponse("Forbidden: Insufficient privileges", "FORBIDDEN", 403);
    }

    const clinic = await getActiveClinic();
    const clinicId = session.clinicId || clinic?.id;

    await seedDefaultTemplates(clinicId);
    const templates = await getNotificationTemplates(clinicId);

    return successResponse(templates, "Default notification templates successfully initialized");
  } catch (error) {
    return handleApiError(error);
  }
}
