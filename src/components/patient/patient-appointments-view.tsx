"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { AppointmentStatus, AppointmentType } from "@prisma/client";

export interface PatientAppointmentItem {
  id: string;
  appointmentNumber: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: AppointmentType;
  status: AppointmentStatus;
  consultationFee: number;
  advanceAmount: number;
  balanceAmount: number;
  paymentStatus: string;
  symptoms?: string | null;
  patientNotes?: string | null;
  doctorNotes?: string | null;
  cancellationReason?: string | null;
  doctor: {
    id: string;
    specialization: string;
    roomNumber?: string | null;
    user: {
      fullName: string;
      phone?: string | null;
    };
  };
  service?: {
    name: string;
  } | null;
}

interface PatientAppointmentsViewProps {
  initialAppointments: PatientAppointmentItem[];
}

export function PatientAppointmentsView({ initialAppointments }: PatientAppointmentsViewProps) {
  const [appointments, setAppointments] = useState<PatientAppointmentItem[]>(initialAppointments);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Cancellation
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Rescheduling
  const [reschedulingAppt, setReschedulingAppt] = useState<PatientAppointmentItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  const handleCancel = async () => {
    if (!cancellingId) return;
    setActionLoading(cancellingId);
    setMessage(null);

    try {
      const res = await fetch(`/api/appointments/${cancellingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason || "Cancelled by patient" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Cancellation failed.");
      }

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === cancellingId
            ? { ...a, status: AppointmentStatus.CANCELLED, cancellationReason: cancelReason }
            : a
        )
      );
      setMessage({ type: "success", text: "Appointment cancelled successfully." });
      setCancellingId(null);
      setCancelReason("");
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: "error", text: e.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReschedule = async () => {
    if (!reschedulingAppt || !rescheduleDate || !rescheduleTime) {
      setMessage({ type: "error", text: "Please enter both a new date and time." });
      return;
    }
    setActionLoading(reschedulingAppt.id);
    setMessage(null);

    try {
      const res = await fetch(`/api/appointments/${reschedulingAppt.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newDate: rescheduleDate,
          newTime: rescheduleTime,
          reason: "Rescheduled by patient",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Rescheduling failed.");
      }

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === reschedulingAppt.id
            ? {
                ...a,
                appointmentDate: rescheduleDate,
                appointmentTime: rescheduleTime,
                status: AppointmentStatus.CONFIRMED,
              }
            : a
        )
      );
      setMessage({ type: "success", text: `Appointment rescheduled to ${rescheduleDate} at ${rescheduleTime}.` });
      setReschedulingAppt(null);
      setRescheduleDate("");
      setRescheduleTime("");
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: "error", text: e.message });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge variant="teal">Confirmed</Badge>;
      case "CHECKED_IN":
        return <Badge variant="blue">Checked In</Badge>;
      case "IN_CONSULTATION":
        return <Badge variant="amber">In Consultation</Badge>;
      case "COMPLETED":
        return <Badge variant="emerald">Completed</Badge>;
      case "CANCELLED":
        return <Badge variant="rose">Cancelled</Badge>;
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="font-bold opacity-60">
            ✕
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          My Scheduled Appointments ({appointments.length})
        </h3>
        <Link href="/book">
          <Button size="sm" className="text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white">
            + Book New Consultation
          </Button>
        </Link>
      </div>

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <p className="text-sm text-slate-500">You do not have any appointments scheduled yet.</p>
            <Link href="/book">
              <Button size="sm">Schedule Your First Visit</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => (
            <Card
              key={appt.id}
              className={`border transition ${
                appt.status === "CONFIRMED"
                  ? "border-teal-500/30"
                  : appt.status === "COMPLETED"
                  ? "border-emerald-500/30"
                  : appt.status === "CANCELLED"
                  ? "opacity-60 bg-slate-50/50 dark:bg-slate-900/50"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">
                        {appt.appointmentNumber}
                      </span>
                      {getStatusBadge(appt.status)}
                      <Badge variant="slate" className="text-[10px]">
                        {appt.appointmentType.replace(/_/g, " ")}
                      </Badge>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Dr. {appt.doctor.user.fullName}
                      <span className="text-xs font-normal text-slate-500 ml-1.5">
                        ({appt.doctor.specialization})
                      </span>
                    </h4>

                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      📅 <strong>{appt.appointmentDate}</strong> at <strong>{appt.appointmentTime}</strong>
                      {appt.doctor.roomNumber && ` • ${appt.doctor.roomNumber}`}
                    </p>

                    {appt.service && (
                      <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">
                        Service: {appt.service.name}
                      </p>
                    )}

                    {appt.doctorNotes && (
                      <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-xs text-emerald-800 dark:text-emerald-200 mt-2">
                        <p className="font-bold">Doctor Advice & Notes:</p>
                        <p className="mt-0.5">{appt.doctorNotes}</p>
                      </div>
                    )}

                    {appt.cancellationReason && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 italic mt-1">
                        Reason: {appt.cancellationReason}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:items-end justify-between gap-2 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <div className="text-left sm:text-right text-xs">
                      <p className="text-slate-500">
                        Total Fee: <strong className="text-slate-900 dark:text-white">₹{appt.consultationFee}</strong>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Advance: ₹{appt.advanceAmount} • Balance: ₹{appt.balanceAmount}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Link
                        href={`/dashboard/patient/appointments/${appt.id}`}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/60"
                      >
                        Details
                      </Link>
                      <Link
                        href={`/dashboard/patient/appointments/${appt.id}/receipt`}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Receipt
                      </Link>

                      {appt.status !== "COMPLETED" && appt.status !== "CANCELLED" && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setReschedulingAppt(appt);
                              setRescheduleDate(appt.appointmentDate);
                              setRescheduleTime(appt.appointmentTime);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            Reschedule
                          </button>
                          <button
                            type="button"
                            onClick={() => setCancellingId(appt.id)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-md border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CANCEL MODAL */}
      {cancellingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Cancel Appointment</h4>
            <p className="text-xs text-slate-500">
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </p>
            <Input
              placeholder="Reason for cancellation (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="text-xs"
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setCancellingId(null)}>
                Keep
              </Button>
              <Button size="sm" variant="danger" disabled={actionLoading === cancellingId} onClick={handleCancel}>
                Cancel Appointment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* RESCHEDULE MODAL */}
      {reschedulingAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Reschedule Appointment</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">New Date</label>
                <Input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                  New Time (HH:MM)
                </label>
                <Input
                  placeholder="10:00"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setReschedulingAppt(null)}>
                Close
              </Button>
              <Button
                size="sm"
                disabled={actionLoading === reschedulingAppt.id}
                onClick={handleReschedule}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold"
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
