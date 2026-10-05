import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { processPaymentRefund } from "@/lib/services/payment.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !["SUPER_ADMIN", "CLINIC_ADMIN"].includes(session.role)) {
      return errorResponse("Unauthorized: Admin privileges required to process refunds", "FORBIDDEN", 403);
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { amount, reason } = body;

    const refund = await processPaymentRefund({
      paymentId: id,
      amount: amount !== undefined ? Number(amount) : undefined,
      reason,
      adminUserId: session.userId,
    });

    return successResponse(refund, "Payment refunded successfully", 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process refund";
    return errorResponse(message, "BAD_REQUEST", 400);
  }
}
