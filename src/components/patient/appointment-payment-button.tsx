/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode, Copy, Check, X } from "lucide-react";

interface AppointmentPaymentButtonProps {
  appointmentId: string;
  amount: number;
  paymentStatus: string;
}

const UPI_ID = "6291725801@superyes";
const UPI_PAYEE_NAME = "Rohit Kumar";
const UPI_QR_IMAGE = "/images/upi-qr.png";

export function AppointmentPaymentButton({
  appointmentId,
  amount,
  paymentStatus,
}: AppointmentPaymentButtonProps) {
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiUtr, setUpiUtr] = useState("");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // If already paid, nothing to show
  if (paymentStatus === "PAID") {
    return null;
  }

  const handleCopyUpi = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(UPI_ID);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2500);
    }
  };

  const handleUpiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiUtr.trim()) {
      setError("Please enter the 12-digit UPI UTR number from your payment app.");
      return;
    }

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

      // 2. Verify with UPI UTR
      const verifyRes = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId,
          paymentId,
          gatewayOrderId,
          gatewayPaymentId: upiUtr.trim(),
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.message || "Payment verification failed");
      }

      setSuccess(true);
      setShowUpiModal(false);
      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Payment submission failed");
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
          ✓ UPI Payment submitted & recorded!
        </div>
      )}

      <Button
        onClick={() => setShowUpiModal(true)}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-9 cursor-pointer gap-2"
      >
        <QrCode className="w-4 h-4" />
        <span>Pay Advance (₹{amount.toFixed(0)}) via UPI QR Code</span>
      </Button>

      {/* UPI QR MODAL */}
      {showUpiModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl relative">
            <button
              onClick={() => setShowUpiModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Scan & Pay via UPI
              </h3>
              <p className="text-xs text-slate-500">
                Scan with GPay, PhonePe, Paytm, or BHIM
              </p>
            </div>

            <div className="flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="w-44 h-52 bg-white p-2 rounded-xl border border-teal-500/40 shadow-xs flex flex-col items-center justify-center">
                <img
                  src={UPI_QR_IMAGE}
                  alt={`UPI QR Code - ${UPI_PAYEE_NAME}`}
                  className="w-full h-auto object-contain rounded-lg"
                />
                <p className="text-[10px] font-bold text-slate-700 mt-1">Rohit Kumar • ₹{amount.toFixed(0)}</p>
              </div>

              <div className="mt-3 text-center">
                <p className="text-[11px] font-semibold text-slate-500">UPI ID</p>
                <div className="flex items-center justify-center gap-1.5 mt-0.5">
                  <code className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                    {UPI_ID}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="p-1 text-slate-400 hover:text-teal-600 cursor-pointer"
                  >
                    {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <form onSubmit={handleUpiSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  12-Digit UPI Reference / UTR Number *
                </label>
                <Input
                  required
                  value={upiUtr}
                  onChange={(e) => setUpiUtr(e.target.value)}
                  placeholder="e.g. 4289XXXXXXXX"
                  className="font-mono text-xs"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !upiUtr.trim()}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-9 cursor-pointer"
              >
                {loading ? "Verifying..." : "Submit UTR & Confirm"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
