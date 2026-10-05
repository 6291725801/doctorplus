import { PaymentStatus, PaymentMethod } from "@prisma/client";

export { PaymentStatus, PaymentMethod };

export interface CreateOrderParams {
  orderReference: string;
  amount: number; // in currency units (e.g. INR)
  currency: string; // e.g. "INR"
  receipt: string;
  notes?: Record<string, string>;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface CreateOrderResult {
  gatewayOrderId: string;
  amount: number;
  currency: string;
  provider: string; // e.g. "RAZORPAY", "STRIPE", "MOCK"
  keyId?: string;
  additionalParams?: Record<string, unknown>;
}

export interface VerifyPaymentParams {
  gatewayOrderId: string;
  gatewayPaymentId: string;
  gatewaySignature?: string;
  amount?: number;
  currency?: string;
}

export interface VerifyPaymentResult {
  isValid: boolean;
  gatewayPaymentId: string;
  gatewayOrderId: string;
  status: PaymentStatus;
  errorCode?: string;
  errorMessage?: string;
  rawResponse?: Record<string, unknown>;
}

export interface ProcessWebhookParams {
  rawBody: string;
  signature: string;
  webhookSecret?: string;
}

export interface WebhookEventResult {
  eventType: "payment.captured" | "payment.failed" | "refund.processed" | "other";
  orderId?: string;
  paymentId?: string;
  amount?: number;
  currency?: string;
  status: PaymentStatus;
  errorCode?: string;
  errorMessage?: string;
  rawPayload: Record<string, unknown>;
}

export interface RefundPaymentParams {
  gatewayPaymentId: string;
  amount: number;
  currency: string;
  reason?: string;
  receipt?: string;
}

export interface RefundPaymentResult {
  success: boolean;
  gatewayRefundId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  errorCode?: string;
  errorMessage?: string;
  rawResponse?: Record<string, unknown>;
}

export interface FeeBreakdown {
  consultationFee: number;
  advanceAmount: number;
  balanceAmount: number;
  currency: string;
}
