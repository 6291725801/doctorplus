"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface AdminPaymentItem {
  id: string;
  paymentReference: string;
  amount: number;
  currency: string;
  status: "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "REFUNDED" | "PARTIALLY_PAID" | "AUTHORIZED";
  method: string;
  gatewayProvider: string;
  gatewayOrderId?: string | null;
  gatewayPaymentId?: string | null;
  paidAt?: string | null;
  createdAt: string;
  appointment: {
    id: string;
    appointmentNumber: string;
    date: string;
    time: string;
    status: string;
    consultationFee: number;
    advanceAmount: number;
    balanceAmount: number;
  };
  patient: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
  };
  doctor: {
    id: string;
    fullName: string;
    specialization: string;
  };
  service: string;
  attemptsCount: number;
  attempts?: Array<{
    id: string;
    attemptNumber: number;
    status: string;
    amount: number;
    gatewayOrderId?: string | null;
    gatewayPaymentId?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    createdAt: string;
  }>;
  refunds?: Array<{
    id: string;
    refundReference: string;
    amount: number;
    reason?: string | null;
    status: string;
    createdAt: string;
  }>;
}

export function AdminPaymentsView() {
  const [payments, setPayments] = useState<AdminPaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedPayment, setSelectedPayment] = useState<AdminPaymentItem | null>(null);

  // Refund Modal State
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundPaymentId, setRefundPaymentId] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [refundReason, setRefundReason] = useState<string>("");
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  // Settings State
  const [minAdvance, setMinAdvance] = useState<number>(100);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setPayments(json.data.items || []);
      }
    } catch (e) {
      console.error("Failed to load payments", e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings/payment");
      if (res.ok) {
        const json = await res.json();
        if (json.data?.minAdvanceAmount !== undefined) {
          setMinAdvance(json.data.minAdvanceAmount);
        }
      }
    } catch (e) {
      console.error("Failed to load settings", e);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const init = async () => {
      if (active) {
        await Promise.all([fetchPayments(), fetchSettings()]);
      }
    };
    init();
    return () => {
      active = false;
    };
  }, [fetchPayments, fetchSettings]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPayments();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess(false);
    try {
      const res = await fetch("/api/admin/settings/payment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minAdvanceAmount: Number(minAdvance) }),
      });
      if (res.ok) {
        setSettingsSuccess(true);
        setTimeout(() => setSettingsSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  const openRefundModal = (p: AdminPaymentItem) => {
    setRefundPaymentId(p.id);
    setRefundAmount(p.amount.toString());
    setRefundReason("Appointment cancellation or administrative refund");
    setRefundError(null);
    setRefundModalOpen(true);
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundPaymentId) return;
    setRefundLoading(true);
    setRefundError(null);

    try {
      const res = await fetch(`/api/payments/${refundPaymentId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(refundAmount),
          reason: refundReason,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Refund failed");
      }

      setRefundModalOpen(false);
      fetchPayments();
    } catch (err: unknown) {
      setRefundError(err instanceof Error ? err.message : "Refund processing failed");
    } finally {
      setRefundLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">PAID</Badge>;
      case "PARTIALLY_PAID":
        return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30">PARTIALLY PAID</Badge>;
      case "PROCESSING":
        return <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 animate-pulse">PROCESSING</Badge>;
      case "PENDING":
        return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">PENDING</Badge>;
      case "FAILED":
        return <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">FAILED</Badge>;
      case "REFUNDED":
        return <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30">REFUNDED</Badge>;
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Configurable Advance Setting */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-bold flex items-center justify-between">
              <span>Appointment Payment Ledger</span>
              <span className="text-xs font-normal text-slate-500">Live Transaction Audit</span>
            </CardTitle>
            <CardDescription>
              Comprehensive ledger of consultation fees, advance deposits, gateway transactions, and refunds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search and Filters */}
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Input
                  type="text"
                  placeholder="Search by Patient, Doctor, Reference, Order ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-3"
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PAID">PAID</option>
                  <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
                  <option value="PROCESSING">PROCESSING</option>
                  <option value="PENDING">PENDING</option>
                  <option value="FAILED">FAILED</option>
                  <option value="REFUNDED">REFUNDED</option>
                </select>
                <Button type="submit" variant="primary" className="bg-teal-600 hover:bg-teal-700 text-white">
                  Filter
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Minimum Advance Configuration Widget */}
        <Card className="border-teal-500/20 bg-teal-50/30 dark:bg-teal-950/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-teal-900 dark:text-teal-200">
              Minimum Advance Setting
            </CardTitle>
            <CardDescription className="text-xs text-teal-700/80 dark:text-teal-300/80">
              Configurable clinic deposit required to secure appointments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Minimum Advance Amount (₹)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-sm text-slate-400">₹</span>
                    <Input
                      type="number"
                      min={0}
                      step={10}
                      value={minAdvance}
                      onChange={(e) => setMinAdvance(Number(e.target.value))}
                      className="pl-7 font-bold text-teal-800 dark:text-teal-200"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={savingSettings}
                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-10 px-4"
                  >
                    {savingSettings ? "Saving..." : "Update"}
                  </Button>
                </div>
              </div>
              {settingsSuccess && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ Minimum advance amount updated to ₹{minAdvance}!
                </p>
              )}
              <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-900/70 p-2 rounded border border-teal-500/10">
                Example: For ₹500 fee with ₹{minAdvance} advance, patient pays ₹{minAdvance} now, remaining ₹{Math.max(0, 500 - minAdvance)} at reception desk.
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Main Transactions Table */}
      <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Recorded Transactions ({payments.length})
          </span>
          <Button variant="outline" size="sm" onClick={fetchPayments} disabled={loading} className="text-xs">
            {loading ? "Refreshing..." : "↻ Refresh Ledger"}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Amount & Status</th>
                <th className="py-3 px-4">Appointment</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Doctor</th>
                <th className="py-3 px-4">Transaction Reference</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    {loading ? "Loading transactions..." : "No payment records found matching your filters."}
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Amount & Status */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white text-base">
                        ₹{p.amount.toFixed(2)}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        {getStatusBadge(p.status)}
                        {p.attemptsCount > 1 && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({p.attemptsCount} attempts)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Appointment */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-teal-600 dark:text-teal-400">
                        {p.appointment.appointmentNumber}
                      </div>
                      <div className="text-xs text-slate-500">
                        {p.appointment.date} at {p.appointment.time}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Fee: ₹{p.appointment.consultationFee} | Bal: ₹{p.appointment.balanceAmount}
                      </div>
                    </td>

                    {/* Patient */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {p.patient.fullName}
                      </div>
                      <div className="text-xs text-slate-500">{p.patient.phone}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                        {p.patient.email}
                      </div>
                    </td>

                    {/* Doctor */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {p.doctor.fullName}
                      </div>
                      <div className="text-xs text-slate-500">{p.doctor.specialization}</div>
                      <div className="text-[11px] text-slate-400">{p.service}</div>
                    </td>

                    {/* Transaction Reference */}
                    <td className="py-3 px-4">
                      <div className="font-mono text-xs text-slate-700 dark:text-slate-300 font-medium">
                        {p.paymentReference}
                      </div>
                      {p.gatewayOrderId && (
                        <div className="text-[11px] font-mono text-slate-500">
                          Ord: {p.gatewayOrderId}
                        </div>
                      )}
                      {p.gatewayPaymentId && (
                        <div className="text-[11px] font-mono text-teal-600 dark:text-teal-400">
                          Pay: {p.gatewayPaymentId}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                        {p.gatewayProvider} • {p.method}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      <div>{new Date(p.createdAt).toLocaleDateString()}</div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(p.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      {p.paidAt && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          Captured
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPayment(p)}
                          className="text-xs h-8 text-slate-600 dark:text-slate-300"
                        >
                          Audit Logs
                        </Button>
                        {(p.status === "PAID" || p.status === "PARTIALLY_PAID") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openRefundModal(p)}
                            className="text-xs h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                          >
                            Refund
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Audit Detail Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Transaction Details: {selectedPayment.paymentReference}
              </h3>
              <button
                onClick={() => setSelectedPayment(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Appointment</span>
                <span className="font-semibold">{selectedPayment.appointment.appointmentNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Total Consultation Fee</span>
                <span className="font-semibold">₹{selectedPayment.appointment.consultationFee.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Advance Deposit</span>
                <span className="font-semibold">₹{selectedPayment.appointment.advanceAmount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Balance Due at Clinic</span>
                <span className="font-semibold text-amber-600">₹{selectedPayment.appointment.balanceAmount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Gateway Provider</span>
                <span className="font-semibold">{selectedPayment.gatewayProvider}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Gateway Order ID</span>
                <span className="font-mono">{selectedPayment.gatewayOrderId || "N/A"}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block">Gateway Payment ID</span>
                <span className="font-mono text-teal-600">{selectedPayment.gatewayPaymentId || "N/A"}</span>
              </div>
            </div>

            {/* Attempts History */}
            <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-2">
                Payment Attempts History ({selectedPayment.attempts?.length || 0})
              </h4>
              <div className="space-y-2">
                {selectedPayment.attempts?.map((att) => (
                  <div
                    key={att.id}
                    className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-xs flex justify-between items-center"
                  >
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Attempt #{att.attemptNumber}
                      </span>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {att.gatewayOrderId || "No gateway order"}
                      </div>
                      {att.errorMessage && (
                        <div className="text-[11px] text-rose-500 font-medium">
                          Error: {att.errorMessage}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      {getStatusBadge(att.status)}
                      <div className="text-[10px] text-slate-400 mt-1">
                        {new Date(att.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Refunds if any */}
            {selectedPayment.refunds && selectedPayment.refunds.length > 0 && (
              <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
                <h4 className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase mb-2">
                  Refunds Processed
                </h4>
                {selectedPayment.refunds.map((r) => (
                  <div
                    key={r.id}
                    className="p-2.5 rounded bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs flex justify-between items-center"
                  >
                    <div>
                      <span className="font-bold text-purple-900 dark:text-purple-200">
                        {r.refundReference}
                      </span>
                      <div className="text-[11px] text-purple-700/80 dark:text-purple-300/80">
                        Reason: {r.reason || "Patient Refund"}
                      </div>
                    </div>
                    <div className="text-right font-bold text-purple-900 dark:text-purple-100">
                      ₹{r.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-right">
              <Button variant="secondary" size="sm" onClick={() => setSelectedPayment(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Action Modal */}
      {refundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              Process Appointment Refund
            </h3>
            <p className="text-xs text-slate-500">
              Initiates a gateway refund to the patient&apos;s original payment mode and marks the appointment refunded.
            </p>

            {refundError && (
              <div className="p-3 text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded border border-rose-200 dark:border-rose-800">
                {refundError}
              </div>
            )}

            <form onSubmit={handleProcessRefund} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Refund Amount (₹)
                </label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Reason for Refund
                </label>
                <Input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Patient cancelled appointment 24 hours prior"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRefundModalOpen(false)}
                  disabled={refundLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={refundLoading}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {refundLoading ? "Processing Refund..." : "Confirm Refund"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
