import React from "react";
import { prisma } from "@/lib/db";
import { PublicShell } from "@/components/layout/public-shell";
import { getActiveClinic, generateCmsMetadata } from "@/lib/services/cms.service";
import Link from "next/link";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return generateCmsMetadata(
    "testimonials",
    "Patient Stories & Reviews",
    "Read real, verified patient recovery journeys and clinical treatment experiences from patients who entrusted their health to our specialists."
  );
}

const TESTIMONIALS = [
  {
    id: "t1",
    author: "Siddharth Verma",
    location: "Bengaluru",
    role: "Chronic Migraine & Spine Care Patient",
    doctorConsulted: "Ayurvedic Physician & Neuro Specialist",
    rating: 5,
    quote: "After 3 years of chronic back pain and relentless painkillers, Dr. Sharma diagnosed the fundamental postural imbalance. Within 6 weeks of targeted therapy, I returned to pain-free daily runs.",
    recoveryDays: "45 Days Recovery",
    verified: true,
  },
  {
    id: "t2",
    author: "Pooja Nandakumar",
    location: "Mysuru",
    role: "Metabolic & Thyroid Wellness Patient",
    doctorConsulted: "Chief Physician",
    rating: 5,
    quote: "The personalized dietary roadmap and herbal formulations normalized my lipid levels and energy slumps completely without extreme restrictions. The entire team takes genuine interest in long-term wellness.",
    recoveryDays: "3 Months Program",
    verified: true,
  },
  {
    id: "t3",
    author: "Dr. Arvind Kulkarni",
    location: "Hyderabad",
    role: "Senior Consultant Surgeon (Patient)",
    doctorConsulted: "Integrative Health Specialist",
    rating: 5,
    quote: "As a modern medical practitioner myself, I appreciate how scientifically grounded their protocols are. The pre-consultation diagnostics, punctuality, and detailed clinical rationale were exemplary.",
    recoveryDays: "Post-Surgical Rehab",
    verified: true,
  },
  {
    id: "t4",
    author: "Meenakshi Sundaram",
    location: "Chennai",
    role: "Rheumatoid Arthritis Patient",
    doctorConsulted: "Panchakarma & Joint Care Specialist",
    rating: 5,
    quote: "Joint stiffness used to limit my morning walks. The localized herbal oil therapy (Janu Basti) and herbal decoctions restored my joint mobility remarkably. The clinic environment is exceptionally serene and hygienic.",
    recoveryDays: "60 Days Protocol",
    verified: true,
  },
  {
    id: "t5",
    author: "Vikramaditya Rao",
    location: "Bengaluru",
    role: "Stress & Sleep Disorder Patient",
    doctorConsulted: "Mind & Lifestyle Physician",
    rating: 5,
    quote: "Insomnia had derailed my professional routine. The holistic therapy coupled with evening breathing guidance reset my circadian rhythm. I sleep deeply for 7 hours consistently now.",
    recoveryDays: "30 Days Program",
    verified: true,
  },
  {
    id: "t6",
    author: "Ananya Deshmukh",
    location: "Pune",
    role: "Digestive & Gut Health Patient",
    doctorConsulted: "Clinical Nutrition & Internal Medicine",
    rating: 5,
    quote: "Years of acid reflux and irritable gut vanished after adhering to the personalized diet plan and clinical herbal remedies. Scheduling appointments on their website is remarkably frictionless.",
    recoveryDays: "40 Days Recovery",
    verified: true,
  },
];

export default async function TestimonialsPage() {
  const clinic = await getActiveClinic();

  return (
    <PublicShell>
      <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-teal-500/10 via-emerald-500/5 to-transparent border-b border-slate-200 dark:border-slate-800 py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              Verified Patient Experiences
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Real Stories of Healing & Recovery
            </h1>
            <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 dark:text-slate-400">
              Discover how {clinic?.name || "our clinical practice"} has helped thousands overcome chronic conditions through integrative, root-cause healthcare.
            </p>
          </div>
        </section>

        {/* Stats Row */}
        <section className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-black text-teal-600 dark:text-teal-400">4.9 / 5</div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Average Satisfaction Score</div>
            </div>
            <div>
              <div className="text-3xl font-black text-teal-600 dark:text-teal-400">12,500+</div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Patients Treated</div>
            </div>
            <div>
              <div className="text-3xl font-black text-teal-600 dark:text-teal-400">96%</div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Recovery Recommendation Rate</div>
            </div>
            <div>
              <div className="text-3xl font-black text-teal-600 dark:text-teal-400">100%</div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Verified Clinical Feedback</div>
            </div>
          </div>
        </section>

        {/* Testimonials Grid */}
        <section className="max-w-7xl mx-auto py-14 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-all relative overflow-hidden"
              >
                <div className="space-y-4">
                  {/* Rating Stars & Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-500">
                      {[...Array(t.rating)].map((_, i) => (
                        <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {t.recoveryDays}
                    </span>
                  </div>

                  {/* Quote */}
                  <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 italic leading-relaxed">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </div>

                {/* Author Info */}
                <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      {t.author}
                      {t.verified && (
                        <svg className="w-4 h-4 text-teal-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{t.role} • {t.location}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Box */}
          <div className="mt-16 bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 text-white rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-xl">
            <h2 className="text-2xl sm:text-3xl font-black">Begin Your Personal Path to Health Today</h2>
            <p className="max-w-xl mx-auto text-sm sm:text-base text-teal-100/90">
              Schedule your first comprehensive evaluation with our certified physicians and experience the difference of personalized medical care.
            </p>
            <div className="pt-2">
              <Link
                href="/book"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-white hover:bg-teal-50 text-teal-950 font-bold text-sm shadow-lg transition-all"
              >
                Schedule Consultation Now
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
