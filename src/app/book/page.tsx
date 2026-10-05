import React from "react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { AppointmentBookingView } from "@/components/booking/appointment-booking-view";
import { PublicShell } from "@/components/layout/public-shell";
import { generateCmsMetadata, DEFAULT_FALLBACK_DOCTORS, DEFAULT_FALLBACK_SERVICES } from "@/lib/services/cms.service";
import Link from "next/link";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return generateCmsMetadata(
    "book",
    "Book Doctor Appointment",
    "Schedule your medical consultation with qualified healthcare specialists. Real-time slot booking with instant confirmation."
  );
}

interface BookAppointmentPageProps {
  searchParams?: Promise<{ doctorId?: string; serviceId?: string }>;
}

export default async function BookAppointmentPage(props: BookAppointmentPageProps) {
  const [session, searchParamsResolved] = await Promise.all([
    getSession(),
    props.searchParams ? props.searchParams : Promise.resolve({} as { doctorId?: string; serviceId?: string }),
  ]);

  let doctors: any[] = [];
  let services: any[] = [];
  let clinic: any = null;

  try {
    const results = await Promise.all([
      prisma.doctor.findMany({
        where: {
          isActive: true,
          isAvailableForBooking: true,
          clinic: { isActive: true },
        },
        include: {
          user: { select: { fullName: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.service.findMany({
        where: { isActive: true, clinic: { isActive: true } },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.clinic.findFirst({
        where: { isActive: true },
        select: { name: true, phone: true, email: true },
      }),
    ]);
    doctors = results[0];
    services = results[1];
    clinic = results[2];
  } catch (err) {
    console.warn("Database connection error in BookAppointmentPage, using fallback:", err);
    clinic = { name: "Doctor Plus", phone: "+91 98765 43210", email: "care@doctorplus.com" };
  }

  const activeDoctors = doctors.length > 0 ? doctors : DEFAULT_FALLBACK_DOCTORS;
  const activeServices = services.length > 0 ? services : DEFAULT_FALLBACK_SERVICES;

  const serializedDoctors = activeDoctors.map((d: any) => ({
    id: d.id,
    specialization: d.specialization,
    qualification: d.qualification,
    experienceYears: d.experienceYears,
    consultationFee: Number(d.consultationFee),
    advanceBookingFee: Number(d.advanceBookingFee || 100),
    appointmentDurationMinutes: d.appointmentDurationMinutes || 20,
    roomNumber: d.roomNumber,
    profilePhotoUrl: d.profilePhotoUrl,
    user: {
      fullName: d.user?.fullName || "Doctor",
      email: d.user?.email || "doctor@doctorplus.com",
    },
  }));

  const serializedServices = activeServices.map((s: any) => ({
    id: s.id,
    name: s.name,
    fee: Number(s.fee),
    durationMinutes: s.durationMinutes,
  }));

  return (
    <PublicShell>
      <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
            <div>
              <Link
                href="/"
                className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 mb-1"
              >
                ← Back to {clinic?.name || "Clinic Home"}
              </Link>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Schedule a Medical Consultation
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Select your specialist, preferred date, and verified appointment slot.
              </p>
            </div>
            {session ? (
              <Link
                href={`/dashboard/${session.role.toLowerCase()}`}
                className="self-start sm:self-auto text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                Portal Dashboard →
              </Link>
            ) : (
              <Link
                href="/login"
                className="self-start sm:self-auto text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                Patient Sign In →
              </Link>
            )}
          </div>

          <AppointmentBookingView
            doctors={serializedDoctors}
            services={serializedServices}
            initialDoctorId={searchParamsResolved.doctorId}
            initialServiceId={searchParamsResolved.serviceId}
            prefilledPatient={
              session
                ? {
                    fullName: session.fullName,
                    email: session.email,
                  }
                : null
            }
          />
        </div>
      </div>
    </PublicShell>
  );
}
