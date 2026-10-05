import React from "react";
import { prisma } from "@/lib/db";
import { PublicShell } from "@/components/layout/public-shell";
import { getActiveClinic, generateCmsMetadata } from "@/lib/services/cms.service";
import { FAQAccordion } from "@/components/public/faq-accordion";
import Link from "next/link";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return generateCmsMetadata(
    "faq",
    "Frequently Asked Questions",
    "Find immediate answers regarding appointment bookings, doctor consultations, medical procedures, payments, and clinic policies."
  );
}

const DEFAULT_FAQS = [
  {
    id: "def-1",
    question: "How do I book an appointment with a specialist?",
    answer: "You can book directly through our online booking engine by visiting the 'Book Appointment' page. Select your specialist, choose an available date and time slot, and fill in patient details for instant confirmation.",
    category: "Appointments",
  },
  {
    id: "def-2",
    question: "Can I reschedule or cancel my confirmed booking?",
    answer: "Yes. Patients can manage upcoming appointments directly from their Patient Portal dashboard. Cancellations and reschedules are permitted up to 2 hours prior to the scheduled slot without penalty.",
    category: "Appointments",
  },
  {
    id: "def-3",
    question: "What documents should I bring to my clinical consultation?",
    answer: "Please bring any previous medical reports, recent blood tests, current medication prescriptions, and a valid photo identification card. If you are an existing patient, your digital health profile will be accessible to our doctors.",
    category: "Consultation",
  },
  {
    id: "def-4",
    question: "What payment methods are accepted?",
    answer: "We accept all major credit/debit cards, UPI payments, net banking, and direct front-desk cash/card settlement. Any advance booking fee paid online is automatically deducted from your final consultation fee.",
    category: "Payments",
  },
  {
    id: "def-5",
    question: "Is teleconsultation or video consultation available?",
    answer: "Yes, select doctors offer secure teleconsultation sessions. You can choose the teleconsultation option during appointment booking when scheduling with participating doctors.",
    category: "Consultation",
  },
  {
    id: "def-6",
    question: "How does the clinic protect my medical records and privacy?",
    answer: "All patient records, medical profiles, and diagnostic documents are encrypted with healthcare-grade security protocols. Only your attending physician and authorized clinic staff have access to your clinical records.",
    category: "Privacy & Records",
  },
];

export default async function FAQPage() {
  const clinic = await getActiveClinic();

  const faqs = DEFAULT_FAQS;

  return (
    <PublicShell>
      <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-teal-500/10 via-emerald-500/5 to-transparent border-b border-slate-200 dark:border-slate-800 py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              Clear & Transparent Guidance
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Frequently Asked Questions
            </h1>
            <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 dark:text-slate-400">
              Everything you need to know about scheduling, clinical consultations, payments, and patient care at {clinic?.name || "our practice"}.
            </p>
          </div>
        </section>

        {/* Content Section */}
        <section className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <FAQAccordion faqs={faqs} />

          {/* Bottom Help Box */}
          <div className="mt-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Still have questions?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Our patient support desk is here to assist you with special medical needs, appointments, or billing questions.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/contact"
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition-all"
              >
                Contact Helpdesk
              </Link>
              <Link
                href="/book"
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-semibold text-xs transition-all"
              >
                Schedule Appointment →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
