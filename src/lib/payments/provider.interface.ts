import {
  CreateOrderParams,
  CreateOrderResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
  ProcessWebhookParams,
  WebhookEventResult,
  RefundPaymentParams,
  RefundPaymentResult,
} from "./types";

/**
 * Universal payment provider interface for interchangeable gateways (Razorpay, Stripe, Mock).
 * PCI-DSS compliant: Never accepts, handles, or stores raw card credentials.
 */
export interface IPaymentProvider {
  readonly providerName: string;

  /**
   * Initializes a payment order at the payment gateway.
   */
  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>;

  /**
   * Verifies the cryptographic payment signature server-side.
   */
  verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult>;

  /**
   * Verifies and parses gateway webhook notifications.
   */
  processWebhook(params: ProcessWebhookParams): Promise<WebhookEventResult>;

  /**
   * Processes a refund through the gateway.
   */
  refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult>;
}
