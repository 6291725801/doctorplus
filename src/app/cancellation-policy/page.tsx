import React from "react";
import { prisma } from "@/lib/db";
import { PublicShell } from "@/components/layout/public-shell";
import { generateCmsMetadata } from "@/lib/services/cms.service";
import Link from "next/link";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return generateCmsMetadata(
    "cancellation-policy",
    "Cancellation & Refund Policy",
    "Transparent rules governing appointment cancellations, rescheduling windows, advance booking deposits, and refund processing."
  );
}

export default async function CancellationPolicyPage() {
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
              Clear & Fair Healthcare Terms
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Cancellation & Refund Policy
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              We respect your schedule and our doctors&apos; clinical time. Here is our policy regarding changes to scheduled appointments.
            </p>
          </div>
        </section>

        {/* Content Section */}
        <section className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 space-y-8 shadow-sm text-slate-700 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
            {/* Quick Summary Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800">
                <div className="text-xl font-black text-teal-700 dark:text-teal-300">2 Hours</div>
                <div className="text-xs font-semibold text-teal-900 dark:text-teal-200 mt-1">Free Reschedule Cutoff</div>
                <p className="text-[11px] text-teal-800/80 dark:text-teal-300/80 mt-1">Reschedule at zero fee up to 2 hours before your slot.</p>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div className="text-xl font-black text-emerald-700 dark:text-emerald-300">100% Refund</div>
                <div className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 mt-1">Doctor Rescheduling</div>
                <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-1">Full refund if the clinic reschedules or cancels due to emergency.</p>
              </div>
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                <div className="text-xl font-black text-blue-700 dark:text-blue-300">3–5 Days</div>
                <div className="text-xs font-semibold text-blue-900 dark:text-blue-200 mt-1">Fast Credit Reversal</div>
                <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 mt-1">Direct refund into original payment mode or bank card.</p>
              </div>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">
                1. Patient-Initiated Rescheduling
              </h2>
              <p>
                We understand unforeseen personal or professional events occur. You can easily reschedule your confirmed appointment via your Patient Portal dashboard:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li><strong>More than 2 hours before the appointment:</strong> You may choose any other available date and time slot for your doctor at no additional fee. Any advance booking fee already paid is fully transferred to your new slot.</li>
                <li><strong>Within 2 hours of the appointment:</strong> Due to physician time reserved exclusively for you and unavailability to other suffering patients, same-day late reschedules may incur a partial retention of the advance deposit.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">
                2. Patient-Initiated Cancellations
              </h2>
              <p>
                If you need to cancel your consultation completely:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li><strong>Timely Cancellations (≥ 2 hours prior):</strong> Any advance fee paid is eligible for 100% refund, or can be retained as clinic credit for your future consultation.</li>
                <li><strong>Late Cancellations (&lt; 2 hours prior) / No-Show:</strong> When a patient fails to show up without prior notice, the advance slot deposit is non-refundable as compensation for the reserved operating slot.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">
                3. Clinic or Doctor-Initiated Changes
              </h2>
              <p>
                In the rare instance that your attending doctor is called to an acute surgery, medical emergency, or sudden illness:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li>You will be notified immediately via SMS/call/email.</li>
                <li>You will be offered first priority in the next available slot or an alternative specialist.</li>
                <li>If you prefer not to reschedule, a 100% immediate full refund of any fees collected will be initiated.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">
                4. Refund Processing Timeline
              </h2>
              <p>
                Approved refunds are processed through our payment gateway within 24–48 hours and typically credit back to your original payment instrument (credit card, debit card, UPI, or net banking) in 3 to 5 business days according to your bank&apos;s settlement schedule.
              </p>
            </div>

            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Need assistance with a refund or cancellation? Contact our front-desk at {clinic?.phone || "+91 98765 43210"} or email {clinic?.email || "billing@clinic.com"}.
              </div>
              <Link
                href="/book"
                className="text-xs font-semibold px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-all shadow-sm"
              >
                Book Appointment →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
