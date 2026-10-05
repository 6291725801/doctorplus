/* eslint-disable @next/next/no-img-element */
import React from "react";
import Link from "next/link";
import { getPublicDoctors, generateCmsMetadata } from "@/lib/services/cms.service";
import { PublicShell } from "@/components/layout/public-shell";

export async function generateMetadata() {
  return generateCmsMetadata(
    "doctors",
    "Our Doctors & Specialists Directory",
    "Meet our certified medical specialists, Ayurvedic doctors, and clinical faculty. View credentials, experience, fees, and schedule an appointment."
  );
}

export default async function DoctorsPage() {
  const doctors = await getPublicDoctors();

  return (
    <PublicShell>
      {/* Header Banner */}
      <section className="bg-gradient-to-b from-emerald-50/70 via-slate-50 to-white dark:from-slate-900/80 dark:via-slate-950 dark:to-slate-950 py-16 sm:py-20 border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest block mb-2">
            Verified Clinical Practitioners
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Our Doctors & Specialists
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            Consult with postgraduate Ayurvedic doctors and clinical specialists with verified credentials, extensive patient experience, and compassionate care.
          </p>
        </div>
      </section>

      {/* Doctors Grid */}
      <section className="py-16 sm:py-20 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {doctors.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
              <span className="text-4xl">👨‍⚕️</span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-3">No Specialists Listed Currently</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Doctor schedules are currently being updated. Please check back shortly or contact our desk.
              </p>
              <Link href="/contact" className="mt-4 inline-block text-xs font-bold text-emerald-600">
                Contact Reception →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {doctors.map((doc) => {
                const availableDays = Array.from(new Set(doc.schedules.map((s) => s.dayOfWeek)));

                return (
                  <div
                    key={doc.id}
                    className="rounded-3xl border border-slate-200/80 bg-white p-7 shadow-xs hover:shadow-xl transition-all duration-300 dark:bg-slate-900 dark:border-slate-800 flex flex-col justify-between hover:-translate-y-1"
                  >
                    <div>
                      {/* Photo & Badge */}
                      <div className="flex items-start justify-between mb-5">
                        <div className="h-24 w-24 rounded-2xl bg-emerald-50 dark:bg-slate-800 overflow-hidden border-2 border-emerald-500/30 flex items-center justify-center">
                          {doc.profilePhotoUrl ? (
                            <img
                              src={doc.profilePhotoUrl}
                              alt={doc.user?.fullName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">Dr</span>
                          )}
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <span>✓</span> Verified OPD
                        </span>
                      </div>

                      {/* Bio Details */}
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        {doc.user?.fullName}
                      </h2>
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                        {doc.specialization}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                        {doc.qualification}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {doc.experienceYears > 0 && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {doc.experienceYears} Years Exp.
                          </span>
                        )}
                        {doc.languages && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            🗣️ {doc.languages}
                          </span>
                        )}
                      </div>

                      {doc.bio && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-4 line-clamp-3 leading-relaxed">
                          {doc.bio}
                        </p>
                      )}

                      {/* Available Days */}
                      {availableDays.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                          <span className="text-slate-400 block font-medium mb-1">Consultation Days:</span>
                          <div className="flex flex-wrap gap-1">
                            {availableDays.map((d) => (
                              <span
                                key={d}
                                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                              >
                                {d.slice(0, 3)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Fee</span>
                        <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                          ₹{Number(doc.consultationFee).toFixed(0)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/doctors/${doc.id}`}
                          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
                        >
                          View Bio
                        </Link>
                        <Link
                          href={`/book?doctorId=${doc.id}`}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition"
                        >
                          Book Slot
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </PublicShell>
  );
}
