import React from "react";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getPatientProfile } from "@/lib/services/patient.service";
import { PatientProfileForm } from "@/components/patient/patient-profile-form";
import Link from "next/link";

export default async function PatientProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const patientData = await getPatientProfile(session.userId);

  const serializedData = {
    id: patientData.id,
    fullName: patientData.fullName,
    email: patientData.email,
    phone: patientData.phone,
    profile: patientData.patientProfile
      ? {
          id: patientData.patientProfile.id,
          dateOfBirth: patientData.patientProfile.dateOfBirth?.toISOString() || null,
          gender: patientData.patientProfile.gender,
          bloodGroup: patientData.patientProfile.bloodGroup,
          address: patientData.patientProfile.address,
          city: patientData.patientProfile.city,
          state: patientData.patientProfile.state,
          postalCode: patientData.patientProfile.postalCode,
          emergencyContactName: patientData.patientProfile.emergencyContactName,
          emergencyContactPhone: patientData.patientProfile.emergencyContactPhone,
          medicalNotes: patientData.patientProfile.medicalNotes,
        }
      : null,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            My Medical & Personal Profile
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage your personal data, clinical notes, and emergency contact details for physician consultations.
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
            href="/dashboard/patient/payments"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Payment History →
          </Link>
        </div>
      </div>

      <PatientProfileForm initialData={serializedData} />
    </div>
  );
}
