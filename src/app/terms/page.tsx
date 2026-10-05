import React from "react";
import { prisma } from "@/lib/db";
import { PublicShell } from "@/components/layout/public-shell";
import { generateCmsMetadata } from "@/lib/services/cms.service";
import Link from "next/link";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return generateCmsMetadata(
    "terms",
    "Terms of Medical Service & Patient Agreement",
    "Terms and conditions governing clinical appointments, teleconsultations, electronic health portals, and medical advisory services."
  );
}

export default async function TermsPage() {
  const clinic = await prisma.clinic.findFirst({
    where: { isActive: true },
    select: { name: true, phone: true, email: true },
  });

  return (
    <PublicShell>
      <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-teal-500/10 via-emerald-500/5 to-transparent border-b border-slate-200 dark:border-slate-800 py-14 sm:py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              Clinical Service Guidelines
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Terms of Medical Service
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Please read these terms carefully prior to booking consultations or accessing patient services.
            </p>
          </div>
        </section>

        {/* Content Section */}
        <section className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 space-y-8 shadow-sm text-slate-700 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">
                1. Acceptance of Terms
              </h2>
              <p>
                By scheduling an appointment, registering a patient portal account, or utilizing healthcare services offered by {clinic?.name || "our clinic"}, you agree to be bound by these Terms of Service and all related clinical compliance codes.
              </p>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">
                2. Nature of Clinical Consultation
              </h2>
              <p className="mb-2">
                All consultations—whether in-person at our clinic or conducted remotely via teleconsultation—constitute professional medical guidance between a certified healthcare provider and the registered patient:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Patients must provide complete, accurate, and truthful details regarding past medical conditions, ongoing medications, and allergies.</li>
                <li>Prescription issuance is at the sole clinical discretion of the licensed physician based on diagnosis.</li>
                <li>Online consultations do not substitute for emergency medical care. In acute emergencies, patients must immediately report to the nearest emergency trauma center.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">
                3. Appointment Punctuality & Slot Allocation
              </h2>
              <p>
                To maintain clinical quality and minimize waiting times, patients are requested to arrive at the clinic 10 minutes prior to their scheduled slot (or join the video room 5 minutes early for virtual visits). If an emergency procedure causes a doctor delay, the clinic care desk will promptly notify you.
              </p>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">
                4. Professional Etiquette & Zero-Tolerance Policy
              </h2>
              <p>
                We are dedicated to providing a safe, respectful, and dignified environment for patients and clinical staff alike. Abusive language, harassment, discrimination, or disruptive conduct will result in immediate termination of consultation and permanent revocation of portal privileges.
              </p>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">
                5. Intellectual Property & Portal Security
              </h2>
              <p>
                Patients are responsible for maintaining the confidentiality of their login credentials. All educational healthcare content, diet charts, and clinical guidance materials published on this website remain the proprietary intellectual property of {clinic?.name || "the clinic"}.
              </p>
            </div>

            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Questions regarding our clinical agreements? Reach us at {clinic?.email || "legal@clinic.com"}
              </div>
              <Link
                href="/cancellation-policy"
                className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
              >
                View Cancellation & Refund Policy →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
