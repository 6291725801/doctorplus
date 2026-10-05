import crypto from "crypto";
import { IPaymentProvider } from "../provider.interface";
import {
  CreateOrderParams,
  CreateOrderResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
  ProcessWebhookParams,
  WebhookEventResult,
  RefundPaymentParams,
  RefundPaymentResult,
} from "../types";

export class MockPaymentProvider implements IPaymentProvider {
  readonly providerName = "MOCK";
  private secretKey: string;

  constructor(options?: { secretKey?: string }) {
    // ENFORCE: Never allow mock provider in production mode!
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CRITICAL SECURITY: MockPaymentProvider is strictly prohibited in production mode. Please configure a certified payment gateway (e.g. Razorpay)."
      );
    }
    this.secretKey = options?.secretKey || process.env.PAYMENT_MOCK_SECRET || "clinic_payment_mock_test_secret_32bytes!";
  }

  /**
   * Helper to generate a valid test signature for automated tests.
   */
  generateTestSignature(orderId: string, paymentId: string): string {
    return crypto.createHmac("sha256", this.secretKey).update(`${orderId}|${paymentId}`).digest("hex");
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const gatewayOrderId = `order_mock_${timestamp}_${randomSuffix}`;

    return {
      gatewayOrderId,
      amount: params.amount,
      currency: params.currency,
      provider: this.providerName,
      keyId: "mock_key_test_public",
      additionalParams: {
        receipt: params.receipt,
        orderReference: params.orderReference,
      },
    };
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    // Check if the payment ID explicitly indicates a forced simulated failure
    if (params.gatewayPaymentId.includes("fail") || params.gatewayOrderId.includes("fail")) {
      return {
        isValid: false,
        gatewayOrderId: params.gatewayOrderId,
        gatewayPaymentId: params.gatewayPaymentId,
        status: "FAILED",
        errorCode: "PAYMENT_FAILED_SIMULATED",
        errorMessage: "Simulated payment failure (insufficient funds or bank decline).",
      };
    }

    // Server-side verification: Must have a valid signature!
    if (!params.gatewaySignature) {
      return {
        isValid: false,
        gatewayOrderId: params.gatewayOrderId,
        gatewayPaymentId: params.gatewayPaymentId,
        status: "FAILED",
        errorCode: "MISSING_SIGNATURE",
        errorMessage: "Server-side verification failed: Signature missing.",
      };
    }

    const expectedSignature = this.generateTestSignature(params.gatewayOrderId, params.gatewayPaymentId);

    const isMatch =
      params.gatewaySignature.length === expectedSignature.length &&
      crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "utf8"),
        Buffer.from(params.gatewaySignature, "utf8")
      );

    if (!isMatch) {
      return {
        isValid: false,
        gatewayOrderId: params.gatewayOrderId,
        gatewayPaymentId: params.gatewayPaymentId,
        status: "FAILED",
        errorCode: "INVALID_SIGNATURE",
        errorMessage: "Server-side verification failed: Cryptographic signature mismatch or tampered payload.",
      };
    }

    return {
      isValid: true,
      gatewayOrderId: params.gatewayOrderId,
      gatewayPaymentId: params.gatewayPaymentId,
      status: "PAID",
      rawResponse: {
        method: "UPI",
        verifiedAt: new Date().toISOString(),
      },
    };
  }

  async processWebhook(params: ProcessWebhookParams): Promise<WebhookEventResult> {
    const expectedSignature = crypto
      .createHmac("sha256", this.secretKey)
      .update(params.rawBody)
      .digest("hex");

    if (params.signature !== expectedSignature) {
      throw new Error("Invalid mock webhook cryptographic signature.");
    }

    const body = JSON.parse(params.rawBody);
    return {
      eventType: body.eventType || "payment.captured",
      orderId: body.orderId,
      paymentId: body.paymentId,
      amount: body.amount,
      currency: body.currency || "INR",
      status: body.status || "PAID",
      rawPayload: body,
    };
  }

  async refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult> {
    if (params.amount <= 0) {
      return {
        success: false,
        gatewayRefundId: "",
        amount: params.amount,
        currency: params.currency,
        status: "FAILED",
        errorCode: "INVALID_REFUND_AMOUNT",
        errorMessage: "Refund amount must be greater than zero.",
      };
    }

    const gatewayRefundId = `rfnd_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    return {
      success: true,
      gatewayRefundId,
      amount: params.amount,
      currency: params.currency,
      status: "REFUNDED",
      rawResponse: {
        refundedAt: new Date().toISOString(),
        reason: params.reason || "Patient appointment cancellation",
      },
    };
  }
}
