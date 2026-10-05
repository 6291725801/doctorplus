/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

interface PublicHeaderProps {
  clinicName?: string;
  tagline?: string;
  logoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  whatsappNumber?: string | null;
  session?: {
    userId: string;
    role: string;
    fullName?: string;
  } | null;
}

export function PublicHeader({
  clinicName = "Doctor Plus",
  tagline = "Advanced Healthcare & Specialized Clinical Services",
  logoUrl = "/doctor-plus-icon.svg",
  phone = "+91 98765 43210",
  email = "care@doctorplus.com",
  whatsappNumber = "+919876543210",
  session,
}: PublicHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Services", href: "/services" },
    { name: "Doctors", href: "/doctors" },
    { name: "About Us", href: "/about" },
    { name: "FAQ", href: "/faq" },
    { name: "Testimonials", href: "/testimonials" },
    { name: "Contact", href: "/contact" },
  ];

  // Desktop navigation: exclude Testimonials and FAQ per client specifications
  const desktopNavLinks = navLinks.filter(
    (link) => link.name !== "Testimonials" && link.name !== "FAQ"
  );

  const getDashboardLink = () => {
    if (!session) return "/login";
    switch (session.role) {
      case "SUPER_ADMIN":
      case "CLINIC_ADMIN":
        return "/dashboard/admin";
      case "DOCTOR":
        return "/dashboard/doctor";
      case "RECEPTIONIST":
        return "/dashboard/receptionist";
      case "PATIENT":
      default:
        return "/dashboard/patient";
    }
  };

  return (
    <>
      {/* Top Utility Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4 sm:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center space-x-4">
            {phone && (
              <a href={`tel:${phone}`} className="hover:text-emerald-400 transition flex items-center gap-1.5">
                <span>📞</span>
                <span>{phone}</span>
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="hover:text-emerald-400 transition hidden md:flex items-center gap-1.5">
                <span>✉️</span>
                <span>{email}</span>
              </a>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}?text=Hello%2C%20I%20would%20like%20to%20inquire%20about%20a%20consultation.`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1.5 transition"
              >
                <span>💬</span>
                <span>WhatsApp Care Desk</span>
              </a>
            )}
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-slate-400 hidden sm:inline">Timings: Mon - Sat (09:00 - 20:00)</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 dark:bg-slate-900/95 dark:border-slate-800 transition">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Clinic Branding */}
          <Link href="/" className="flex items-center space-x-3 group">
            {logoUrl && !logoError ? (
              <img
                src={logoUrl}
                alt={clinicName}
                onError={() => setLogoError(true)}
                className="h-11 w-auto max-w-[180px] rounded-xl object-contain border border-slate-200 dark:border-slate-800 shadow-sm"
              />
            ) : (
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-extrabold shadow-md group-hover:scale-105 transition">
                <span className="text-white text-base font-black tracking-tight flex items-center">
                  D<span className="text-emerald-300 font-black text-lg leading-none">+</span>
                </span>
              </div>
            )}
            <div>
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white block group-hover:text-emerald-600 transition">
                {clinicName.replace(/[-—].*$/g, "").trim() || "Doctor Plus"}
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-wide line-clamp-1">
                Doctor & Specialized Medical Clinic
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links (Testimonials & FAQ removed on desktop) */}
          <nav className="hidden lg:flex items-center space-x-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            {desktopNavLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition py-1 border-b-2 ${
                    isActive
                      ? "text-emerald-600 dark:text-emerald-400 border-emerald-600 font-semibold"
                      : "border-transparent hover:text-emerald-600 dark:hover:text-emerald-400"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center space-x-3">
            {session ? (
              <div className="flex items-center space-x-2">
                <Link href={getDashboardLink()}>
                  <Button variant="outline" size="sm" className="font-semibold rounded-xl text-xs">
                    {session.role === "PATIENT" ? "👤 Patient Portal" : "⚙️ Dashboard"}
                  </Button>
                </Link>
                <form action="/api/auth/logout" method="POST">
                  <Button type="submit" variant="ghost" size="sm" className="text-xs text-slate-500 hover:text-red-600">
                    Logout
                  </Button>
                </form>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-xs font-semibold">
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button variant="outline" size="sm" className="text-xs font-semibold rounded-xl">
                    Register
                  </Button>
                </Link>
              </div>
            )}

            <Link href="/book">
              <Button
                variant="primary"
                size="sm"
                className="font-bold text-xs shadow-md shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
              >
                📅 Book Appointment
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Hamburger Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <Link href="/book">
              <Button
                variant="primary"
                size="sm"
                className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold"
              >
                Book
              </Button>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? (
                <span className="text-2xl leading-none">✕</span>
              ) : (
                <span className="text-2xl leading-none">☰</span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-6 space-y-3 shadow-xl">
            <nav className="flex flex-col space-y-2">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
              {session ? (
                <>
                  <Link
                    href={getDashboardLink()}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2 px-4 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {session.role === "PATIENT" ? "👤 Patient Portal Dashboard" : "⚙️ Clinic Dashboard"}
                  </Link>
                  <form action="/api/auth/logout" method="POST" className="w-full">
                    <Button type="submit" variant="ghost" size="sm" className="w-full text-red-600 text-xs">
                      Log Out
                    </Button>
                  </form>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full text-xs font-semibold">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full text-xs font-semibold">
                      Register
                    </Button>
                  </Link>
                </div>
              )}

              <Link href="/book" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="primary" size="md" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md">
                  📅 Book Doctor Appointment
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
