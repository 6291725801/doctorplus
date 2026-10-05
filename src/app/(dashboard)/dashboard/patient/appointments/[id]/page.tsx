import React from "react";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AppointmentPaymentButton } from "@/components/patient/appointment-payment-button";

interface AppointmentDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function AppointmentDetailsPage(props: AppointmentDetailsPageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { id } = await props.params;

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      patientProfile: {
        include: {
          user: { select: { fullName: true, email: true, phone: true } },
        },
      },
      doctor: {
        include: {
          user: { select: { fullName: true, email: true, phone: true } },
          clinic: { select: { name: true, phone: true, address: true, email: true } },
        },
      },
      service: true,
      payments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!appointment) {
    notFound();
  }

  // Authorization check: patient can only view their own appointment, unless admin or staff
  if (session.role === "PATIENT" && appointment.patientProfile.userId !== session.userId) {
    redirect("/dashboard/patient");
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge variant="teal">CONFIRMED</Badge>;
      case "PENDING":
        return <Badge variant="amber">PENDING</Badge>;
      case "CHECKED_IN":
        return <Badge variant="teal">CHECKED IN</Badge>;
      case "IN_CONSULTATION":
        return <Badge variant="blue">IN CONSULTATION</Badge>;
      case "COMPLETED":
        return <Badge variant="emerald">COMPLETED</Badge>;
      case "CANCELLED":
        return <Badge variant="rose">CANCELLED</Badge>;
      case "NO_SHOW":
        return <Badge variant="slate">NO SHOW</Badge>;
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/patient"
          className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
        >
          ← Back to Appointments
        </Link>
        <Link
          href={`/dashboard/patient/appointments/${appointment.id}/receipt`}
          className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Official Receipt
        </Link>
      </div>

      {/* Main Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-sm font-bold text-teal-600 dark:text-teal-400">
                {appointment.appointmentNumber}
              </span>
              {getStatusBadge(appointment.status)}
              <Badge variant="slate" className="text-xs">
                {appointment.appointmentType.replace(/_/g, " ")}
              </Badge>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Consultation with Dr. {appointment.doctor.user.fullName}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {appointment.doctor.specialization} • {appointment.doctor.qualification}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-xs text-slate-400 font-medium">Scheduled Timing</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {appointment.appointmentDate.toISOString().slice(0, 10)}
            </div>
            <div className="text-sm font-semibold text-teal-600 dark:text-teal-400">
              {appointment.appointmentTime}
            </div>
          </div>
        </div>

        {/* Grid Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          {/* Doctor & Location */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Doctor & Clinic Location</h3>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
              <p>
                <strong>Attending Physician:</strong> Dr. {appointment.doctor.user.fullName}
              </p>
              <p>
                <strong>Room / Chamber:</strong> {appointment.doctor.roomNumber || "Main Consultation Chamber"}
              </p>
              <p>
                <strong>Clinic:</strong> {appointment.doctor.clinic.name}
              </p>
              <p>
                <strong>Address:</strong> {appointment.doctor.clinic.address}
              </p>
              <p>
                <strong>Clinic Contact:</strong> {appointment.doctor.clinic.phone}
              </p>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Financial Breakdown</h3>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Consultation Fee:</span>
                <span className="font-bold text-slate-900 dark:text-white">₹{Number(appointment.consultationFee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Advance Paid:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">- ₹{Number(appointment.advanceAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-2 font-bold text-sm">
                <span>Balance Due at Reception:</span>
                <span className="text-teal-600 dark:text-teal-400">₹{Number(appointment.balanceAmount)}</span>
              </div>
              <div className="pt-1 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Payment Status:</span>
                <Badge variant={appointment.paymentStatus === "PAID" ? "emerald" : "amber"}>
                  {appointment.paymentStatus}
                </Badge>
              </div>

              {appointment.paymentStatus !== "PAID" && (
                <AppointmentPaymentButton
                  appointmentId={appointment.id}
                  amount={Number(appointment.advanceAmount)}
                  paymentStatus={appointment.paymentStatus}
                />
              )}
            </div>
          </div>
        </div>

        {/* Symptoms & Clinical Notes */}
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Clinical Background</h3>
          <div className="space-y-3 text-xs">
            {appointment.service && (
              <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200">
                <strong>Service Requested:</strong> {appointment.service.name} ({appointment.service.durationMinutes} mins)
              </div>
            )}
            {appointment.symptoms && (
              <div>
                <strong className="block text-slate-700 dark:text-slate-300 mb-0.5">Reported Symptoms:</strong>
                <p className="text-slate-600 dark:text-slate-400 p-3 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800">
                  {appointment.symptoms}
                </p>
              </div>
            )}
            {appointment.patientNotes && (
              <div>
                <strong className="block text-slate-700 dark:text-slate-300 mb-0.5">Patient Notes:</strong>
                <p className="text-slate-600 dark:text-slate-400 p-3 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800">
                  {appointment.patientNotes}
                </p>
              </div>
            )}
            {appointment.doctorNotes && (
              <div>
                <strong className="block text-emerald-800 dark:text-emerald-300 mb-0.5">Doctor Clinical Advice / Prescription Notes:</strong>
                <p className="text-emerald-900 dark:text-emerald-200 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  {appointment.doctorNotes}
                </p>
              </div>
            )}
            {appointment.cancellationReason && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200">
                <strong>Cancellation Reason:</strong> {appointment.cancellationReason}
              </div>
            )}
          </div>
        </div>

        {/* Payments Recorded */}
        {appointment.payments.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Transaction History</h3>
            <div className="space-y-2">
              {appointment.payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {p.paymentReference}
                    </span>
                    <span className="text-slate-400 ml-2">via {p.method}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 dark:text-white">₹{Number(p.amount)}</span>
                    <Badge variant={p.status === "PAID" ? "emerald" : "slate"}>{p.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
