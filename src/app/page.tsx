/* eslint-disable @next/next/no-img-element */
import React from "react";
import Link from "next/link";
import { getHomepageData, generateCmsMetadata } from "@/lib/services/cms.service";
import { PublicShell } from "@/components/layout/public-shell";
import { getDepartmentMeta } from "@/lib/utils/department";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata() {
  return generateCmsMetadata(
    "home",
    "Natural Healing & Specialized Ayurvedic Care",
    "Experience personalized medical consultations, authentic Ayurvedic therapies, and compassionate holistic care with certified healthcare specialists."
  );
}

export default async function HomePage() {
  const data = await getHomepageData();
  const { clinic, sections, services, doctors, siteSettings } = data;

  const mapEmbedUrl =
    siteSettings?.mapEmbedUrl ||
    "https://maps.google.com/maps?q=Keutia,+Bhatpara,+Kolkata+743126&t=&z=15&ie=UTF8&iwloc=&output=embed";

  const heroSection = sections.find((s) => s.sectionType === "HERO");
  const heroContent = (heroSection?.content as Record<string, string | undefined>) || {};

  const heroHeading = heroSection?.title || "Specialized Healthcare, Modern Consultations & Clinical Care";
  const heroParagraph =
    heroContent.paragraph ||
    "Experience personalized medical consultations, specialized therapies, and compassionate clinical care with certified healthcare specialists.";
  const heroImage = heroContent.imageUrl || "/hero-clinic.jpg";
  const heroCtaText = heroContent.ctaText || "Book Doctor Appointment";
  const heroCtaLink = heroContent.ctaLink || "/book";
  const heroBadge = heroContent.badgeText || "Certified Clinical Excellence";
  const isHeroVisible = heroSection?.isVisible ?? true;

  // FAQ section from CMS
  const faqSection = sections.find((s) => s.sectionType === "FAQ");
  const isFaqVisible = faqSection?.isVisible ?? true;
  const defaultFaqs = [
    {
      q: "What should I expect during my first doctor consultation?",
      a: "Our doctors conduct a comprehensive clinical assessment including pulse diagnosis (Nadi Pariksha), constitution evaluation (Prakriti analysis), and a detailed lifestyle review before prescribing treatment.",
    },
    {
      q: "Can I book both in-person and video consultations?",
      a: "Yes. Our platform provides seamless booking for in-person clinic visits as well as remote high-definition video consultations with certified doctors.",
    },
    {
      q: "What is your appointment rescheduling and cancellation policy?",
      a: "You can reschedule or cancel your appointment up to 2 hours prior to the scheduled slot directly from your patient portal without any cancellation penalty.",
    },
  ];
  const dynamicFaqs = ((faqSection?.content as Record<string, unknown>)?.items as Array<{ q: string; a: string }>) || defaultFaqs;

  // Testimonials from CMS or clinical standards
  const testimonialsSection = sections.find((s) => s.sectionType === "TESTIMONIALS");
  const isTestimonialsVisible = testimonialsSection?.isVisible ?? true;
  const defaultTestimonials = [
    {
      name: "Meera Krishnan",
      treatment: "Panchakarma Detox Therapy",
      quote:
        "The doctors here provided immense relief for my chronic arthritis. The systematic herbal therapies and compassionate clinical guidance changed my life.",
      rating: 5,
    },
    {
      name: "Rajesh Sharma",
      treatment: "Digestive & Metabolic Wellness",
      quote:
        "Outstanding medical attention. The online booking made scheduling effortless, and the doctor took ample time to listen to my concerns.",
      rating: 5,
    },
    {
      name: "Ananya Deshmukh",
      treatment: "Preventive Health & Wellness",
      quote:
        "Exceptional medical care and modern clinical hygiene. I appreciate the transparent fee structure, prompt appointments, and personalized medical attention.",
      rating: 5,
    },
  ];
  const dynamicTestimonials =
    ((testimonialsSection?.content as Record<string, unknown>)?.items as Array<{
      name: string;
      treatment: string;
      quote: string;
      rating: number;
    }>) || defaultTestimonials;

  return (
    <PublicShell>
      {/* HERO SECTION */}
      {isHeroVisible && (
        <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/50 via-slate-50 to-white dark:from-slate-900/60 dark:via-slate-950 dark:to-slate-950 py-16 sm:py-24 border-b border-slate-200/60 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 space-y-6 text-left">
                {heroBadge && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span id="public-hero-badge">{heroBadge}</span>
                  </div>
                )}

                <h1
                  id="public-hero-heading"
                  className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12]"
                >
                  {heroHeading}
                </h1>

                <p
                  id="public-hero-paragraph"
                  className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl"
                >
                  {heroParagraph}
                </p>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  <Link
                    id="public-hero-cta"
                    href={heroCtaLink}
                    className="inline-flex items-center justify-center px-7 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition transform hover:-translate-y-0.5"
                  >
                    {heroCtaText} →
                  </Link>
                  <Link
                    href="/services"
                    className="inline-flex items-center justify-center px-6 py-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                  >
                    Explore Treatments
                  </Link>
                </div>

                <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800 grid grid-cols-3 gap-4 text-center sm:text-left">
                  <div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">100%</p>
                    <p className="text-xs text-slate-500 font-medium">Verified Care</p>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">Certified</p>
                    <p className="text-xs text-slate-500 font-medium">Expert Doctors</p>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">Live Slots</p>
                    <p className="text-xs text-slate-500 font-medium">Instant Confirmation</p>
                  </div>
                </div>
              </div>

              {/* Hero Map & Clinic Location Visual */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative w-full max-w-md aspect-4/3 rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 bg-slate-100 dark:bg-slate-900 group">
                  <iframe
                    title="Doctor Plus Clinic Location - Keutia, Bhatpara, Kolkata"
                    src={mapEmbedUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-white/60 dark:bg-slate-900/95 dark:border-slate-800 shadow-xl">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span className="text-emerald-600">📍</span> {clinic.name}
                      </p>
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(clinic.address || "Keutia, Bhatpara, Kolkata 743126")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                      >
                        Directions ↗
                      </a>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate mt-0.5 font-medium">
                      {clinic.address || "Keutia, Bhatpara, Kolkata 743126"}
                    </p>
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <span>✓ OPD Consultations Open</span>
                      <Link href="/book" className="hover:underline">
                        Book Today →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SERVICES PREVIEW */}
      <section id="services" className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-4">
            <div>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                Comprehensive Care
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight">
                Authentic Clinical Services
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xl">
                Evidence-informed holistic treatments, specialized therapies, and personalized healthcare programs.
              </p>
            </div>
            <Link
              href="/services"
              className="text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1 group self-start md:self-auto"
            >
              <span>View All Services</span>
              <span className="group-hover:translate-x-1 transition">→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((srv) => {
              const dept = getDepartmentMeta(srv.name);

              return (
              <div
                key={srv.id}
                className="group relative rounded-3xl border border-slate-200/80 bg-slate-50/50 p-7 shadow-xs hover:shadow-xl transition-all duration-300 dark:bg-slate-800/40 dark:border-slate-800 flex flex-col justify-between hover:-translate-y-1 hover:border-emerald-500/50"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className={`h-12 w-12 rounded-2xl bg-gradient-to-tr ${dept.gradient} flex items-center justify-center text-2xl text-white shadow-md group-hover:scale-110 transition`}>
                      {dept.icon}
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${dept.badgeClass}`}>
                      {dept.department}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition">
                    {srv.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed line-clamp-3">
                    {srv.shortDescription || srv.description || "Comprehensive clinical consultation with personalized therapeutic prescription."}
                  </p>
                </div>

                <div className="mt-6 pt-5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Fee</span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">
                      ₹{Number(srv.fee).toFixed(0)}
                    </span>
                  </div>
                  <Link
                    href={`/services/${srv.slug}`}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* DOCTORS PREVIEW */}
      <section id="doctors" className="py-20 bg-slate-50 dark:bg-slate-950 border-t border-slate-200/60 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-4">
            <div>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                Clinical Faculty
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight">
                Meet Our Certified Doctors
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xl">
                Qualified medical doctors with specialized postgraduate qualifications and clinical experience.
              </p>
            </div>
            <Link
              href="/doctors"
              className="text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1 group self-start md:self-auto"
            >
              <span>View All Doctors</span>
              <span className="group-hover:translate-x-1 transition">→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {doctors.map((doc) => (
              <div
                key={doc.id}
                className="rounded-3xl border border-slate-200/80 bg-white p-7 shadow-xs hover:shadow-xl transition-all duration-300 dark:bg-slate-900 dark:border-slate-800 flex flex-col justify-between hover:-translate-y-1"
              >
                <div>
                  <div className="h-28 w-28 mx-auto mb-5 rounded-2xl bg-emerald-50 dark:bg-slate-800 overflow-hidden border-2 border-emerald-500/30 flex items-center justify-center">
                    {doc.profilePhotoUrl ? (
                      <img src={doc.profilePhotoUrl} alt={doc.user?.fullName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">Dr</span>
                    )}
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {doc.user?.fullName}
                    </h3>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                      {doc.specialization}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{doc.qualification}</p>
                    {doc.experienceYears > 0 && (
                      <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {doc.experienceYears}+ Years Experience
                      </span>
                    )}
                  </div>

                  {doc.bio && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-4 line-clamp-3 text-center leading-relaxed">
                      {doc.bio}
                    </p>
                  )}
                </div>

                <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Consultation</span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">
                      ₹{Number(doc.consultationFee).toFixed(0)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/doctors/${doc.id}`}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                    >
                      Profile
                    </Link>
                    <Link
                      href={`/book?doctorId=${doc.id}`}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                    >
                      Book
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      {isTestimonialsVisible && (
        <section className="py-20 bg-white dark:bg-slate-900 border-t border-slate-200/60 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                Patient Experiences
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight">
                What Our Patients Say
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Real reviews from patients who experienced healing under our specialized medical care.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {dynamicTestimonials.map((t, i) => (
                <div
                  key={i}
                  className="rounded-3xl border border-slate-200/80 bg-slate-50/50 p-8 shadow-xs dark:bg-slate-800/40 dark:border-slate-800 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center text-amber-400 text-sm mb-4">
                      {"★".repeat(t.rating || 5)}
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                  </div>
                  <div className="mt-6 pt-5 border-t border-slate-200/60 dark:border-slate-700/60">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{t.name}</h4>
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{t.treatment}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Link
                href="/testimonials"
                className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <span>Read more patient stories</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* FAQ SECTION */}
      {isFaqVisible && (
        <section className="py-20 bg-slate-50 dark:bg-slate-950 border-t border-slate-200/60 dark:border-slate-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                Got Questions?
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight">
                Frequently Asked Questions
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Everything you need to know about booking, consultations, and our clinical practices.
              </p>
            </div>

            <div className="space-y-4">
              {dynamicFaqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs"
                >
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center justify-between">
                    <span>{faq.q}</span>
                    <span className="text-emerald-600 text-lg">?</span>
                  </h3>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/faq"
                className="inline-flex px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-xs transition"
              >
                Browse Complete Knowledgebase & FAQs →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA STRIP */}
      <section className="py-16 bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Begin Your Healing Journey?
          </h2>
          <p className="text-emerald-100 max-w-2xl mx-auto text-base leading-relaxed">
            Select your preferred specialist and choose an in-person or virtual consultation slot that suits your schedule.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-4">
            <Link
              href="/book"
              className="px-8 py-4 rounded-xl bg-white text-emerald-900 font-extrabold text-sm shadow-xl hover:bg-emerald-50 transition transform hover:-translate-y-0.5"
            >
              📅 Book Appointment Now
            </Link>
            <Link
              href="/contact"
              className="px-8 py-4 rounded-xl bg-emerald-800/80 hover:bg-emerald-800 text-white font-bold text-sm border border-emerald-500/50 transition"
            >
              Contact Clinic
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
