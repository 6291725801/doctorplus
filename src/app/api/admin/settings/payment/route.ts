import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { getClinicPaymentSettings, updateClinicPaymentSettings } from "@/lib/services/payment.service";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !["SUPER_ADMIN", "CLINIC_ADMIN", "RECEPTIONIST"].includes(session.role)) {
      return errorResponse("Unauthorized: Admin or staff access required", "FORBIDDEN", 403);
    }

    const settings = await getClinicPaymentSettings();
    return successResponse(settings, "Payment settings retrieved successfully", 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to retrieve payment settings";
    return errorResponse(message, "INTERNAL_ERROR", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["SUPER_ADMIN", "CLINIC_ADMIN"].includes(session.role)) {
      return errorResponse("Unauthorized: Admin access required", "FORBIDDEN", 403);
    }

    const body = await req.json();
    const { minAdvanceAmount, enableOnlinePayment, currency } = body;

    const updated = await updateClinicPaymentSettings({
      minAdvanceAmount: minAdvanceAmount !== undefined ? Number(minAdvanceAmount) : undefined,
      enableOnlinePayment: enableOnlinePayment !== undefined ? Boolean(enableOnlinePayment) : undefined,
      currency: currency !== undefined ? String(currency) : undefined,
      adminUserId: session.userId,
    });

    return successResponse(updated, "Payment settings updated successfully", 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update payment settings";
    return errorResponse(message, "BAD_REQUEST", 400);
  }
}
