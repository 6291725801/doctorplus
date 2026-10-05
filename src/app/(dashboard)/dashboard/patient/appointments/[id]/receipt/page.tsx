import React from "react";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { getAppointmentReceipt } from "@/lib/services/patient.service";
import { ReceiptPrintButton } from "@/components/patient/receipt-print-button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface ReceiptPageProps {
  params: Promise<{ id: string }>;
}

export default async function AppointmentReceiptPage(props: ReceiptPageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { id } = await props.params;

  let receipt;
  try {
    receipt = await getAppointmentReceipt(id, session.userId);
  } catch (err: unknown) {
    const e = err as Error;
    if (e.message.includes("Unauthorized")) {
      redirect("/dashboard/patient");
    }
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Controls (Hidden on print) */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/dashboard/patient/appointments/${id}`}
          className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
        >
          ← Back to Appointment
        </Link>
        <ReceiptPrintButton />
      </div>

      {/* Printable Receipt Paper */}
      <div className="bg-white text-slate-900 border border-slate-300 rounded-2xl p-8 sm:p-12 shadow-sm print:shadow-none print:border-none print:p-0 space-y-8">
        {/* Receipt Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-slate-200 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-lg bg-teal-700 flex items-center justify-center text-white font-black text-lg">
                +
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {receipt.clinic.name}
              </h1>
            </div>
            <p className="text-xs text-slate-500 whitespace-pre-line leading-relaxed max-w-sm">
              {receipt.clinic.address}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Phone: {receipt.clinic.phone} • Email: {receipt.clinic.email}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-800 font-mono text-xs font-bold uppercase tracking-wider mb-2">
              Official Medical Receipt
            </span>
            <div className="font-mono text-sm font-bold text-teal-700">{receipt.receiptNumber}</div>
            <div className="text-xs text-slate-400 mt-0.5">Date: {receipt.invoiceDate}</div>
          </div>
        </div>

        {/* Patient & Doctor Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1">Patient Details</span>
            <p className="text-sm font-bold text-slate-900">{receipt.patient.fullName}</p>
            <p className="text-slate-600">Email: {receipt.patient.email}</p>
            {receipt.patient.phone && <p className="text-slate-600">Phone: {receipt.patient.phone}</p>}
            {receipt.patient.city && <p className="text-slate-600">Location: {receipt.patient.city}</p>}
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1">Consulting Physician</span>
            <p className="text-sm font-bold text-slate-900">Dr. {receipt.doctor.fullName}</p>
            <p className="text-slate-600">{receipt.doctor.specialization} • {receipt.doctor.qualification}</p>
            {receipt.doctor.registrationNumber && (
              <p className="text-slate-500 font-mono">Reg. No: {receipt.doctor.registrationNumber}</p>
            )}
          </div>
        </div>

        {/* Appointment Information */}
        <div className="p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div>
              <span className="text-slate-400">Appointment Reference:</span>{" "}
              <strong className="font-mono text-slate-900">{receipt.appointmentNumber}</strong>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="teal">{receipt.status}</Badge>
              <Badge variant="slate">{receipt.appointmentType.replace(/_/g, " ")}</Badge>
            </div>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Schedule Date & Time:</span>
            <strong>{receipt.appointmentDate} at {receipt.appointmentTime}</strong>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Clinical Service / Procedure:</span>
            <strong>{receipt.service.name} ({receipt.service.durationMinutes} mins)</strong>
          </div>
        </div>

        {/* Ledger Table */}
        <div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <th className="py-2.5 text-left font-bold">Item Description</th>
                <th className="py-2.5 text-center font-bold">Duration</th>
                <th className="py-2.5 text-right font-bold">Amount (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3 font-semibold text-slate-900">
                  Specialist Consultation Fee — Dr. {receipt.doctor.fullName}
                </td>
                <td className="py-3 text-center text-slate-500">{receipt.service.durationMinutes} mins</td>
                <td className="py-3 text-right font-bold text-slate-900">₹{receipt.financials.consultationFee.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div className="border-t border-slate-200 pt-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Gross Consultation Amount:</span>
              <span className="font-semibold">₹{receipt.financials.consultationFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Advance Deposit Received:</span>
              <span>- ₹{receipt.financials.advancePaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-200 pt-3">
              <span>Net Balance Due at Clinic Reception:</span>
              <span className="text-teal-700">₹{receipt.financials.balanceDue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer Notes & Sign */}
        <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 text-[11px] text-slate-400">
          <div className="space-y-1 max-w-sm">
            <p className="font-semibold text-slate-700">Clinical Consultation Terms:</p>
            <p>
              This is a computer-generated medical consultation receipt verified by the clinic management system.
              Prescriptions and lab referrals are delivered during the clinical session.
            </p>
          </div>
          <div className="text-center sm:text-right shrink-0">
            <div className="border-b border-slate-300 w-36 mb-1 mx-auto sm:ml-auto" />
            <div className="font-semibold text-slate-700">Authorized Officer</div>
            <div className="text-[10px] text-slate-400">{receipt.clinic.name}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
