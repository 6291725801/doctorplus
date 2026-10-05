import React from "react";
import { prisma } from "@/lib/db";
import { PublicShell } from "@/components/layout/public-shell";
import { getActiveClinic, generateCmsMetadata } from "@/lib/services/cms.service";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return generateCmsMetadata(
    "privacy",
    "Privacy Policy & Healthcare Data Protection",
    "Learn how we safeguard your electronic health records, personal details, consultation histories, and confidential clinical information."
  );
}

export default async function PrivacyPolicyPage() {
  const clinic = await getActiveClinic();

  return (
    <PublicShell>
      <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-teal-500/10 via-emerald-500/5 to-transparent border-b border-slate-200 dark:border-slate-800 py-14 sm:py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              HIPAA & Clinical Data Compliance
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Privacy Policy & Health Data Ethics
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Last Updated: October 2026 • Effective for all patients of {clinic?.name || "our clinical practice"}
            </p>
          </div>
        </section>

        {/* Content Section */}
        <section className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 space-y-8 shadow-sm text-slate-700 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">
                1. Our Commitment to Patient Privacy
              </h2>
              <p>
                At {clinic?.name || "our clinic"}, your medical privacy and dignity are paramount. We handle your protected health information (PHI), clinical history, diagnostic records, and personal communications with the highest degree of confidentiality and strict adherence to healthcare privacy statutes.
              </p>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">
                2. Information We Collect
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Personal Identity:</strong> Full legal name, date of birth, gender, contact number, email address, and home address.</li>
                <li><strong>Medical & Health Data:</strong> Current complaints, past medical histories, drug allergies, lifestyle habits, prescription logs, diagnostic laboratory reports, and attending physician clinical notes.</li>
                <li><strong>Booking & Transaction Records:</strong> Appointment timestamps, doctor assigned, consultation fees, receipts, transaction reference IDs, and payment statuses.</li>
                <li><strong>Emergency Contacts:</strong> Nominated primary contact name, phone number, and relationship.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">
                3. Purpose of Processing Health Data
              </h2>
              <p className="mb-2">Your information is utilized solely to deliver and coordinate high-quality healthcare, specifically:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Providing clinical consultations, diagnostic evaluation, and customized treatment plans.</li>
                <li>Generating electronic prescriptions and scheduling follow-up reviews.</li>
                <li>Facilitating appointment reminders, queue alerts, and billing receipts.</li>
                <li>Fulfilling legal, clinical audit, and regulatory reporting mandates.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">
                4. Absolute Non-Sale of Patient Records
              </h2>
              <p className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-950 dark:text-teal-200 font-medium">
                We strictly NEVER monetize, sell, lease, or distribute patient identities or medical conditions to third-party advertising networks, pharmaceutical promoters, or data brokers under any circumstances.
              </p>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">
                5. Access Control & Encryption
              </h2>
              <p>
                Clinical records are stored on secure servers with encrypted databases (AES-256 at rest, TLS 1.3 in transit). Only verified medical staff and the assigned attending physician are granted role-based access to your diagnostic timeline.
              </p>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">
                6. Patient Rights
              </h2>
              <p>
                You retain complete rights to view your digital health record, download consultation receipts, request corrections to erroneous medical background, or request data export through your authenticated Patient Portal.
              </p>
            </div>

            <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                7. Data Protection Officer Contact
              </h2>
              <p className="text-sm">
                For questions regarding this policy or to submit a privacy inquiry, please contact our medical records team at:
              </p>
              <div className="mt-2 text-sm font-semibold text-teal-600 dark:text-teal-400">
                Email: {clinic?.email || "privacy@clinic.com"} | Tel: {clinic?.phone || "+91 98765 43210"}
              </div>
            </div>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
