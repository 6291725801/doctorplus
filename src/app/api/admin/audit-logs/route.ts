import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";
import { getAuditLogs } from "@/lib/services/audit.service";

/**
 * GET /api/admin/audit-logs
 * Retrieves immutable audit records for clinic governance, security, and administrative oversight.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["SUPER_ADMIN", "CLINIC_ADMIN"].includes(session.role)) {
      return errorResponse(
        "Forbidden: Audit logs are restricted to Clinic Administrators",
        "FORBIDDEN",
        403
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);
    const action = searchParams.get("action") || undefined;
    const entity = searchParams.get("entity") || undefined;
    const userId = searchParams.get("userId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const search = searchParams.get("search") || undefined;

    const result = await getAuditLogs({
      page,
      limit,
      action,
      entity,
      userId,
      startDate,
      endDate,
      search,
    });

    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}
