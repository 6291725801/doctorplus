import React from "react";
import { prisma } from "@/lib/db";
import { PublicShell } from "@/components/layout/public-shell";
import { generateCmsMetadata } from "@/lib/services/cms.service";
import { ContactForm } from "@/components/public/contact-form";
import Link from "next/link";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return generateCmsMetadata(
    "contact",
    "Contact & Clinic Location",
    "Reach out to our healthcare front-desk, emergency team, or schedule your clinical visit. Find directions, phone numbers, and WhatsApp links."
  );
}

export default async function ContactPage() {
  const clinic = await prisma.clinic.findFirst({
    where: { isActive: true },
    include: { siteSettings: true, settings: true },
  });

  const phone = clinic?.siteSettings?.contactPhone || clinic?.phone || "+91 98765 43210";
  const email = clinic?.siteSettings?.contactEmail || clinic?.email || "helpdesk@clinic.com";
  const address = clinic?.siteSettings?.address || clinic?.address || "108 Wellness Boulevard, Medical Enclave\nBengaluru, Karnataka 560001";
  const emergencyPhone = clinic?.phone || "+91 99999 00000";
  const whatsappNumber = clinic?.siteSettings?.whatsappNumber;
  const mapEmbedUrl = clinic?.siteSettings?.mapEmbedUrl;
  const openingHours = clinic?.settings
    ? `Monday – Saturday: ${clinic.settings.openingTime} – ${clinic.settings.closingTime}\nSunday: Emergency & Acute Consultations`
    : "Monday – Saturday: 08:00 AM – 08:00 PM\nSunday: 09:00 AM – 02:00 PM (Emergency Desk 24/7)";

  return (
    <PublicShell>
      <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-teal-500/10 via-emerald-500/5 to-transparent border-b border-slate-200 dark:border-slate-800 py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              Healthcare Helpline & Front Desk
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              We Are Here for Your Care
            </h1>
            <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 dark:text-slate-400">
              Get in touch with {clinic?.name || "our clinical team"}, visit our medical premises, or book an appointment online in seconds.
            </p>
          </div>
        </section>

        {/* Content Section */}
        <section className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* Left: Contact Info & Emergency Desk */}
            <div className="lg:col-span-5 space-y-6">
              {/* Emergency Banner */}
              <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-2xl p-6 text-rose-950 dark:text-rose-200">
                <div className="flex items-center gap-2 font-bold text-base mb-1 text-rose-700 dark:text-rose-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                  Medical Emergency Assistance
                </div>
                <p className="text-xs text-rose-800 dark:text-rose-300 mb-3">
                  For critical or life-threatening symptoms, immediately dial emergency services or call our acute desk:
                </p>
                <div className="text-lg font-black text-rose-700 dark:text-rose-400">
                  {emergencyPhone}
                </div>
              </div>

              {/* Main Contact Details */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Direct Contact Points</h3>
                  <div className="space-y-4 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">Phone Inquiries</div>
                        <a href={`tel:${phone}`} className="text-slate-600 dark:text-slate-400 hover:text-teal-600">
                          {phone}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">Email Communications</div>
                        <a href={`mailto:${email}`} className="text-slate-600 dark:text-slate-400 hover:text-teal-600">
                          {email}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">Clinic Address</div>
                        <p className="text-slate-600 dark:text-slate-400 whitespace-pre-line">
                          {address}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Operating Hours</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">
                    {openingHours}
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/book"
                    className="flex-1 text-center py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition-all"
                  >
                    Book Consultation
                  </Link>
                  {whatsappNumber && (
                    <a
                      href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all"
                    >
                      WhatsApp Care Desk
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Contact Form */}
            <div className="lg:col-span-7">
              <ContactForm />
            </div>
          </div>

          {/* Interactive Google Maps Embed if configured by Admin */}
          {mapEmbedUrl && (
            <div className="mt-12 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
              <div className="bg-slate-100 dark:bg-slate-900 px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span>📍</span> Clinic Physical Location & Directions
                </span>
                <span className="text-xs text-slate-500">Live Google Maps</span>
              </div>
              <div className="aspect-21/9 w-full min-h-[350px]">
                <iframe
                  src={mapEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0, minHeight: "350px" }}
                  allowFullScreen={false}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Clinic Physical Location"
                />
              </div>
            </div>
          )}
        </section>
      </div>
    </PublicShell>
  );
}
