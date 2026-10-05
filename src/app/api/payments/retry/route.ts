import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { retryPaymentAttempt } from "@/lib/services/payment.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentId } = body;

    if (!paymentId) {
      return errorResponse("paymentId is required for retry", "BAD_REQUEST", 400);
    }

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const retryResult = await retryPaymentAttempt(paymentId, clientIp, userAgent);

    return successResponse(retryResult, "Payment attempt retried successfully", 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to retry payment";
    return errorResponse(message, "BAD_REQUEST", 400);
  }
}
