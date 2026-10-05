# Payment Architecture & Policies

## 1. Advance Payment Requirement

Every appointment booking requires a mandatory minimum advance payment of ₹100.

- **Minimum Advance**: Default ₹100.00 (configurable in `ClinicSettings.minAdvanceAmount` and `Doctor.advanceBookingFee`).
- **Consultation Fee**: Configurable per doctor and per service.
- **Balance Calculation**:
  $$\text{Balance Amount} = \text{Total Consultation Fee} - \text{Advance Amount}$$

### Example:
- Total Fee: ₹500.00
- Advance: ₹100.00
- Balance due at clinic reception: ₹400.00
- Status: `PARTIALLY_PAID`

## 2. Payment Service Abstraction

Payment gateways (Razorpay, Stripe, Cash, UPI) are isolated behind a unified service abstraction:

```typescript
export interface PaymentGatewayProvider {
  createOrder(params: CreateOrderParams): Promise<OrderResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<VerificationResult>;
  refundPayment(params: RefundParams): Promise<RefundResult>;
}
```

Card details are **never** stored on the application servers. Only payment gateway transaction references, signatures, and timestamps are recorded in the `Payment` table.
