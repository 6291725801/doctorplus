import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { getSiteSettings } from "@/lib/services/cms.service";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getSiteSettings();
    const title = settings?.siteTitle || "Doctor Plus";
    const description =
      settings?.metaDescription ||
      settings?.tagline ||
      "Professional medical care, advanced therapies, and verified doctor consultations.";
    const favicon = settings?.faviconUrl || "/doctor-plus-icon.svg";
    const ogImage = settings?.logoUrl || "/doctor-plus-logo.svg";

    return {
      title: {
        default: title,
        template: `%s | ${title}`,
      },
      description,
      icons: {
        icon: favicon,
        apple: favicon,
      },
      openGraph: {
        title,
        description,
        images: [{ url: ogImage }],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImage],
      },
    };
  } catch {
    return {
      title: "Doctor Plus",
      description: "Professional medical and doctor consultation clinic",
    };
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
