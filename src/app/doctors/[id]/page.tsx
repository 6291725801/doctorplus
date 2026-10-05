/* eslint-disable @next/next/no-img-element */
import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicDoctorById, getSiteSettings } from "@/lib/services/cms.service";
import { PublicShell } from "@/components/layout/public-shell";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: RouteParams) {
  const { id } = await params;
  const doctor = await getPublicDoctorById(id).catch(() => null);
  const siteSettings = await getSiteSettings().catch(() => null);

  const clinicName = siteSettings?.siteTitle || "Doctor Plus";
  if (!doctor) {
    return { title: `Doctor Details | ${clinicName}` };
  }

  return {
    title: `${doctor.user.fullName} (${doctor.specialization}) | ${clinicName}`,
    description: doctor.bio || `Consult with ${doctor.user.fullName}, ${doctor.specialization} at ${clinicName}. Book appointment online.`,
  };
}

export default async function DoctorDetailsPage({ params }: RouteParams) {
  const { id } = await params;
  const doctor = await getPublicDoctorById(id);

  if (!doctor) {
    notFound();
  }

  return (
    <PublicShell>
      {/* Breadcrumb strip */}
      <div className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 px-4 sm:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex items-center space-x-2">
          <Link href="/" className="hover:text-emerald-600">Home</Link>
          <span>/</span>
          <Link href="/doctors" className="hover:text-emerald-600">Doctors</Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-medium">{doctor.user.fullName}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Doctor Profile Card */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <div className="h-36 w-36 mx-auto mb-6 rounded-3xl bg-emerald-50 dark:bg-slate-800 overflow-hidden border-4 border-emerald-500/20 shadow-md flex items-center justify-center">
              {doctor.profilePhotoUrl ? (
                <img
                  src={doctor.profilePhotoUrl}
                  alt={doctor.user.fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-4xl font-extrabold text-emerald-700 dark:text-emerald-400">Dr</span>
              )}
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {doctor.user.fullName}
            </h1>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {doctor.specialization}
            </p>
            <p className="text-xs text-slate-500 mt-1">{doctor.qualification}</p>

            <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-3 text-left text-xs">
              {doctor.registrationNumber && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Registration:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{doctor.registrationNumber}</span>
                </div>
              )}
              {doctor.experienceYears > 0 && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Experience:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{doctor.experienceYears} Years Clinical Practice</span>
                </div>
              )}
              {doctor.languages && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Languages:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{doctor.languages}</span>
                </div>
              )}
              {doctor.roomNumber && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Consultation Room:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{doctor.roomNumber}</span>
                </div>
              )}
              {doctor.clinicLocation && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Location:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{doctor.clinicLocation}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-t border-slate-100 dark:border-slate-800 pt-2 text-sm">
                <span className="text-slate-500 font-medium">Consultation Fee:</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                  ₹{Number(doctor.consultationFee).toFixed(0)}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href={`/book?doctorId=${doctor.id}`}
                className="w-full block py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md shadow-emerald-600/25 transition text-center"
              >
                📅 Book Appointment With Doctor
              </Link>
            </div>
          </div>

          {/* Right Column: Bio, Weekly Schedules & Services */}
          <div className="lg:col-span-7 space-y-8">
            {/* Biography */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Clinical Biography & Approach
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {doctor.bio ||
                  `${doctor.user.fullName} is a dedicated healthcare specialist focused on root-cause analysis, Ayurvedic pulse diagnosis, and personalized wellness regimens. With extensive clinical experience, Dr. ${doctor.user.fullName.replace("Dr. ", "")} brings compassionate, holistic medical solutions to complex disorders.`}
              </p>
            </div>

            {/* Weekly Consultation Hours */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Consultation Schedule & Working Hours
                </h2>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {doctor.appointmentDurationMinutes} Min Slots
                </span>
              </div>

              {doctor.schedules.length === 0 ? (
                <p className="text-xs text-slate-500">Contact clinic reception for appointment schedules.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {doctor.schedules.map((s) => (
                    <div
                      key={s.id}
                      className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs flex justify-between items-center"
                    >
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {s.dayOfWeek}
                      </span>
                      <div className="text-right">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {s.startTime} – {s.endTime}
                        </span>
                        {s.breakStartTime && (
                          <span className="block text-[10px] text-slate-400">
                            Break: {s.breakStartTime}-{s.breakEndTime}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Clinical Services Offered */}
            {doctor.services.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Specialized Treatments Offered
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {doctor.services.map((ds) => (
                    <Link
                      key={ds.serviceId}
                      href={`/services/${ds.service.slug}`}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-emerald-500 transition group block"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 transition">
                          {ds.service.name}
                        </h4>
                        <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                          ₹{Number(ds.service.fee).toFixed(0)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {ds.service.shortDescription || ds.service.description}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
