import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { processPaymentWebhook } from "@/lib/services/payment.service";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get("x-razorpay-signature") ||
      req.headers.get("x-webhook-signature") ||
      req.headers.get("stripe-signature") ||
      "";

    if (!signature) {
      return errorResponse("Missing webhook signature header", "BAD_REQUEST", 400);
    }

    const eventResult = await processPaymentWebhook({
      rawBody,
      signature,
    });

    return successResponse(eventResult, "Webhook processed successfully", 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook processing failed";
    return errorResponse(message, "BAD_REQUEST", 400);
  }
}
