"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

interface AppointmentPaymentButtonProps {
  appointmentId: string;
  amount: number;
  paymentStatus: string;
}

export function AppointmentPaymentButton({
  appointmentId,
  amount,
  paymentStatus,
}: AppointmentPaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // If already paid, nothing to show
  if (paymentStatus === "PAID") {
    return null;
  }

  const handlePay = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Initialize payment on server
      const initRes = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, amountType: "ADVANCE" }),
      });

      const initData = await initRes.json();
      if (!initRes.ok) {
        throw new Error(initData.message || "Failed to initialize payment");
      }

      const { gatewayOrderId, paymentId } = initData.data;

      // 2. Perform simulated or real gateway flow
      // In development/test with Mock provider:
      const simulatedPaymentId = `pay_usr_${Date.now()}`;
      // In mock/sandbox mode:
      // Real server-side verification requires the signature
      const verifyRes = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId,
          paymentId,
          gatewayOrderId,
          gatewayPaymentId: simulatedPaymentId,
          // When testing with mock provider, mock generates signature or rejects tampered signature
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.message || "Payment verification failed");
      }

      setSuccess(true);
      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 mt-3">
      {error && (
        <div className="p-2 text-xs rounded bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          {error}
        </div>
      )}
      {success && (
        <div className="p-2 text-xs rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          ✓ Payment verified and confirmed!
        </div>
      )}
      <Button
        onClick={handlePay}
        disabled={loading}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-9 cursor-pointer"
      >
        {loading ? "Processing..." : `Pay Advance Deposit (₹${amount.toFixed(0)}) Online`}
      </Button>
    </div>
  );
}
