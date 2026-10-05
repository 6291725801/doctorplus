import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { getAdminPaymentsList } from "@/lib/services/payment.service";
import { PaymentStatus } from "@/lib/payments/types";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["SUPER_ADMIN", "CLINIC_ADMIN", "RECEPTIONIST"].includes(session.role)) {
      return errorResponse("Unauthorized: Admin or staff access required", "FORBIDDEN", 403);
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as PaymentStatus | null;
    const search = searchParams.get("search") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;

    const data = await getAdminPaymentsList({
      status: status || undefined,
      search,
      startDate,
      endDate,
      page,
      limit,
    });

    return successResponse(data, "Payments retrieved successfully", 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to retrieve payments";
    return errorResponse(message, "INTERNAL_ERROR", 500);
  }
}
