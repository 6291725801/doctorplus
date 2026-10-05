/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AppointmentType } from "@prisma/client";
import { Copy, Check, QrCode, Smartphone, ShieldCheck, AlertCircle, Ban } from "lucide-react";

export interface BookingDoctor {
  id: string;
  specialization: string;
  qualification: string;
  experienceYears?: number;
  consultationFee: number;
  advanceBookingFee: number;
  appointmentDurationMinutes: number;
  roomNumber?: string | null;
  profilePhotoUrl?: string | null;
  user: {
    fullName: string;
    email?: string;
  };
}

export interface BookingService {
  id: string;
  name: string;
  fee: number;
  durationMinutes: number;
}

interface SlotItem {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  status: "AVAILABLE" | "BREAK" | "BLOCKED" | "BOOKED" | "PAST";
  reason?: string;
}

interface SlotResponseData {
  available: boolean;
  unavailabilityReason?: string;
  isFullyBooked?: boolean;
  currentBookedCount?: number;
  maxDailyAppointments?: number | null;
  nextAvailableDate?: string | null;
  slots: SlotItem[];
}

interface AppointmentBookingViewProps {
  doctors: BookingDoctor[];
  services?: BookingService[];
  initialDoctorId?: string;
  initialServiceId?: string;
  prefilledPatient?: {
    fullName?: string;
    email?: string;
    phone?: string;
  } | null;
  onSuccess?: (appointment: Record<string, unknown>) => void;
}

const UPI_ID = "6291725801@superyes";
const UPI_PAYEE_NAME = "Rohit Kumar";
const UPI_QR_IMAGE = "/images/upi-qr.png";

export function AppointmentBookingView({
  doctors,
  services = [],
  initialDoctorId,
  initialServiceId,
  prefilledPatient,
  onSuccess,
}: AppointmentBookingViewProps) {
  // 1. Doctor selection
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    initialDoctorId || (doctors.length > 0 ? doctors[0].id : "")
  );

  // 2. Service selection (optional)
  const [selectedServiceId, setSelectedServiceId] = useState<string>(initialServiceId || "");

  // 3. Date selection (defaults to tomorrow in YYYY-MM-DD)
  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  };
  const [selectedDate, setSelectedDate] = useState<string>(getTomorrowStr());

  // 4. Slots state
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [slotData, setSlotData] = useState<SlotResponseData | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");

  // 5. Appointment Type
  const [appointmentType, setAppointmentType] = useState<AppointmentType>(AppointmentType.IN_PERSON);

  // 6. Patient Details & Symptoms
  const [fullName, setFullName] = useState(prefilledPatient?.fullName || "");
  const [email, setEmail] = useState(prefilledPatient?.email || "");
  const [phone, setPhone] = useState(prefilledPatient?.phone || "");
  const [symptoms, setSymptoms] = useState("");
  const [patientNotes, setPatientNotes] = useState("");

  // 7. UPI Payment state (Mandatory - No COD)
  const [upiTransactionId, setUpiTransactionId] = useState("");
  const [upiPaidConfirmed, setUpiPaidConfirmed] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // 8. Booking status state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<Record<string, unknown> | null>(null);

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);
  const selectedService = services.find((s) => s.id === selectedServiceId);

  // Calculate fees
  const consultationFee = selectedService ? selectedService.fee : (selectedDoctor?.consultationFee || 500);
  const advanceAmount = selectedDoctor?.advanceBookingFee || 100;
  const balanceAmount = Math.max(0, consultationFee - advanceAmount);

  // Deep-link for mobile UPI applications
  const upiIntentUrl = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(
    UPI_PAYEE_NAME
  )}&am=${advanceAmount}&cu=INR&tn=${encodeURIComponent(
    `Clinic Slot Advance ${selectedDate}`
  )}`;

  const handleCopyUpi = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(UPI_ID);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2500);
    }
  };

  // Fetch slots whenever doctor or date changes
  useEffect(() => {
    if (!selectedDoctorId || !selectedDate) return;

    let isCurrent = true;
    const timer = setTimeout(() => {
      if (!isCurrent) return;
      setLoadingSlots(true);
      setError(null);
      setSelectedTime("");

      fetch(`/api/schedule/slots?doctorId=${selectedDoctorId}&date=${selectedDate}`)
        .then((res) => res.json())
        .then((res) => {
          if (!isCurrent) return;
          if (res.success) {
            setSlotData(res.data);
          } else {
            setSlotData(null);
            setError(res.error?.message || "Failed to load doctor slots.");
          }
        })
        .catch((err) => {
          if (!isCurrent) return;
          setError(err.message || "Network error loading slots.");
        })
        .finally(() => {
          if (isCurrent) setLoadingSlots(false);
        });
    }, 0);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [selectedDoctorId, selectedDate]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !selectedDate || !selectedTime) {
      setError("Please select a doctor, consultation date, and available time slot.");
      return;
    }

    if (!fullName.trim() || !email.trim()) {
      setError("Please provide your full name and email address.");
      return;
    }

    if (!upiTransactionId.trim()) {
      setError(
        "Please complete the advance payment of ₹" +
          advanceAmount +
          " via UPI QR code and enter the 12-digit UPI Reference / UTR Number."
      );
      return;
    }

    if (!upiPaidConfirmed) {
      setError("Please check the confirmation box verifying that you have completed the UPI payment.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: selectedDoctorId,
          appointmentDate: selectedDate,
          appointmentTime: selectedTime,
          appointmentType,
          serviceId: selectedServiceId || undefined,
          patientDetails: {
            fullName: fullName.trim(),
            email: email.trim(),
            phone: phone.trim() || undefined,
          },
          symptoms: symptoms.trim() || undefined,
          patientNotes: patientNotes.trim() || undefined,
          paymentMethod: "UPI",
          upiTransactionId: upiTransactionId.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Booking failed.");
      }

      setBookingSuccess(data.data);
      if (onSuccess) {
        onSuccess(data.data);
      }
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "An error occurred while confirming your appointment.");
    } finally {
      setSubmitting(false);
    }
  };

  // SUCCESS SCREEN
  if (bookingSuccess) {
    const doc = bookingSuccess.doctor as { user?: { fullName?: string } } | undefined;
    return (
      <Card className="max-w-2xl mx-auto border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-300 mb-2">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>
          <CardTitle className="text-2xl font-extrabold text-emerald-800 dark:text-emerald-200">
            Slot Booked & Advance Received!
          </CardTitle>
          <CardDescription>
            Your appointment has been registered with the clinic. Your UPI payment proof has been linked.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Appointment Reference
              </span>
              <span className="font-mono text-sm font-bold text-teal-600 dark:text-teal-400">
                {String(bookingSuccess.appointmentNumber)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Doctor</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {doc?.user?.fullName || "Assigned Practitioner"}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Date & Time</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {String(bookingSuccess.appointmentDate).slice(0, 10)} at {String(bookingSuccess.appointmentTime)}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Payment Mode</p>
                <div className="mt-0.5 flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300">
                  <QrCode className="w-3.5 h-3.5 text-teal-600" />
                  <span>UPI (QR Code)</span>
                </div>
              </div>
              <div>
                <p className="text-slate-400 font-medium">UPI Ref / UTR</p>
                <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                  {upiTransactionId || "Recorded"}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-500">Advance Paid via UPI: </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{Number(bookingSuccess.advanceAmount || advanceAmount).toFixed(2)} ✓
                </span>
              </div>
              <div>
                <span className="text-slate-500">Remaining Balance: </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  ₹{Number(bookingSuccess.balanceAmount || balanceAmount).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-[11px] text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Payment received for Payee <strong>{UPI_PAYEE_NAME}</strong> ({UPI_ID}). Clinic reception will verify the UTR upon arrival.
              </span>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => {
                setBookingSuccess(null);
                setSelectedTime("");
                setUpiTransactionId("");
                setUpiPaidConfirmed(false);
              }}
            >
              Book Another Appointment
            </Button>
            <a href="/dashboard/patient">
              <Button>Go to Patient Portal</Button>
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleBook} className="max-w-4xl mx-auto space-y-6">
      {/* NO COD WARNING BANNER */}
      <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 flex items-center justify-between gap-3 text-amber-900 dark:text-amber-100 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-amber-200 dark:bg-amber-900 flex items-center justify-center shrink-0">
            <Ban className="w-4 h-4 text-amber-800 dark:text-amber-200" />
          </div>
          <div>
            <p className="font-bold">Important: Cash on Delivery (COD) / Pay-at-Clinic Not Available</p>
            <p className="text-[11px] opacity-90">
              Slot reservation requires mandatory advance payment via <strong>UPI QR Code</strong> to prevent fake bookings and confirm doctor availability.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="hidden sm:inline-flex bg-white dark:bg-slate-900 border-amber-400 font-bold shrink-0">
          UPI Only
        </Badge>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* LEFT COLUMN: SELECTIONS & UPI QR PAYMENT */}
        <div className="md:col-span-2 space-y-6">
          {/* STEP 1: SELECT DOCTOR */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 text-xs flex items-center justify-center font-bold">
                  1
                </span>
                Choose Specialist Doctor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {doctors.map((doctor) => {
                  const isSelected = doctor.id === selectedDoctorId;
                  return (
                    <div
                      key={doctor.id}
                      onClick={() => setSelectedDoctorId(doctor.id)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? "border-teal-600 bg-teal-50/50 dark:border-teal-500 dark:bg-teal-950/30 ring-2 ring-teal-500/20"
                          : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-teal-700 dark:text-teal-300 font-bold shrink-0 overflow-hidden">
                        {doctor.profilePhotoUrl ? (
                          <img
                            src={doctor.profilePhotoUrl}
                            alt={doctor.user.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          doctor.user.fullName.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {doctor.user.fullName}
                        </p>
                        <p className="text-xs text-teal-600 dark:text-teal-400 font-medium truncate">
                          {doctor.specialization}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                          <span>₹{doctor.consultationFee}</span>
                          <span>•</span>
                          <span>{doctor.appointmentDurationMinutes}m slot</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Service Selection if available */}
              {services.length > 0 && (
                <div className="pt-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">
                    Optional: Select Specialized Clinical Service
                  </label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="">Standard Doctor Consultation (₹{selectedDoctor?.consultationFee || 500})</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — ₹{s.fee} ({s.durationMinutes} mins)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* STEP 2: SELECT DATE & TIME SLOT */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 text-xs flex items-center justify-center font-bold">
                  2
                </span>
                Consultation Date & Slot Availability
              </CardTitle>
              <CardDescription>
                Live schedule engine calculated directly from PostgreSQL doctor timings and bookings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="w-full sm:w-auto flex-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                    Appointment Date
                  </label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="w-full text-sm font-semibold"
                  />
                </div>
              </div>

              {/* SLOTS DISPLAY / FULLY BOOKED BANNER */}
              {loadingSlots ? (
                <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
                  Calculating doctor slot availability...
                </div>
              ) : slotData ? (
                <div className="space-y-3">
                  {/* FULLY BOOKED OR UNAVAILABLE BANNER */}
                  {(!slotData.available || slotData.isFullyBooked || slotData.slots.filter((s) => s.isAvailable).length === 0) && (
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2">
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold text-sm">
                        <span>⚠️</span>
                        <span>
                          {slotData.isFullyBooked
                            ? "FULLY BOOKED"
                            : slotData.unavailabilityReason || "No consultation slots available for this date."}
                        </span>
                      </div>

                      {slotData.maxDailyAppointments && slotData.currentBookedCount !== undefined && (
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          Capacity: {slotData.currentBookedCount}/{slotData.maxDailyAppointments} bookings filled.
                        </p>
                      )}

                      {/* NEXT AVAILABLE DATE FEATURE */}
                      {slotData.nextAvailableDate && (
                        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-amber-200/60 dark:border-amber-800/60">
                          <p className="text-xs text-amber-900 dark:text-amber-100 font-semibold">
                            Next Available Date: <span className="underline">{slotData.nextAvailableDate}</span>
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedDate(slotData.nextAvailableDate!)}
                            className="bg-amber-200 text-amber-900 hover:bg-amber-300 dark:bg-amber-900 dark:text-amber-100 dark:hover:bg-amber-800 text-xs font-bold"
                          >
                            Switch to {slotData.nextAvailableDate} →
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SLOTS GRID */}
                  {slotData.slots.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>Select a convenient time slot:</span>
                        <span>
                          {slotData.slots.filter((s) => s.isAvailable).length} available
                        </span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-56 overflow-y-auto p-1">
                        {slotData.slots.map((slot) => {
                          const isSelected = selectedTime === slot.startTime;

                          if (!slot.isAvailable) {
                            return (
                              <button
                                key={slot.startTime}
                                type="button"
                                disabled
                                className="px-2 py-2 rounded-xl text-xs font-medium border border-dashed border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/50 text-slate-400 cursor-not-allowed text-center truncate"
                                title={slot.reason || slot.status}
                              >
                                {slot.startTime}
                                <span className="block text-[9px] uppercase tracking-tighter opacity-70">
                                  {slot.status === "BREAK" ? "Break" : slot.status === "BOOKED" ? "Full" : "Blocked"}
                                </span>
                              </button>
                            );
                          }

                          return (
                            <button
                              key={slot.startTime}
                              type="button"
                              onClick={() => setSelectedTime(slot.startTime)}
                              className={`px-2 py-2 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                                isSelected
                                  ? "bg-teal-600 text-white border-teal-600 shadow-sm ring-2 ring-teal-500/20"
                                  : "border-slate-300 hover:border-teal-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                              }`}
                            >
                              {slot.startTime}
                              <span className="block text-[9px] uppercase tracking-tighter text-teal-600 dark:text-teal-400 font-semibold">
                                {slot.endTime}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* STEP 3: APPOINTMENT TYPE & SYMPTOMS */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 text-xs flex items-center justify-center font-bold">
                  3
                </span>
                Consultation Type & Health Symptoms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">
                  Appointment Mode
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { type: AppointmentType.IN_PERSON, label: "In-Person Clinic", icon: "🏥" },
                    { type: AppointmentType.VIDEO_CONSULTATION, label: "Video Call", icon: "📹" },
                    { type: AppointmentType.FOLLOW_UP, label: "Follow-Up", icon: "🔄" },
                    { type: AppointmentType.EMERGENCY, label: "Emergency Walk-in", icon: "⚡" },
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setAppointmentType(item.type)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition cursor-pointer ${
                        appointmentType === item.type
                          ? "border-teal-600 bg-teal-50/50 dark:border-teal-500 dark:bg-teal-950/30 text-teal-900 dark:text-teal-100"
                          : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                      }`}
                    >
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                  Primary Symptoms / Health Concerns
                </label>
                <textarea
                  rows={2}
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g. Fever, digestive issues, joint pain, migraine (optional)..."
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                  Additional Notes or Requests
                </label>
                <Input
                  value={patientNotes}
                  onChange={(e) => setPatientNotes(e.target.value)}
                  placeholder="e.g. Need medical leave certificate, wheelchair assistance (optional)..."
                  className="text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* STEP 4: MANDATORY UPI & QR CODE PAYMENT (NO COD) */}
          <Card className="border-teal-500/30 bg-linear-to-b from-teal-50/30 via-white to-transparent dark:from-teal-950/30 dark:via-slate-900 shadow-md">
            <CardHeader className="pb-3 border-b border-teal-100 dark:border-teal-900/40">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center font-bold">
                    4
                  </span>
                  Pay Advance Deposit via UPI QR Code
                </CardTitle>
                <Badge variant="emerald" className="text-[11px] font-bold">
                  ⚡ Instant Slot Lock
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Scan the official clinic QR code below or transfer to the UPI ID. Cash on Delivery (COD) is disabled to avoid fake bookings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              {/* QR CODE & PAYEE INFO CONTAINER */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-6 shadow-xs">
                {/* QR CODE IMAGE */}
                <div className="relative group shrink-0">
                  <div className="w-48 h-56 p-2 rounded-2xl bg-white border-2 border-teal-500/40 shadow-sm flex flex-col items-center justify-center">
                    <img
                      src={UPI_QR_IMAGE}
                      alt={`UPI QR Code - ${UPI_PAYEE_NAME}`}
                      className="w-full h-auto object-contain rounded-xl"
                    />
                    <p className="text-[10px] font-bold text-slate-700 mt-1">Scan with any UPI App</p>
                  </div>
                </div>

                {/* PAYEE DETAILS & ACTIONS */}
                <div className="space-y-3.5 flex-1 w-full text-center sm:text-left">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                      Verified Payee Name
                    </span>
                    <p className="text-base font-extrabold text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-1.5 mt-0.5">
                      <span>{UPI_PAYEE_NAME}</span>
                      <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                      UPI ID
                    </span>
                    <div className="mt-1 flex items-center justify-center sm:justify-start gap-2">
                      <code className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-xs sm:text-sm font-bold text-teal-700 dark:text-teal-300 border border-slate-200 dark:border-slate-700">
                        {UPI_ID}
                      </code>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleCopyUpi}
                        className="h-8 text-xs font-semibold gap-1.5"
                      >
                        {copiedUpi ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="pt-1">
                    <div className="inline-block px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-xs">
                      <span className="text-slate-600 dark:text-slate-400">Advance Amount to Pay: </span>
                      <strong className="text-teal-700 dark:text-teal-300 font-extrabold text-sm">
                        ₹{advanceAmount.toFixed(0)}
                      </strong>
                    </div>
                  </div>

                  {/* MOBILE QUICK INTENT BUTTON */}
                  <div className="pt-1 block sm:hidden">
                    <a
                      href={upiIntentUrl}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs shadow-md active:scale-98 transition"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Open UPI App (GPay / PhonePe / Paytm)</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* UTR / TRANSACTION ID INPUT */}
              <div className="space-y-3 p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/50">
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
                    <span>UPI Reference / UTR Number (12 Digits) *</span>
                    <span className="text-[10px] text-teal-700 dark:text-teal-300 font-normal">
                      Required for instant slot confirmation
                    </span>
                  </label>
                  <Input
                    required
                    value={upiTransactionId}
                    onChange={(e) => setUpiTransactionId(e.target.value)}
                    placeholder="Enter 12-digit UTR (e.g. 428912345678)"
                    className="font-mono text-sm bg-white dark:bg-slate-900 border-teal-300 dark:border-teal-800"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    💡 <em>Tip:</em> After completing the payment in GPay, PhonePe, or Paytm, open transaction history to copy the 12-digit UTR/UPI Ref ID.
                  </p>
                </div>

                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="upiConfirmation"
                    checked={upiPaidConfirmed}
                    onChange={(e) => setUpiPaidConfirmed(e.target.checked)}
                    className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <label
                    htmlFor="upiConfirmation"
                    className="text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                  >
                    I confirm that I have transferred ₹{advanceAmount.toFixed(0)} to{" "}
                    <strong>{UPI_PAYEE_NAME}</strong> ({UPI_ID}) via UPI.
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: PATIENT INFO & TRANSPARENT FEE BREAKDOWN */}
        <div className="space-y-6">
          {/* PATIENT CONTACT */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 text-xs flex items-center justify-center font-bold">
                  5
                </span>
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                  Full Name *
                </label>
                <Input
                  required
                  placeholder="Patient Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                  Email Address *
                </label>
                <Input
                  required
                  type="email"
                  placeholder="patient@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                  Phone / WhatsApp
                </label>
                <Input
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* FEE BREAKDOWN CARD */}
          <Card className="border-teal-500/20 bg-linear-to-b from-teal-50/30 to-transparent dark:from-teal-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                Fee & Payment Summary
              </CardTitle>
              <CardDescription className="text-xs">
                Transparent consultation billing details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Consultation Fee</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  ₹{consultationFee.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-teal-700 dark:text-teal-400 font-bold">
                  Advance Payable via UPI
                </span>
                <span className="font-bold text-teal-700 dark:text-teal-400 text-sm">
                  ₹{advanceAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-1 font-bold text-slate-900 dark:text-white">
                <span>Remaining at Clinic</span>
                <span className="text-slate-700 dark:text-slate-300">
                  ₹{balanceAmount.toFixed(2)}
                </span>
              </div>

              {selectedTime && (
                <div className="p-2.5 rounded-xl bg-teal-100/60 dark:bg-teal-900/40 text-[11px] text-teal-900 dark:text-teal-100 space-y-0.5">
                  <p className="font-bold">✓ Selected Appointment:</p>
                  <p>
                    {selectedDate} at {selectedTime}
                  </p>
                  <p className="text-[10px] opacity-80">With {selectedDoctor?.user.fullName}</p>
                </div>
              )}

              {/* COD NOT ALLOWED CALLOUT */}
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Ban className="w-3.5 h-3.5 text-amber-600" />
                  <span>No Cash on Delivery (COD)</span>
                </div>
                <p className="text-[10px] leading-tight opacity-90">
                  Slot will only be locked after submitting the valid UPI UTR reference number above.
                </p>
              </div>

              <Button
                type="submit"
                disabled={
                  submitting ||
                  !selectedTime ||
                  !fullName ||
                  !email ||
                  !upiTransactionId.trim() ||
                  !upiPaidConfirmed
                }
                className="w-full mt-2 font-bold shadow-md cursor-pointer bg-teal-600 hover:bg-teal-700 text-white"
              >
                {submitting
                  ? "Verifying UPI & Reserving..."
                  : `Confirm Booking (Paid ₹${advanceAmount.toFixed(0)} via UPI)`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
