"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AppointmentStatus, AppointmentType } from "@prisma/client";

export interface AppointmentItem {
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
    specialization?: string;
    roomNumber?: string | null;
    clinicLocation?: string | null;
    user: {
      fullName: string;
      phone?: string | null;
    };
  };
  patientProfile: {
    user: {
      fullName: string;
      email: string;
      phone?: string | null;
    };
  };
  service?: {
    name: string;
  } | null;
}

interface AppointmentDeskViewProps {
  initialAppointments: AppointmentItem[];
  doctors: Array<{ id: string; name: string }>;
  role: "SUPER_ADMIN" | "CLINIC_ADMIN" | "RECEPTIONIST" | "DOCTOR";
}

type TabKey = "ALL" | "TODAY" | "UPCOMING" | "WAITING" | "CHECKED_IN" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export function AppointmentDeskView({
  initialAppointments,
  doctors,
  role,
}: AppointmentDeskViewProps) {
  const [appointments, setAppointments] = useState<AppointmentItem[]>(initialAppointments);
  const [activeTab, setActiveTab] = useState<TabKey>("TODAY");
  const [search, setSearch] = useState("");
  const [doctorFilter, setDoctorFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Modals & Action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // View appointment modal
  const [viewingAppt, setViewingAppt] = useState<AppointmentItem | null>(null);

  // Cancellation modal
  const [cancellingAppt, setCancellingAppt] = useState<AppointmentItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Reschedule modal
  const [reschedulingAppt, setReschedulingAppt] = useState<AppointmentItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");

  // Today string for comparison (YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Update status handler
  const updateStatus = async (
    appointmentId: string,
    newStatus: AppointmentStatus,
    notes?: string,
    cancellationReason?: string
  ) => {
    setActionLoading(appointmentId);
    setMessage(null);

    try {
      const res = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, notes, cancellationReason }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to update appointment status.");
      }

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === appointmentId
            ? { ...a, status: newStatus, doctorNotes: notes || a.doctorNotes, cancellationReason: cancellationReason || a.cancellationReason }
            : a
        )
      );

      if (viewingAppt && viewingAppt.id === appointmentId) {
        setViewingAppt((prev) => (prev ? { ...prev, status: newStatus } : null));
      }

      setMessage({ type: "success", text: `Appointment updated to ${newStatus.replace(/_/g, " ")}.` });
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: "error", text: e.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!cancellingAppt) return;
    setActionLoading(cancellingAppt.id);
    setMessage(null);

    try {
      const res = await fetch(`/api/appointments/${cancellingAppt.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Cancellation failed.");
      }

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === cancellingAppt.id
            ? { ...a, status: AppointmentStatus.CANCELLED, cancellationReason: cancelReason }
            : a
        )
      );
      if (viewingAppt && viewingAppt.id === cancellingAppt.id) {
        setViewingAppt((prev) => (prev ? { ...prev, status: AppointmentStatus.CANCELLED } : null));
      }

      setMessage({ type: "success", text: "Appointment cancelled and slot released." });
      setCancellingAppt(null);
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
      setMessage({ type: "error", text: "Please enter both a new date and time for rescheduling." });
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
          reason: rescheduleReason.trim(),
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
      if (viewingAppt && viewingAppt.id === reschedulingAppt.id) {
        setViewingAppt((prev) =>
          prev
            ? {
                ...prev,
                appointmentDate: rescheduleDate,
                appointmentTime: rescheduleTime,
                status: AppointmentStatus.CONFIRMED,
              }
            : null
        );
      }

      setMessage({ type: "success", text: `Appointment rescheduled to ${rescheduleDate} at ${rescheduleTime}.` });
      setReschedulingAppt(null);
      setRescheduleDate("");
      setRescheduleTime("");
      setRescheduleReason("");
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: "error", text: e.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Tab counters
  const counts = useMemo(() => {
    return {
      ALL: appointments.length,
      TODAY: appointments.filter((a) => a.appointmentDate === todayStr).length,
      UPCOMING: appointments.filter(
        (a) => a.appointmentDate >= todayStr && (a.status === "CONFIRMED" || a.status === "PENDING")
      ).length,
      WAITING: appointments.filter((a) => a.status === "CHECKED_IN" || a.status === "IN_CONSULTATION").length,
      CHECKED_IN: appointments.filter((a) => a.status === "CHECKED_IN").length,
      COMPLETED: appointments.filter((a) => a.status === "COMPLETED").length,
      CANCELLED: appointments.filter((a) => a.status === "CANCELLED").length,
      NO_SHOW: appointments.filter((a) => a.status === "NO_SHOW").length,
    };
  }, [appointments, todayStr]);

  // Filtered appointments list
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      // 1. Tab filter
      switch (activeTab) {
        case "TODAY":
          if (appt.appointmentDate !== todayStr) return false;
          break;
        case "UPCOMING":
          if (appt.appointmentDate < todayStr || (appt.status !== "CONFIRMED" && appt.status !== "PENDING")) {
            return false;
          }
          break;
        case "WAITING":
          if (appt.status !== "CHECKED_IN" && appt.status !== "IN_CONSULTATION") return false;
          break;
        case "CHECKED_IN":
          if (appt.status !== "CHECKED_IN") return false;
          break;
        case "COMPLETED":
          if (appt.status !== "COMPLETED") return false;
          break;
        case "CANCELLED":
          if (appt.status !== "CANCELLED") return false;
          break;
        case "NO_SHOW":
          if (appt.status !== "NO_SHOW") return false;
          break;
        case "ALL":
        default:
          break;
      }

      // 2. Doctor Filter
      if (doctorFilter !== "ALL" && appt.doctor.id !== doctorFilter) return false;

      // 3. Custom Date Filter (if set manually)
      if (dateFilter && appt.appointmentDate !== dateFilter) return false;

      // 4. Patient Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const patientName = (appt.patientProfile?.user?.fullName || "").toLowerCase();
        const phone = (appt.patientProfile?.user?.phone || "").toLowerCase();
        const email = (appt.patientProfile?.user?.email || "").toLowerCase();
        const ref = appt.appointmentNumber.toLowerCase();
        const doc = (appt.doctor?.user?.fullName || "").toLowerCase();
        if (!patientName.includes(q) && !phone.includes(q) && !email.includes(q) && !ref.includes(q) && !doc.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [appointments, activeTab, doctorFilter, dateFilter, search, todayStr]);

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
      case "NO_SHOW":
        return <Badge variant="slate">No-Show</Badge>;
      case "RESCHEDULED":
        return <Badge variant="slate">Rescheduled</Badge>;
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-start justify-between gap-2 shadow-xs transition ${
            message.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="cursor-pointer font-bold opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* QUICK STATUS TABS (Receptionist Requirement) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800 scrollbar-none">
        {[
          { key: "TODAY", label: "Today's Appointments", count: counts.TODAY, icon: "📅" },
          { key: "WAITING", label: "Waiting / Desk", count: counts.WAITING, icon: "⏳" },
          { key: "CHECKED_IN", label: "Checked-in", count: counts.CHECKED_IN, icon: "✅" },
          { key: "UPCOMING", label: "Upcoming", count: counts.UPCOMING, icon: "🗓️" },
          { key: "COMPLETED", label: "Completed", count: counts.COMPLETED, icon: "🎉" },
          { key: "CANCELLED", label: "Cancelled", count: counts.CANCELLED, icon: "❌" },
          { key: "NO_SHOW", label: "No-Show", count: counts.NO_SHOW, icon: "⚠️" },
          { key: "ALL", label: "All Appointments", count: counts.ALL, icon: "📂" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key as TabKey);
              if (tab.key === "TODAY") setDateFilter("");
            }}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition cursor-pointer ${
              activeTab === tab.key
                ? "bg-teal-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                activeTab === tab.key
                  ? "bg-white/20 text-white"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* SEARCH PATIENT & FILTERS BAR */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                🔍 Search Patient / Phone / Ref
              </label>
              <div className="relative">
                <Input
                  placeholder="Patient Name, Phone, or APT-..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="text-xs pr-7"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                Doctor
              </label>
              <select
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
              >
                <option value="ALL">All Doctors ({doctors.length})</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                Specific Date
              </label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setDoctorFilter("ALL");
                  setDateFilter("");
                  setActiveTab("ALL");
                }}
                className="text-xs w-full"
              >
                Reset All
              </Button>
              <a href="/book" target="_blank" className="w-full">
                <Button size="sm" className="text-xs font-bold w-full bg-teal-600 hover:bg-teal-700 text-white">
                  + Walk-in
                </Button>
              </a>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              Showing <span className="font-bold text-slate-900 dark:text-white">{filteredAppointments.length}</span>{" "}
              appointments in view
            </div>
            <div className="text-[11px] font-medium text-slate-400">
              Role Access: <span className="text-teal-600 dark:text-teal-400 font-bold">{role}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* APPOINTMENTS ROSTER */}
      <div className="space-y-3">
        {filteredAppointments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500 text-xs">
              No appointments found for the selected view and filter criteria.
            </CardContent>
          </Card>
        ) : (
          filteredAppointments.map((appt) => {
            const isLoading = actionLoading === appt.id;
            return (
              <Card
                key={appt.id}
                className={`transition border ${
                  appt.status === "CHECKED_IN"
                    ? "border-blue-500/50 bg-blue-50/15 dark:bg-blue-950/20 shadow-xs"
                    : appt.status === "IN_CONSULTATION"
                    ? "border-amber-500/50 bg-amber-50/15 dark:bg-amber-950/20"
                    : appt.status === "COMPLETED"
                    ? "border-emerald-500/30 opacity-95"
                    : appt.status === "CANCELLED"
                    ? "opacity-60 bg-slate-100/50 dark:bg-slate-900/50"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* LEFT INFO: Patient & Doctor */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">
                          {appt.appointmentNumber}
                        </span>
                        {getStatusBadge(appt.status)}
                        <Badge variant="slate" className="text-[10px]">
                          {appt.appointmentType.replace(/_/g, " ")}
                        </Badge>
                        {appt.appointmentDate === todayStr && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200">
                            Today
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline gap-2">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                          {appt.patientProfile?.user?.fullName || "Patient"}
                        </h4>
                        <span className="text-xs text-slate-500">
                          {appt.patientProfile?.user?.phone || appt.patientProfile?.user?.email}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
                        <span>
                          📅 <strong>{appt.appointmentDate}</strong> at <strong>{appt.appointmentTime}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          👨‍⚕️ <strong>{appt.doctor.user.fullName}</strong>
                          {appt.doctor.specialization && ` (${appt.doctor.specialization})`}
                        </span>
                        {appt.service && (
                          <>
                            <span>•</span>
                            <span className="text-teal-600 dark:text-teal-400">{appt.service.name}</span>
                          </>
                        )}
                      </div>

                      {appt.symptoms && (
                        <p className="text-xs text-slate-500 italic bg-slate-100 dark:bg-slate-900 p-2 rounded-lg mt-1">
                          Symptoms: {appt.symptoms}
                        </p>
                      )}
                    </div>

                    {/* FINANCIALS & ACTIONS */}
                    <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-between gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                      <div className="text-right text-xs space-y-0.5">
                        <div className="font-bold text-slate-900 dark:text-white">
                          Fee: ₹{Number(appt.consultationFee).toFixed(2)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Advance: ₹{Number(appt.advanceAmount).toFixed(0)} • Bal: ₹
                          {Number(appt.balanceAmount).toFixed(0)}
                        </div>
                      </div>

                      {/* ACTION BUTTONS (Receptionist: View, Check-in, Reschedule, Cancel, Status) */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* VIEW APPOINTMENT DETAILS */}
                        <button
                          type="button"
                          onClick={() => setViewingAppt(appt)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          👁️ View
                        </button>

                        {/* CHECK-IN (ONE-CLICK ACTION) */}
                        {appt.status === "CONFIRMED" && (
                          <Button
                            size="sm"
                            disabled={isLoading}
                            onClick={() => updateStatus(appt.id, AppointmentStatus.CHECKED_IN)}
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                          >
                            Mark Checked-In
                          </Button>
                        )}

                        {appt.status === "PENDING" && (
                          <Button
                            size="sm"
                            disabled={isLoading}
                            onClick={() => updateStatus(appt.id, AppointmentStatus.CONFIRMED)}
                            className="text-xs bg-teal-600 hover:bg-teal-700 text-white"
                          >
                            Confirm
                          </Button>
                        )}

                        {appt.status === "CHECKED_IN" && (
                          <Button
                            size="sm"
                            disabled={isLoading}
                            onClick={() => updateStatus(appt.id, AppointmentStatus.IN_CONSULTATION)}
                            className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
                          >
                            Send In
                          </Button>
                        )}

                        {appt.status === "IN_CONSULTATION" && (
                          <Button
                            size="sm"
                            disabled={isLoading}
                            onClick={() => updateStatus(appt.id, AppointmentStatus.COMPLETED)}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                          >
                            Complete
                          </Button>
                        )}

                        {/* RESCHEDULE & CANCEL */}
                        {appt.status !== "COMPLETED" && appt.status !== "CANCELLED" && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setReschedulingAppt(appt);
                                setRescheduleDate(appt.appointmentDate);
                                setRescheduleTime(appt.appointmentTime);
                              }}
                              className="px-2 py-1 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              Reschedule
                            </button>

                            <button
                              type="button"
                              onClick={() => setCancellingAppt(appt)}
                              className="px-2 py-1 text-xs font-semibold rounded-md border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"
                            >
                              Cancel
                            </button>

                            {/* NO-SHOW ACTION */}
                            <button
                              type="button"
                              onClick={() => updateStatus(appt.id, AppointmentStatus.NO_SHOW)}
                              className="px-2 py-1 text-xs font-semibold rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              No-Show
                            </button>
                          </>
                        )}

                        {/* STATUS UPDATE DROPDOWN */}
                        <select
                          value={appt.status}
                          onChange={(e) => updateStatus(appt.id, e.target.value as AppointmentStatus)}
                          disabled={isLoading}
                          className="text-[11px] font-semibold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="CONFIRMED">Confirmed</option>
                          <option value="CHECKED_IN">Checked-In</option>
                          <option value="IN_CONSULTATION">In Consultation</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="NO_SHOW">No-Show</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* VIEW APPOINTMENT MODAL (Receptionist Requirement: View appointment) */}
      {viewingAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div>
                <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">
                  {viewingAppt.appointmentNumber}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Appointment Details</h3>
              </div>
              <div>{getStatusBadge(viewingAppt.status)}</div>
            </div>

            {/* Patient Info */}
            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Patient Information
              </span>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {viewingAppt.patientProfile?.user?.fullName}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Phone: {viewingAppt.patientProfile?.user?.phone || "N/A"} • Email:{" "}
                {viewingAppt.patientProfile?.user?.email}
              </div>
            </div>

            {/* Schedule & Doctor */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Consulting Doctor</span>
                <div className="font-bold text-slate-900 dark:text-white">
                  {viewingAppt.doctor.user.fullName}
                </div>
                <div className="text-slate-500">{viewingAppt.doctor.specialization || "General"}</div>
                {viewingAppt.doctor.roomNumber && (
                  <div className="text-teal-600 font-medium">Room: {viewingAppt.doctor.roomNumber}</div>
                )}
              </div>

              <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Time & Service</span>
                <div className="font-bold text-slate-900 dark:text-white">
                  {viewingAppt.appointmentDate} at {viewingAppt.appointmentTime}
                </div>
                <div className="text-slate-500">{viewingAppt.service?.name || "Standard Consultation"}</div>
                <div className="text-slate-500">{viewingAppt.appointmentType.replace(/_/g, " ")}</div>
              </div>
            </div>

            {/* Financial Ledger */}
            <div className="p-3 bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Billing Breakdown</span>
                <div className="font-bold text-slate-900 dark:text-white">
                  Consultation Fee: ₹{Number(viewingAppt.consultationFee).toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  Advance Paid: ₹{Number(viewingAppt.advanceAmount).toFixed(0)}
                </div>
                <div className="text-rose-700 dark:text-rose-400 font-bold">
                  Balance Due: ₹{Number(viewingAppt.balanceAmount).toFixed(0)}
                </div>
              </div>
            </div>

            {/* Symptoms & Notes */}
            {viewingAppt.symptoms && (
              <div className="text-xs space-y-1">
                <span className="font-bold text-slate-700 dark:text-slate-300">Reported Symptoms:</span>
                <p className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-lg text-slate-600 dark:text-slate-400 italic">
                  {viewingAppt.symptoms}
                </p>
              </div>
            )}

            {viewingAppt.cancellationReason && (
              <div className="text-xs space-y-1">
                <span className="font-bold text-rose-600">Cancellation Reason:</span>
                <p className="bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg text-rose-800 dark:text-rose-300">
                  {viewingAppt.cancellationReason}
                </p>
              </div>
            )}

            {/* Action Buttons inside modal */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex gap-2">
                <a
                  href={`/dashboard/patient/appointments/${viewingAppt.id}/receipt`}
                  target="_blank"
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100"
                >
                  🖨️ Receipt
                </a>
              </div>

              <div className="flex items-center gap-2">
                {viewingAppt.status === "CONFIRMED" && (
                  <Button
                    size="sm"
                    onClick={() => updateStatus(viewingAppt.id, AppointmentStatus.CHECKED_IN)}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    Check-in
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setViewingAppt(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CANCELLATION MODAL */}
      {cancellingAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Cancel Appointment {cancellingAppt.appointmentNumber}
            </h3>
            <p className="text-xs text-slate-500">
              Cancelling will release slot <strong>{cancellingAppt.appointmentTime}</strong> on{" "}
              <strong>{cancellingAppt.appointmentDate}</strong> back to public availability.
            </p>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Reason for Cancellation
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Patient requested cancellation, emergency conflict..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setCancellingAppt(null)}>
                Keep Appointment
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={actionLoading === cancellingAppt.id}
                onClick={handleCancel}
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* RESCHEDULE MODAL */}
      {reschedulingAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Reschedule {reschedulingAppt.patientProfile?.user?.fullName}
            </h3>
            <p className="text-xs text-slate-500">
              Current: {reschedulingAppt.appointmentDate} at {reschedulingAppt.appointmentTime} with{" "}
              {reschedulingAppt.doctor.user.fullName}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  New Date *
                </label>
                <Input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  New Time (HH:MM) *
                </label>
                <Input
                  type="text"
                  placeholder="10:30"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Reason for Rescheduling
              </label>
              <Input
                placeholder="e.g. Patient schedule conflict"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setReschedulingAppt(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={actionLoading === reschedulingAppt.id}
                onClick={handleReschedule}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold"
              >
                Confirm Reschedule
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
