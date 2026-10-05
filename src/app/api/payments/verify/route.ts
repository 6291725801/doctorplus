import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { verifyAppointmentPayment } from "@/lib/services/payment.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appointmentId, paymentId, gatewayOrderId, gatewayPaymentId, gatewaySignature } = body;

    if (!appointmentId || !gatewayOrderId || !gatewayPaymentId) {
      return errorResponse("appointmentId, gatewayOrderId, and gatewayPaymentId are required for verification", "BAD_REQUEST", 400);
    }

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined;

    const result = await verifyAppointmentPayment({
      appointmentId,
      paymentId,
      gatewayOrderId,
      gatewayPaymentId,
      gatewaySignature,
      clientIp,
    });

    return successResponse(result, "Payment verified successfully", 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Payment verification failed";
    return errorResponse(message, "BAD_REQUEST", 400);
  }
}
