/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DoctorScheduleManager } from "@/components/doctor/doctor-schedule-manager";
import { MediaPickerModal } from "@/components/cms/media-picker-modal";
import { AdminDashboardDoctor } from "@/components/cms/admin-dashboard-view";

export interface PrescriptionItem {
  id?: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface DoctorAppointmentItem {
  id: string;
  appointmentNumber: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  status: string;
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
    user: {
      fullName: string;
      phone?: string | null;
    };
  };
  patientProfile?: {
    id?: string;
    gender?: string | null;
    dateOfBirth?: string | null;
    bloodGroup?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    medicalNotes?: string | null;
    user: {
      fullName: string;
      email: string;
      phone?: string | null;
    };
  } | null;
  service?: {
    name: string;
  } | null;
}

interface DoctorWorkspaceViewProps {
  doctor: AdminDashboardDoctor;
  appointments?: DoctorAppointmentItem[];
}

export function DoctorWorkspaceView({ doctor: initialDoctor, appointments: initialAppointments = [] }: DoctorWorkspaceViewProps) {
  const [doctor, setDoctor] = useState(initialDoctor);
  const [appointments, setAppointments] = useState<DoctorAppointmentItem[]>(initialAppointments);
  const [activeTab, setActiveTab] = useState<"consultations" | "profile" | "schedule">("consultations");

  // Sub-filter for doctor's consultations
  const [opdFilter, setOpdFilter] = useState<"TODAY" | "WAITING" | "IN_CONSULTATION" | "COMPLETED" | "ALL">("TODAY");
  const [searchQuery, setSearchQuery] = useState("");

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Profile edit states
  const [fullName, setFullName] = useState(doctor.user?.fullName || "");
  const [phone, setPhone] = useState(doctor.user?.phone || "");
  const [specialization, setSpecialization] = useState(doctor.specialization || "");
  const [qualification, setQualification] = useState(doctor.qualification || "");
  const [experienceYears, setExperienceYears] = useState(String(doctor.experienceYears || 0));
  const [registrationNumber, setRegistrationNumber] = useState(doctor.registrationNumber || "");
  const [languages, setLanguages] = useState(doctor.languages || "");
  const [consultationFee, setConsultationFee] = useState(String(doctor.consultationFee || 500));
  const [advanceBookingFee, setAdvanceBookingFee] = useState(String(doctor.advanceBookingFee || 100));
  const [appointmentDuration, setAppointmentDuration] = useState(String(doctor.appointmentDurationMinutes || 15));
  const [roomNumber, setRoomNumber] = useState(doctor.roomNumber || "");
  const [clinicLocation, setClinicLocation] = useState(doctor.clinicLocation || "");
  const [bio, setBio] = useState(doctor.bio || "");
  const [photoUrl, setPhotoUrl] = useState(doctor.profilePhotoUrl || "");

  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Clinical Consultation Modal State
  const [consultingAppt, setConsultingAppt] = useState<DoctorAppointmentItem | null>(null);
  const [consultationNotes, setConsultationNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [lifestyleAdvice, setLifestyleAdvice] = useState("");
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [submittingConsultation, setSubmittingConsultation] = useState(false);

  // Patient History Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [patientHistoryData, setPatientHistoryData] = useState<{
    patient: {
      fullName: string;
      phone?: string | null;
      email: string;
      bloodGroup?: string | null;
      gender?: string | null;
      dateOfBirth?: string | null;
      medicalNotes?: string | null;
    };
    history: Array<{
      id: string;
      appointmentNumber: string;
      date: string;
      time: string;
      status: string;
      service: string;
      symptoms?: string | null;
      doctorNotes?: string | null;
      followUpDate?: string | null;
      prescription?: PrescriptionItem[];
      lifestyleAdvice?: string | null;
    }>;
  } | null>(null);

  // Parse existing notes when opening consultation modal
  const openConsultationModal = (appt: DoctorAppointmentItem) => {
    setConsultingAppt(appt);
    let initialNotes = "";
    let initialFollowUp = "";
    let initialAdvice = "";
    let initialRx: PrescriptionItem[] = [];

    if (appt.doctorNotes) {
      try {
        const parsed = JSON.parse(appt.doctorNotes);
        if (typeof parsed === "object" && parsed !== null) {
          initialNotes = parsed.notes || "";
          initialFollowUp = parsed.followUpDate || "";
          initialAdvice = parsed.lifestyleAdvice || "";
          initialRx = Array.isArray(parsed.prescription) ? parsed.prescription : [];
        } else {
          initialNotes = String(appt.doctorNotes);
        }
      } catch {
        initialNotes = appt.doctorNotes;
      }
    }

    setConsultationNotes(initialNotes);
    setFollowUpDate(initialFollowUp);
    setLifestyleAdvice(initialAdvice);
    setPrescriptions(
      initialRx.length > 0
        ? initialRx
        : [{ name: "", dosage: "", frequency: "Twice daily after food", duration: "7 days", instructions: "" }]
    );
  };

  // Add medicine row to prescription
  const addPrescriptionItem = () => {
    setPrescriptions((prev) => [
      ...prev,
      { name: "", dosage: "", frequency: "Twice daily after meals", duration: "7 days", instructions: "" },
    ]);
  };

  const removePrescriptionItem = (index: number) => {
    setPrescriptions((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePrescriptionItem = (index: number, field: keyof PrescriptionItem, value: string) => {
    setPrescriptions((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  // Submit Doctor Consultation
  const handleSaveConsultation = async (targetStatus: "IN_CONSULTATION" | "COMPLETED") => {
    if (!consultingAppt) return;
    setSubmittingConsultation(true);
    setMessage(null);

    const validRx = prescriptions.filter((p) => p.name.trim() !== "");

    try {
      const res = await fetch("/api/doctor/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: consultingAppt.id,
          status: targetStatus,
          consultationNotes,
          followUpDate: followUpDate || null,
          prescription: validRx,
          lifestyleAdvice,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to save consultation notes.");
      }

      // Update local state
      const updatedNotes = JSON.stringify({
        notes: consultationNotes,
        followUpDate: followUpDate || null,
        prescription: validRx,
        lifestyleAdvice,
      });

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === consultingAppt.id ? { ...a, status: targetStatus, doctorNotes: updatedNotes } : a
        )
      );

      setMessage({
        type: "success",
        text: `Consultation saved successfully as ${targetStatus === "COMPLETED" ? "Completed" : "In Consultation"}.`,
      });
      setConsultingAppt(null);
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: "error", text: e.message });
    } finally {
      setSubmittingConsultation(false);
    }
  };

  // Fetch patient medical history
  const handleViewPatientHistory = async (appt: DoctorAppointmentItem) => {
    if (!appt.patientProfile?.id) {
      setMessage({ type: "error", text: "No patient profile associated with this appointment." });
      return;
    }

    setHistoryLoading(true);
    setHistoryModalOpen(true);
    setPatientHistoryData(null);

    try {
      const res = await fetch(`/api/doctor/patients/${appt.patientProfile.id}/history`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to load patient history.");
      }
      setPatientHistoryData(data.data);
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: "error", text: e.message });
      setHistoryModalOpen(false);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Quick preset follow-up dates
  const setPresetFollowUp = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setFollowUpDate(d.toISOString().slice(0, 10));
  };

  // Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/cms/doctors/${doctor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone,
          specialization,
          qualification,
          experienceYears: Number(experienceYears),
          registrationNumber,
          languages,
          consultationFee: Number(consultationFee),
          advanceBookingFee: Number(advanceBookingFee),
          appointmentDurationMinutes: Number(appointmentDuration),
          roomNumber,
          clinicLocation,
          bio,
          profilePhotoUrl: photoUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: "error", text: data.error?.message || "Failed to update profile." });
      } else {
        setDoctor(data.data);
        setMessage({ type: "success", text: "Doctor profile updated successfully!" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error while saving." });
    } finally {
      setSaving(false);
    }
  };

  // Counters
  const opdCounts = useMemo(() => {
    return {
      TODAY: appointments.filter((a) => a.appointmentDate === todayStr).length,
      WAITING: appointments.filter((a) => a.status === "CHECKED_IN").length,
      IN_CONSULTATION: appointments.filter((a) => a.status === "IN_CONSULTATION").length,
      COMPLETED: appointments.filter((a) => a.appointmentDate === todayStr && a.status === "COMPLETED").length,
      ALL: appointments.length,
    };
  }, [appointments, todayStr]);

  // Filtered list
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      // 1. OPD filter
      if (opdFilter === "TODAY" && appt.appointmentDate !== todayStr) return false;
      if (opdFilter === "WAITING" && appt.status !== "CHECKED_IN") return false;
      if (opdFilter === "IN_CONSULTATION" && appt.status !== "IN_CONSULTATION") return false;
      if (opdFilter === "COMPLETED" && (appt.status !== "COMPLETED" || appt.appointmentDate !== todayStr)) return false;

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pName = (appt.patientProfile?.user?.fullName || "").toLowerCase();
        const phone = (appt.patientProfile?.user?.phone || "").toLowerCase();
        const ref = appt.appointmentNumber.toLowerCase();
        const sym = (appt.symptoms || "").toLowerCase();
        if (!pName.includes(q) && !phone.includes(q) && !ref.includes(q) && !sym.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [appointments, opdFilter, searchQuery, todayStr]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CHECKED_IN":
        return <Badge variant="blue">Arrived / Waiting</Badge>;
      case "IN_CONSULTATION":
        return <Badge variant="amber">In Cabin</Badge>;
      case "COMPLETED":
        return <Badge variant="emerald">Completed</Badge>;
      case "CONFIRMED":
        return <Badge variant="teal">Confirmed</Badge>;
      case "CANCELLED":
        return <Badge variant="rose">Cancelled</Badge>;
      case "NO_SHOW":
        return <Badge variant="slate">No-Show</Badge>;
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-teal-500 bg-slate-100 flex items-center justify-center shrink-0">
            {photoUrl ? (
              <img src={photoUrl} alt={fullName} className="h-full w-full object-cover" />
            ) : (
              <span className="font-bold text-lg text-slate-600">Dr</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Dr. {fullName}
              </h1>
              <Badge variant={doctor.isActive ? "teal" : "slate"}>
                {doctor.isActive ? "Active Clinical Practitioner" : "Inactive"}
              </Badge>
              {doctor.roomNumber && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold border border-teal-200 dark:border-teal-800">
                  Cabin: {doctor.roomNumber}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {specialization} • {qualification} • {doctor.clinic?.name || "Doctor Plus"}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("consultations")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              activeTab === "consultations"
                ? "bg-teal-600 text-white shadow-xs"
                : "border border-slate-300 hover:bg-slate-50 dark:border-slate-700"
            }`}
          >
            🩺 Clinical Consultations ({opdCounts.TODAY} Today)
          </button>
          <button
            onClick={() => setActiveTab("schedule")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              activeTab === "schedule"
                ? "bg-teal-600 text-white shadow-xs"
                : "border border-slate-300 hover:bg-slate-50 dark:border-slate-700"
            }`}
          >
            📅 Working Schedule & Leaves
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              activeTab === "profile"
                ? "bg-teal-600 text-white shadow-xs"
                : "border border-slate-300 hover:bg-slate-50 dark:border-slate-700"
            }`}
          >
            👤 Profile & Fees
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="underline ml-2 cursor-pointer font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: CLINICAL CONSULTATIONS (DOCTOR WORKSPACE) */}
      {activeTab === "consultations" && (
        <div className="space-y-6">
          {/* OPD QUICK TABS */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800 scrollbar-none">
            {[
              { key: "TODAY", label: "Today's OPD", count: opdCounts.TODAY, icon: "📅" },
              { key: "WAITING", label: "Waiting in Lobby", count: opdCounts.WAITING, icon: "⏳" },
              { key: "IN_CONSULTATION", label: "In Consultation", count: opdCounts.IN_CONSULTATION, icon: "🩺" },
              { key: "COMPLETED", label: "Completed Today", count: opdCounts.COMPLETED, icon: "✅" },
              { key: "ALL", label: "All Appointments", count: opdCounts.ALL, icon: "📂" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setOpdFilter(tab.key as typeof opdFilter)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition cursor-pointer ${
                  opdFilter === tab.key
                    ? "bg-teal-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                    opdFilter === tab.key
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* SEARCH BAR */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Input
                placeholder="Search patient name, phone, symptoms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="text-xs text-slate-500">
              Showing <strong>{filteredAppointments.length}</strong> patient consultations
            </div>
          </div>

          {/* APPOINTMENT QUEUE */}
          <div className="space-y-3">
            {filteredAppointments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-500 text-xs">
                  No patient consultations found for the selected view.
                </CardContent>
              </Card>
            ) : (
              filteredAppointments.map((appt) => {
                const profile = appt.patientProfile;
                return (
                  <Card
                    key={appt.id}
                    className={`transition border ${
                      appt.status === "IN_CONSULTATION"
                        ? "border-amber-500/50 bg-amber-50/15 dark:bg-amber-950/20 shadow-xs"
                        : appt.status === "CHECKED_IN"
                        ? "border-blue-500/40 bg-blue-50/10 dark:bg-blue-950/10"
                        : appt.status === "COMPLETED"
                        ? "border-emerald-500/30 opacity-90"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        {/* PATIENT DETAILS ALLOWED BY ROLE */}
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">
                              {appt.appointmentNumber}
                            </span>
                            {getStatusBadge(appt.status)}
                            <span className="text-xs text-slate-500 font-medium">
                              📅 {appt.appointmentDate} at <strong>{appt.appointmentTime}</strong>
                            </span>
                            {appt.service && (
                              <span className="text-xs text-teal-600 dark:text-teal-400 font-semibold">
                                • {appt.service.name}
                              </span>
                            )}
                          </div>

                          {/* Patient Identification */}
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <h4 className="text-base font-bold text-slate-900 dark:text-white">
                              {profile?.user?.fullName || "Patient"}
                            </h4>
                            <span className="text-xs text-slate-500">
                              {profile?.user?.phone || profile?.user?.email}
                            </span>
                            {profile?.gender && (
                              <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                                {profile.gender}
                              </span>
                            )}
                            {profile?.bloodGroup && (
                              <span className="text-[11px] px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-900">
                                🩸 {profile.bloodGroup}
                              </span>
                            )}
                            {profile?.emergencyContactPhone && (
                              <span className="text-[11px] text-slate-400">
                                Emergency: {profile.emergencyContactName ? `${profile.emergencyContactName} ` : ""}
                                ({profile.emergencyContactPhone})
                              </span>
                            )}
                          </div>

                          {/* Chief Complaints & Symptoms */}
                          {appt.symptoms && (
                            <div className="text-xs bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                                Reported Symptoms & Chief Complaint:
                              </span>
                              <p className="text-slate-600 dark:text-slate-400 italic">{appt.symptoms}</p>
                            </div>
                          )}

                          {/* Medical Notes / Allergies (Doctor Role Privilege) */}
                          {profile?.medicalNotes && (
                            <div className="text-xs bg-amber-50/70 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/50">
                              <span className="font-bold text-amber-900 dark:text-amber-200 block mb-0.5">
                                ⚠️ Patient Medical History & Allergies:
                              </span>
                              <p className="text-amber-800 dark:text-amber-300">{profile.medicalNotes}</p>
                            </div>
                          )}

                          {/* Existing Doctor Consultation Notes */}
                          {appt.doctorNotes && (
                            <div className="text-xs bg-teal-50/50 dark:bg-teal-950/30 p-2.5 rounded-xl border border-teal-200 dark:border-teal-900/60">
                              <span className="font-bold text-teal-900 dark:text-teal-200 block mb-0.5">
                                Recorded Clinical Notes:
                              </span>
                              <p className="text-teal-800 dark:text-teal-300">
                                {(() => {
                                  try {
                                    const p = JSON.parse(appt.doctorNotes);
                                    return p.notes || appt.doctorNotes;
                                  } catch {
                                    return appt.doctorNotes;
                                  }
                                })()}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* DOCTOR ACTION BUTTONS */}
                        <div className="flex flex-row md:flex-col items-end gap-2 shrink-0 pt-2 md:pt-0">
                          <Button
                            size="sm"
                            onClick={() => openConsultationModal(appt)}
                            className="text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs cursor-pointer"
                          >
                            🩺 {appt.status === "COMPLETED" ? "Review / Edit Consultation" : "Start Consultation"}
                          </Button>

                          <button
                            type="button"
                            onClick={() => handleViewPatientHistory(appt)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                          >
                            📜 Patient History
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PROFILE & FEES */}
      {activeTab === "profile" && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Professional & Personal Details</CardTitle>
              <CardDescription className="text-xs">
                Visible to patients on the website and appointment booking receipts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                <Input
                  label="Contact Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Input
                  label="Medical Council Registration No."
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="e.g. AYUSH-REG-10492"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Specialization"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Panchakarma & Chronic Disorders"
                  required
                />
                <Input
                  label="Qualifications"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  placeholder="e.g. BAMS, MD (Ayurveda)"
                  required
                />
                <Input
                  label="Clinical Experience (Years)"
                  type="number"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Languages Spoken"
                  value={languages}
                  onChange={(e) => setLanguages(e.target.value)}
                  placeholder="e.g. English, Hindi, Kannada"
                />
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Profile Photo URL
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      placeholder="/doctors/photo.jpg or URL"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => setMediaPickerOpen(true)}>
                      Pick
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Doctor Clinical Bio & Summary
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-teal-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800"
                  placeholder="Tell patients about your clinical philosophy, specialty expertise, and care methodology..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Consultation Fees & Clinic Location</CardTitle>
              <CardDescription className="text-xs">
                Set consultation rates, advance deposits, and appointment slot lengths.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Input
                  label="Consultation Fee (₹)"
                  type="number"
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                  required
                />
                <Input
                  label="Advance Fee (₹)"
                  type="number"
                  value={advanceBookingFee}
                  onChange={(e) => setAdvanceBookingFee(e.target.value)}
                  required
                />
                <Input
                  label="Duration (Mins)"
                  type="number"
                  value={appointmentDuration}
                  onChange={(e) => setAppointmentDuration(e.target.value)}
                  required
                />
                <Input
                  label="Room Number"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="e.g. Room 102"
                />
                <Input
                  label="Clinic Location"
                  value={clinicLocation}
                  onChange={(e) => setClinicLocation(e.target.value)}
                  placeholder="e.g. Main Clinic Block"
                />
              </div>

              <Button type="submit" isLoading={saving}>
                Save Doctor Profile
              </Button>
            </CardContent>
          </Card>
        </form>
      )}

      {/* TAB 3: SCHEDULE & LEAVES */}
      {activeTab === "schedule" && (
        <DoctorScheduleManager
          doctorId={doctor.id}
          doctorName={fullName}
          initialSchedules={doctor.schedules || []}
          initialLeaves={doctor.leaves || []}
          initialBlockedSlots={doctor.blockedSlots || []}
        />
      )}

      {/* CLINICAL CONSULTATION & PRESCRIPTION MODAL (DOCTOR REQUIREMENT) */}
      {consultingAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div>
                <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">
                  {consultingAppt.appointmentNumber}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Clinical Consultation: {consultingAppt.patientProfile?.user?.fullName}
                </h3>
                <p className="text-xs text-slate-500">
                  Date: {consultingAppt.appointmentDate} at {consultingAppt.appointmentTime} •{" "}
                  {consultingAppt.service?.name || "Ayurvedic Consultation"}
                </p>
              </div>
              <button
                onClick={() => setConsultingAppt(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Patient Clinical Demographics (Doctor Privileged Info) */}
            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Gender & Age</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {consultingAppt.patientProfile?.gender || "Not specified"} •{" "}
                  {consultingAppt.patientProfile?.dateOfBirth ? `DOB: ${consultingAppt.patientProfile.dateOfBirth}` : "Age: Adult"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Blood Group</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {consultingAppt.patientProfile?.bloodGroup || "Not recorded"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Contact</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {consultingAppt.patientProfile?.user?.phone || consultingAppt.patientProfile?.user?.email}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Emergency Contact</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {consultingAppt.patientProfile?.emergencyContactPhone || "None"}
                </span>
              </div>
            </div>

            {consultingAppt.patientProfile?.medicalNotes && (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-xs">
                <span className="font-bold text-amber-800 dark:text-amber-300">Allergies & Medical History: </span>
                <span className="text-amber-700 dark:text-amber-200">{consultingAppt.patientProfile.medicalNotes}</span>
              </div>
            )}

            {/* Symptoms */}
            {consultingAppt.symptoms && (
              <div className="p-2.5 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">Chief Complaints (Patient): </span>
                <span className="text-slate-600 dark:text-slate-400 italic">{consultingAppt.symptoms}</span>
              </div>
            )}

            {/* Section 1: Clinical / Consultation Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Doctor Consultation Notes & Clinical Findings *
              </label>
              <textarea
                rows={3}
                placeholder="Nadi pariksha, Prakriti/Vikriti assessment, clinical examination, diagnosis and observations..."
                value={consultationNotes}
                onChange={(e) => setConsultationNotes(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-slate-900 dark:text-white focus:border-teal-500 focus:outline-none"
              />
            </div>

            {/* Section 2: Follow-up Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Next Follow-Up Date
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="text-xs w-48"
                />
                <button
                  type="button"
                  onClick={() => setPresetFollowUp(7)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  +7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setPresetFollowUp(14)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  +14 Days
                </button>
                <button
                  type="button"
                  onClick={() => setPresetFollowUp(30)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  +30 Days
                </button>
                {followUpDate && (
                  <button
                    type="button"
                    onClick={() => setFollowUpDate("")}
                    className="text-xs text-rose-500 hover:underline cursor-pointer ml-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Section 3: Prescription / Ayurvedic Formulations & Treatment Regimen */}
            <div className="space-y-2 border-t pt-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Prescription / Medications / Classical Formulations
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Add herbs, classical formulations, dosage, and administration timings.
                  </p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addPrescriptionItem} className="text-xs">
                  + Add Medicine
                </Button>
              </div>

              <div className="space-y-2">
                {prescriptions.map((rx, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-5 gap-2 items-center"
                  >
                    <div className="sm:col-span-2">
                      <Input
                        placeholder="Medicine Name (e.g. Ashwagandha Churna)"
                        value={rx.name}
                        onChange={(e) => updatePrescriptionItem(idx, "name", e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        placeholder="Dosage (e.g. 2 tabs / 5g)"
                        value={rx.dosage}
                        onChange={(e) => updatePrescriptionItem(idx, "dosage", e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        placeholder="Frequency (e.g. Twice daily)"
                        value={rx.frequency}
                        onChange={(e) => updatePrescriptionItem(idx, "frequency", e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Input
                        placeholder="Duration (14d)"
                        value={rx.duration}
                        onChange={(e) => updatePrescriptionItem(idx, "duration", e.target.value)}
                        className="text-xs w-full"
                      />
                      <button
                        type="button"
                        onClick={() => removePrescriptionItem(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1.5 text-xs font-bold cursor-pointer"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 4: Dietary & Lifestyle Recommendations (Pathya / Apathya) */}
            <div className="space-y-1.5 border-t pt-3 border-slate-200 dark:border-slate-800">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Dietary & Lifestyle Advice (Pathya / Apathya & Regimen)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Avoid curd and fried items, take warm water, gentle morning walks..."
                value={lifestyleAdvice}
                onChange={(e) => setLifestyleAdvice(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setConsultingAppt(null)}>
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={submittingConsultation}
                  onClick={() => handleSaveConsultation("IN_CONSULTATION")}
                  className="text-xs border-amber-500 text-amber-700 dark:text-amber-400 hover:bg-amber-50"
                >
                  Save (Keep In Consultation)
                </Button>
                <Button
                  size="sm"
                  disabled={submittingConsultation}
                  onClick={() => handleSaveConsultation("COMPLETED")}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Save & Complete Consultation
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PATIENT APPOINTMENT HISTORY MODAL (DOCTOR REQUIREMENT) */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Patient Medical History & Prior Visits
                </h3>
                {patientHistoryData && (
                  <p className="text-xs text-slate-500">
                    {patientHistoryData.patient.fullName} • Phone: {patientHistoryData.patient.phone || "N/A"}
                  </p>
                )}
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {historyLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Loading patient clinical records...
              </div>
            ) : patientHistoryData && patientHistoryData.history.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No prior appointment records found for this patient.
              </div>
            ) : patientHistoryData ? (
              <div className="space-y-3">
                {patientHistoryData.history.map((record) => (
                  <div
                    key={record.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-teal-600">{record.appointmentNumber}</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {record.date} at {record.time}
                      </span>
                      <Badge variant={record.status === "COMPLETED" ? "emerald" : "slate"}>
                        {record.status}
                      </Badge>
                    </div>

                    <div className="text-slate-600 dark:text-slate-400">
                      <strong>Service:</strong> {record.service}
                    </div>

                    {record.symptoms && (
                      <div className="text-slate-500 italic">
                        <strong>Symptoms:</strong> {record.symptoms}
                      </div>
                    )}

                    {record.doctorNotes && (
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                        <strong className="text-teal-700 dark:text-teal-300">Clinical Notes:</strong>{" "}
                        {record.doctorNotes}
                      </div>
                    )}

                    {record.followUpDate && (
                      <div className="text-teal-600 font-semibold">
                        <strong>Follow-up Scheduled:</strong> {record.followUpDate}
                      </div>
                    )}

                    {record.prescription && record.prescription.length > 0 && (
                      <div className="space-y-1">
                        <strong className="text-slate-700 dark:text-slate-300">Prescribed Formulations:</strong>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400 pl-1">
                          {record.prescription.map((rx, i) => (
                            <li key={i}>
                              <strong>{rx.name}</strong> - {rx.dosage} ({rx.frequency}) for {rx.duration}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setHistoryModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(url) => setPhotoUrl(url)}
        title="Select Doctor Photo"
      />
    </div>
  );
}
