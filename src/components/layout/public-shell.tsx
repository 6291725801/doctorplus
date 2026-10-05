import React from "react";
import { getSiteSettings, getActiveClinic } from "@/lib/services/cms.service";
import { getSession } from "@/lib/auth/session";
import { DynamicThemeStyles } from "@/components/theme-provider";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

interface PublicShellProps {
  children: React.ReactNode;
}

export async function PublicShell({ children }: PublicShellProps) {
  const [clinic, siteSettings, session] = await Promise.all([
    getActiveClinic().catch(() => null),
    getSiteSettings().catch(() => null),
    getSession().catch(() => null),
  ]);

  const clinicName = siteSettings?.siteTitle || clinic?.name || "Doctor Plus";
  const tagline = siteSettings?.tagline || "Doctor & Specialized Medical Clinic";
  const logoUrl = siteSettings?.logoUrl || "/doctor-plus-icon.svg";
  const phone = siteSettings?.contactPhone || clinic?.phone || "+91 98765 43210";
  const email = siteSettings?.contactEmail || clinic?.email || "care@doctorplus.com";
  const address = siteSettings?.address || clinic?.address || "Keutia, Bhatpara, Kolkata, West Bengal 743126";
  const whatsappNumber = siteSettings?.whatsappNumber || "+919876543210";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-white">
      {/* Dynamic database-backed theme colors */}
      <DynamicThemeStyles
        colors={{
          primaryColor: siteSettings?.primaryColor,
          secondaryColor: siteSettings?.secondaryColor,
          accentColor: siteSettings?.accentColor,
        }}
      />

      {/* Global Public Header */}
      <PublicHeader
        clinicName={clinicName}
        tagline={tagline}
        logoUrl={logoUrl}
        phone={phone}
        email={email}
        whatsappNumber={whatsappNumber}
        session={session}
      />

      {/* Page Content */}
      <main className="flex-1 flex flex-col">{children}</main>

      {/* Global Public Footer */}
      <PublicFooter
        clinicName={clinicName}
        tagline={tagline}
        logoUrl={logoUrl}
        phone={phone}
        email={email}
        address={address}
        whatsappNumber={whatsappNumber}
        socialFacebook={siteSettings?.socialFacebook}
        socialInstagram={siteSettings?.socialInstagram}
        socialTwitter={siteSettings?.socialTwitter}
        socialYoutube={siteSettings?.socialYoutube}
        socialLinkedin={siteSettings?.socialLinkedin}
      />
    </div>
  );
}
