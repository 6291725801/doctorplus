import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicServiceBySlug, getSiteSettings } from "@/lib/services/cms.service";
import { PublicShell } from "@/components/layout/public-shell";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: RouteParams) {
  const { slug } = await params;
  const service = await getPublicServiceBySlug(slug).catch(() => null);
  const siteSettings = await getSiteSettings().catch(() => null);

  const clinicName = siteSettings?.siteTitle || "Doctor Plus";
  if (!service) {
    return { title: `Service Details | ${clinicName}` };
  }

  return {
    title: `${service.name} | ${clinicName}`,
    description: service.shortDescription || service.description || `Book ${service.name} consultation at ${clinicName}.`,
  };
}

export default async function ServiceDetailsPage({ params }: RouteParams) {
  const { slug } = await params;
  const service = await getPublicServiceBySlug(slug);

  if (!service) {
    notFound();
  }

  return (
    <PublicShell>
      {/* Breadcrumb strip */}
      <div className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 px-4 sm:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex items-center space-x-2">
          <Link href="/" className="hover:text-emerald-600">Home</Link>
          <span>/</span>
          <Link href="/services" className="hover:text-emerald-600">Services</Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-medium">{service.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Main Details */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  ⏱️ {service.durationMinutes} Minutes Consultation
                </span>
                {service.isPopular && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    ★ Highly Recommended
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {service.name}
              </h1>

              <div className="prose dark:prose-invert max-w-none text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-4">
                <p className="text-base font-medium text-slate-800 dark:text-slate-200">
                  {service.shortDescription || "Comprehensive clinical diagnosis and personalized treatment plan tailored to your body constitution."}
                </p>
                <div className="pt-2 whitespace-pre-line">
                  {service.description ||
                    `This treatment program is administered by certified practitioners utilizing classical Ayurvedic protocols, herbal preparations, and diagnostic evaluation. Each session is carefully calibrated to the patient's individual doshic state (Vata, Pitta, Kapha) and current metabolic indicators.`}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 font-medium block">Standard Fee</span>
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    ₹{Number(service.fee).toFixed(0)}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 font-medium block">Session Duration</span>
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    {service.durationMinutes} Min
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 font-medium block">Consultation Type</span>
                  <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    OPD / Video
                  </span>
                </div>
              </div>
            </div>

            {/* Doctors Offering this Service */}
            {service.doctors.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Specialists Offering This Service
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {service.doctors.map((d) => (
                    <div
                      key={d.doctor.id}
                      className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-4"
                    >
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {d.doctor.user.fullName}
                        </h4>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          {d.doctor.specialization}
                        </p>
                      </div>
                      <Link
                        href={`/book?doctorId=${d.doctor.id}&serviceId=${service.id}`}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs whitespace-nowrap"
                      >
                        Book
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Sticky Booking Card */}
          <div className="lg:col-span-4 sticky top-28 space-y-6">
            <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl p-8 border border-emerald-800/40 shadow-xl space-y-6">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-1">
                  Ready to Book?
                </span>
                <h3 className="text-2xl font-extrabold tracking-tight">
                  Schedule {service.name}
                </h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Lock in your consultation slot with certified practitioners. Advance deposit secures your booking.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex justify-between items-center">
                <div>
                  <span className="text-[11px] text-slate-300 block">Consultation Fee</span>
                  <span className="text-2xl font-black text-white">₹{Number(service.fee).toFixed(0)}</span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {service.durationMinutes} Minutes
                </span>
              </div>

              <Link
                href={`/book?serviceId=${service.id}`}
                className="w-full block py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm text-center shadow-lg transition transform hover:-translate-y-0.5"
              >
                📅 Select Date & Time Slot →
              </Link>

              <div className="pt-2 text-center text-xs text-slate-400 space-y-1.5">
                <p>✓ Free rescheduling up to 2 hours prior</p>
                <p>✓ In-person & secure video options available</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
