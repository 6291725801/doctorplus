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

export class RazorpayPaymentProvider implements IPaymentProvider {
  readonly providerName = "RAZORPAY";
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;

  constructor(options?: { keyId?: string; keySecret?: string; webhookSecret?: string }) {
    this.keyId = options?.keyId || process.env.RAZORPAY_KEY_ID || "";
    this.keySecret = options?.keySecret || process.env.RAZORPAY_KEY_SECRET || "";
    this.webhookSecret = options?.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || "";
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    if (!this.keyId || !this.keySecret) {
      throw new Error("Razorpay API credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) not configured.");
    }

    // Convert INR rupees to paise (integer)
    const amountInSubunits = Math.round(params.amount * 100);

    const authHeader = "Basic " + Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount: amountInSubunits,
        currency: params.currency.toUpperCase(),
        receipt: params.receipt,
        notes: params.notes,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`Razorpay order creation failed: ${errData.error?.description || response.statusText}`);
    }

    const order = await response.json();
    return {
      gatewayOrderId: order.id,
      amount: params.amount,
      currency: params.currency,
      provider: this.providerName,
      keyId: this.keyId,
      additionalParams: {
        receipt: params.receipt,
      },
    };
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    if (!this.keySecret) {
      throw new Error("Razorpay key secret not configured for server-side payment verification.");
    }

    if (!params.gatewaySignature) {
      return {
        isValid: false,
        gatewayOrderId: params.gatewayOrderId,
        gatewayPaymentId: params.gatewayPaymentId,
        status: "FAILED",
        errorCode: "MISSING_SIGNATURE",
        errorMessage: "Payment signature missing for Razorpay verification.",
      };
    }

    const expectedSignature = crypto
      .createHmac("sha256", this.keySecret)
      .update(`${params.gatewayOrderId}|${params.gatewayPaymentId}`)
      .digest("hex");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf8"),
      Buffer.from(params.gatewaySignature, "utf8")
    );

    if (!isValid) {
      return {
        isValid: false,
        gatewayOrderId: params.gatewayOrderId,
        gatewayPaymentId: params.gatewayPaymentId,
        status: "FAILED",
        errorCode: "INVALID_SIGNATURE",
        errorMessage: "Cryptographic signature verification failed. Transaction rejected.",
      };
    }

    return {
      isValid: true,
      gatewayOrderId: params.gatewayOrderId,
      gatewayPaymentId: params.gatewayPaymentId,
      status: "PAID",
      rawResponse: {
        verifiedAt: new Date().toISOString(),
      },
    };
  }

  async processWebhook(params: ProcessWebhookParams): Promise<WebhookEventResult> {
    const secret = params.webhookSecret || this.webhookSecret;
    if (!secret) {
      throw new Error("Razorpay webhook secret not configured.");
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(params.rawBody)
      .digest("hex");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf8"),
      Buffer.from(params.signature, "utf8")
    );

    if (!isValid) {
      throw new Error("Invalid webhook cryptographic signature.");
    }

    const body = JSON.parse(params.rawBody);
    const event = body.event;
    const paymentEntity = body.payload?.payment?.entity;
    const refundEntity = body.payload?.refund?.entity;

    if (event === "payment.captured") {
      return {
        eventType: "payment.captured",
        orderId: paymentEntity?.order_id,
        paymentId: paymentEntity?.id,
        amount: paymentEntity?.amount ? paymentEntity.amount / 100 : undefined,
        currency: paymentEntity?.currency,
        status: "PAID",
        rawPayload: body,
      };
    }

    if (event === "payment.failed") {
      return {
        eventType: "payment.failed",
        orderId: paymentEntity?.order_id,
        paymentId: paymentEntity?.id,
        status: "FAILED",
        errorCode: paymentEntity?.error_code,
        errorMessage: paymentEntity?.error_description,
        rawPayload: body,
      };
    }

    if (event === "refund.processed") {
      return {
        eventType: "refund.processed",
        paymentId: refundEntity?.payment_id,
        amount: refundEntity?.amount ? refundEntity.amount / 100 : undefined,
        status: "REFUNDED",
        rawPayload: body,
      };
    }

    return {
      eventType: "other",
      status: "PENDING",
      rawPayload: body,
    };
  }

  async refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult> {
    if (!this.keyId || !this.keySecret) {
      throw new Error("Razorpay credentials not configured for refund.");
    }

    const amountInSubunits = Math.round(params.amount * 100);
    const authHeader = "Basic " + Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64");

    const response = await fetch(`https://api.razorpay.com/v1/payments/${params.gatewayPaymentId}/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount: amountInSubunits,
        notes: { reason: params.reason || "Appointment cancellation refund" },
        receipt: params.receipt,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        success: false,
        gatewayRefundId: "",
        amount: params.amount,
        currency: params.currency,
        status: "FAILED",
        errorCode: errData.error?.code || "REFUND_ERROR",
        errorMessage: errData.error?.description || response.statusText,
      };
    }

    const refund = await response.json();
    return {
      success: true,
      gatewayRefundId: refund.id,
      amount: params.amount,
      currency: params.currency,
      status: "REFUNDED",
      rawResponse: refund,
    };
  }
}
