import { IPaymentProvider } from "./provider.interface";
import { RazorpayPaymentProvider } from "./providers/razorpay.provider";
import { MockPaymentProvider } from "./providers/mock.provider";

let currentProviderInstance: IPaymentProvider | null = null;

export function getPaymentProvider(forceProviderName?: string): IPaymentProvider {
  const providerType =
    forceProviderName ||
    process.env.PAYMENT_PROVIDER ||
    (process.env.NODE_ENV === "production" ? "RAZORPAY" : "MOCK");

  if (providerType.toUpperCase() === "RAZORPAY") {
    return new RazorpayPaymentProvider();
  }

  if (providerType.toUpperCase() === "MOCK") {
    return new MockPaymentProvider();
  }

  throw new Error(`Unsupported payment provider type: ${providerType}`);
}

/**
 * Resets or overrides payment provider instance (useful for test isolation).
 */
export function setPaymentProvider(provider: IPaymentProvider | null) {
  currentProviderInstance = provider;
}

export function resolveActivePaymentProvider(): IPaymentProvider {
  if (currentProviderInstance) {
    return currentProviderInstance;
  }
  return getPaymentProvider();
}
