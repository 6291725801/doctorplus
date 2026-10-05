/* eslint-disable @next/next/no-img-element */
import React from "react";
import Link from "next/link";
import { getPublicServices, generateCmsMetadata } from "@/lib/services/cms.service";
import { PublicShell } from "@/components/layout/public-shell";

export async function generateMetadata() {
  return generateCmsMetadata(
    "services",
    "Clinical Healthcare Services & Treatments",
    "Discover our evidence-informed clinical services, authentic Panchakarma therapies, holistic health consultations, and specialized treatments."
  );
}

export default async function ServicesPage() {
  const services = await getPublicServices();

  return (
    <PublicShell>
      {/* Header Banner */}
      <section className="bg-gradient-to-b from-emerald-50/70 via-slate-50 to-white dark:from-slate-900/80 dark:via-slate-950 dark:to-slate-950 py-16 sm:py-20 border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest block mb-2">
            Holistic Clinical Care
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Our Healthcare Services
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            From initial constitutional health evaluations to advanced multi-day restorative therapies, our treatments are customized to your specific physiological needs.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16 sm:py-20 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {services.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
              <span className="text-4xl">🌿</span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-3">Services Catalog Updating</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Our clinical services catalog is being updated with new treatment modalities. Please contact reception.
              </p>
              <Link href="/contact" className="mt-4 inline-block text-xs font-bold text-emerald-600">
                Contact Reception →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="rounded-3xl border border-slate-200/80 bg-white p-7 shadow-xs hover:shadow-xl transition-all duration-300 dark:bg-slate-900 dark:border-slate-800 flex flex-col justify-between hover:-translate-y-1"
                >
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-3xl text-emerald-600">
                        {service.iconUrl ? (
                          <img src={service.iconUrl} alt={service.name} className="h-8 w-8 object-contain" />
                        ) : (
                          "🌿"
                        )}
                      </div>
                      {service.isPopular && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          ★ Most Popular
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {service.name}
                    </h2>

                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed line-clamp-3">
                      {service.shortDescription || service.description || "Comprehensive clinical diagnosis and personalized treatment plan tailored to your body constitution."}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4 text-xs text-slate-500">
                      <span>⏱️ {service.durationMinutes} Minutes</span>
                      <span>👨‍⚕️ {service.doctors.length} Specialist{service.doctors.length === 1 ? "" : "s"}</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Standard Fee</span>
                      <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                        ₹{Number(service.fee).toFixed(0)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/services/${service.slug}`}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
                      >
                        Details
                      </Link>
                      <Link
                        href={`/book?serviceId=${service.id}`}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition"
                      >
                        Book
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicShell>
  );
}
