/* eslint-disable @next/next/no-img-element */
import React from "react";
import Link from "next/link";

interface PublicFooterProps {
  clinicName?: string;
  tagline?: string;
  logoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  whatsappNumber?: string | null;
  socialFacebook?: string | null;
  socialInstagram?: string | null;
  socialTwitter?: string | null;
  socialYoutube?: string | null;
  socialLinkedin?: string | null;
}

export function PublicFooter({
  clinicName = "Doctor Plus",
  tagline = "Advanced medical care, specialized clinical therapies, and compassionate patient support.",
  logoUrl = "/doctor-plus-icon.svg",
  phone = "+91 98765 43210",
  email = "care@doctorplus.com",
  address = "Keutia, Bhatpara, Kolkata, West Bengal 743126",
  whatsappNumber = "+919876543210",
  socialFacebook,
  socialInstagram,
  socialTwitter,
  socialYoutube,
  socialLinkedin,
}: PublicFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-900 mt-auto">
      {/* Upper Footer CTA Strip */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/70 border-b border-slate-800/80 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <span className="text-emerald-400 font-bold text-xs uppercase tracking-widest block mb-1">
              Need personalized medical guidance?
            </span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Consult with verified Ayurvedic & clinical specialists
            </h3>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Book your comprehensive in-person or video consultation with flexible appointment times and certified practitioners.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/book"
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition transform hover:-translate-y-0.5"
            >
              📅 Book Appointment Now
            </Link>
            {whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-semibold text-sm border border-slate-700 transition"
              >
                💬 WhatsApp Inquiries
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Main 4-Column Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Col 1 & 2: Clinic Overview */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center space-x-3 group">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={clinicName}
                  className="h-10 w-auto rounded-lg object-contain bg-white p-1"
                />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-bold text-lg shadow">
                  <span className="text-white font-black">D+</span>
                </div>
              )}
              <span className="font-extrabold text-xl text-white tracking-tight group-hover:text-emerald-400 transition">
                {clinicName.replace(/[-—].*$/g, "").trim() || "Doctor Plus"}
              </span>
            </Link>

            <p className="text-sm leading-relaxed text-slate-400 max-w-sm">
              {tagline}
            </p>

            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs font-medium">
                <span>🛡️</span>
                <span>Certified Clinical Excellence & Patient Care</span>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="flex items-center space-x-3 pt-3">
              {socialFacebook && (
                <a href={socialFacebook} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition" aria-label="Facebook">
                  f
                </a>
              )}
              {socialInstagram && (
                <a href={socialInstagram} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition" aria-label="Instagram">
                  📸
                </a>
              )}
              {socialTwitter && (
                <a href={socialTwitter} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition" aria-label="Twitter">
                  𝕏
                </a>
              )}
              {socialYoutube && (
                <a href={socialYoutube} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition" aria-label="YouTube">
                  ▶
                </a>
              )}
              {socialLinkedin && (
                <a href={socialLinkedin} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition" aria-label="LinkedIn">
                  in
                </a>
              )}
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Public Navigation</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-emerald-400 transition">Home</Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-emerald-400 transition">Clinical Services</Link>
              </li>
              <li>
                <Link href="/doctors" className="hover:text-emerald-400 transition">Doctors & Specialists</Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-emerald-400 transition">About Our Clinic</Link>
              </li>
              <li>
                <Link href="/testimonials" className="hover:text-emerald-400 transition">Patient Testimonials</Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-emerald-400 transition">Frequently Asked Questions</Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-emerald-400 transition">Contact & Location</Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Patient Care */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Patient Portal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/book" className="text-emerald-400 font-semibold hover:text-emerald-300 transition">Book Appointment</Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-emerald-400 transition">Patient Login</Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-emerald-400 transition">Create Account</Link>
              </li>
              <li>
                <Link href="/dashboard/patient" className="hover:text-emerald-400 transition">My Appointments</Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-emerald-400 transition">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-emerald-400 transition">Terms of Service</Link>
              </li>
              <li>
                <Link href="/cancellation-policy" className="hover:text-emerald-400 transition">Cancellation & Refunds</Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact & Hours */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Clinic & Contact</h4>
            <div className="space-y-2.5 text-xs">
              <p className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">📍</span>
                <span>{address}</span>
              </p>
              {phone && (
                <p className="flex items-center gap-2">
                  <span className="text-emerald-400">📞</span>
                  <a href={`tel:${phone}`} className="hover:text-emerald-400 transition font-medium">{phone}</a>
                </p>
              )}
              {email && (
                <p className="flex items-center gap-2">
                  <span className="text-emerald-400">✉️</span>
                  <a href={`mailto:${email}`} className="hover:text-emerald-400 transition font-medium">{email}</a>
                </p>
              )}
              <div className="pt-2 border-t border-slate-900">
                <span className="text-slate-400 block font-semibold mb-1">Consultation Hours:</span>
                <p className="text-slate-300">Mon - Sat: 09:00 AM - 08:00 PM</p>
                <p className="text-slate-500">Sunday: Closed / Emergency Prior Notice</p>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Notice Alert */}
        <div className="mt-12 p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 flex items-start sm:items-center gap-3">
          <span className="text-amber-400 text-base flex-shrink-0">⚠️</span>
          <span>
            <strong className="text-slate-200">Emergency Medical Disclaimer:</strong> This portal manages elective outpatient consultations. In case of an acute life-threatening medical emergency, please dial emergency emergency numbers or visit your nearest emergency room immediately.
          </span>
        </div>

        {/* Bottom Copyright & Legal Links */}
        <div className="mt-8 pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {currentYear} {clinicName}. All rights reserved. Designed for healthcare excellence.</p>
          <div className="flex items-center space-x-6">
            <Link href="/privacy" className="hover:text-slate-300 transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-300 transition">Terms & Conditions</Link>
            <Link href="/cancellation-policy" className="hover:text-slate-300 transition">Refunds & Cancellations</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
