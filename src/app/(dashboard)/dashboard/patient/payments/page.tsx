import React from "react";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getPatientPaymentHistory } from "@/lib/services/patient.service";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default async function PatientPaymentsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const paymentsHistory = await getPatientPaymentHistory(session.userId);

  const totalFees = paymentsHistory.reduce((acc, curr) => acc + curr.consultationFee, 0);
  const totalAdvances = paymentsHistory.reduce((acc, curr) => acc + curr.advanceAmount, 0);
  const totalBalances = paymentsHistory.reduce((acc, curr) => acc + curr.balanceAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Payment & Financial History
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track consultation fees, advance slot deposits, remaining clinic balances, and download receipts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/patient"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ← My Appointments
          </Link>
          <Link
            href="/dashboard/patient/profile"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            My Profile
          </Link>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Consultation Fees
            </CardTitle>
            <CardDescription className="text-xs">Cumulative value of booked care</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              ₹{totalFees.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Advance Deposits Paid
            </CardTitle>
            <CardDescription className="text-xs">Paid securely online</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              ₹{totalAdvances.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Remaining Balance Due
            </CardTitle>
            <CardDescription className="text-xs">Payable at clinic reception</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-teal-600 dark:text-teal-400">
              ₹{totalBalances.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Ledger */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Appointment Financial Ledger ({paymentsHistory.length})
          </h3>
        </div>

        {paymentsHistory.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm text-slate-500">No payment or billing records found.</p>
            <Link
              href="/book"
              className="inline-block text-xs font-semibold px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700"
            >
              Book Your First Consultation
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-bold">Appt #</th>
                  <th className="py-3 px-4 font-bold">Doctor & Service</th>
                  <th className="py-3 px-4 font-bold">Date</th>
                  <th className="py-3 px-4 font-bold">Total Fee</th>
                  <th className="py-3 px-4 font-bold">Advance Paid</th>
                  <th className="py-3 px-4 font-bold">Balance Due</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paymentsHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/50 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-600 dark:text-teal-400">
                      {item.appointmentNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        Dr. {item.doctorName}
                      </div>
                      <div className="text-[11px] text-slate-400">{item.serviceName}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {item.appointmentDate}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      ₹{item.consultationFee.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                      ₹{item.advanceAmount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-teal-600 dark:text-teal-400">
                      ₹{item.balanceAmount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={item.paymentStatus === "PAID" ? "emerald" : "amber"}>
                        {item.paymentStatus}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <Link
                        href={`/dashboard/patient/appointments/${item.id}`}
                        className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400"
                      >
                        Details
                      </Link>
                      <Link
                        href={`/dashboard/patient/appointments/${item.id}/receipt`}
                        className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                      >
                        Receipt
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
