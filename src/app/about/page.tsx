/* eslint-disable @next/next/no-img-element */
import React from "react";
import Link from "next/link";
import { getActiveClinic, generateCmsMetadata, getPublicDoctors, getHomepageData } from "@/lib/services/cms.service";
import { PublicShell } from "@/components/layout/public-shell";

export async function generateMetadata() {
  return generateCmsMetadata(
    "about",
    "About Our Clinic & Clinical Philosophy",
    "Learn about our clinical heritage, medical team, holistic healing philosophy, and modern patient care standards."
  );
}

export default async function AboutPage() {
  const [clinic, doctors, homeData] = await Promise.all([
    getActiveClinic().catch(() => null),
    getPublicDoctors().catch(() => []),
    getHomepageData().catch(() => null),
  ]);

  const clinicName = clinic?.name || "AyurvedaCare Clinic";
  const aboutSection = homeData?.sections.find((s) => s.sectionType === "ABOUT");
  const aboutContent = (aboutSection?.content as Record<string, string | undefined>) || {};
  const aboutTitle = aboutSection?.title || "Restoring Equilibrium Through Root-Cause Healing";
  const aboutSubtitle = aboutSection?.subtitle || "Bridging timeless Ayurvedic wisdom with contemporary clinical excellence, personalized patient care, and evidence-informed therapies.";
  const aboutParagraph = aboutContent.paragraph || `At ${clinicName}, we believe true healthcare is proactive, personalized, and restorative. Rather than merely masking chronic symptoms, our clinical protocols aim to diagnose the underlying imbalances in your body's doshic constitution and metabolic fire (Agni).`;
  const aboutImage = aboutContent.imageUrl || "/hero-clinic.jpg";
  const aboutYears = aboutContent.yearsExperience || "12+ Years";

  return (
    <PublicShell>
      {/* Header Banner */}
      <section className="bg-gradient-to-b from-emerald-50/70 via-slate-50 to-white dark:from-slate-900/80 dark:via-slate-950 dark:to-slate-950 py-16 sm:py-20 border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest block mb-2">
            Our Heritage & Mission
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            About {clinicName}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            {aboutSubtitle}
          </p>
        </div>
      </section>

      {/* Philosophy & Story */}
      <section className="py-16 sm:py-20 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                Our Healing Philosophy
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
                {aboutTitle}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {aboutParagraph}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Every consultation is conducted with unhurried clinical attention. Our practitioners synthesize traditional diagnostic modalities—including pulse examination, tongue evaluation, and constitutional profiling—with modern diagnostic markers to formulate your treatment roadmap.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/40">
                  <h4 className="font-extrabold text-emerald-800 dark:text-emerald-300 text-sm">Authentic Formulations</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Standardized, heavy-metal tested classical botanical preparations.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-800/40">
                  <h4 className="font-extrabold text-teal-800 dark:text-teal-300 text-sm">Verified Doctors</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Certified postgraduate practitioners with proven clinical track records.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-4/3 rounded-3xl overflow-hidden shadow-xl border-4 border-slate-100 dark:border-slate-800 bg-slate-100">
                <img
                  src={aboutImage}
                  alt="Clinic interior"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-emerald-600 text-white p-6 rounded-2xl shadow-xl hidden sm:block max-w-xs">
                <p className="text-2xl font-extrabold">{aboutYears}</p>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Of Dedicated Clinical Service & Holistic Patient Care
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 sm:py-20 bg-slate-50 dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
              Guiding Principles
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              Why Patients Choose Us
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-2xl text-emerald-600 mb-5">
                🩺
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Evidence-Informed Care</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                We combine classical Ayurvedic texts with modern laboratory assessments and diagnostic findings for safe, integrated healing.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="h-12 w-12 rounded-2xl bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-2xl text-teal-600 mb-5">
                🌿
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Purity & Potency</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                All prescribed herbal extracts, oils, and decoctions are ethically wild-crafted, standardized, and free from synthetic additives.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="h-12 w-12 rounded-2xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-2xl text-amber-600 mb-5">
                🤝
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Patient Empowerment</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                We equip every patient with customized dietary guidelines (Ahara), lifestyle routines (Vihara), and seasonal care habits.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Leadership & Doctors */}
      {doctors.length > 0 && (
        <section className="py-16 sm:py-20 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                  Our Specialists
                </span>
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                  Clinical Leadership Team
                </h2>
              </div>
              <Link
                href="/doctors"
                className="text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>View All Specialists</span>
                <span>→</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {doctors.slice(0, 3).map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50/50 p-6 dark:bg-slate-800/40 dark:border-slate-800 text-center"
                >
                  <div className="h-24 w-24 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-slate-700 overflow-hidden border-2 border-emerald-500 flex items-center justify-center">
                    {doc.profilePhotoUrl ? (
                      <img src={doc.profilePhotoUrl} alt={doc.user?.fullName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">Dr</span>
                    )}
                  </div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {doc.user?.fullName}
                  </h3>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{doc.specialization}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{doc.qualification}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Booking CTA Strip */}
      <section className="py-14 bg-emerald-600 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 space-y-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Consult Our Clinical Specialists
          </h2>
          <p className="text-emerald-100 text-sm max-w-xl mx-auto">
            Book an appointment today with verified doctors for thorough diagnostics and personalized holistic remedies.
          </p>
          <div className="pt-2">
            <Link
              href="/book"
              className="inline-block px-8 py-3.5 rounded-xl bg-white text-emerald-900 font-extrabold text-sm shadow-xl hover:bg-emerald-50 transition"
            >
              📅 Schedule Consultation
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
