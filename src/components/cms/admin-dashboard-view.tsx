/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MediaPickerModal } from "@/components/cms/media-picker-modal";
import {
  DoctorScheduleManager,
  ScheduleItem,
  LeaveItem,
  BlockedSlotItem,
} from "@/components/doctor/doctor-schedule-manager";
import { AdminPaymentsView } from "@/components/admin/admin-payments-view";
import { AdminPatientsView, AdminPatientItem } from "@/components/admin/admin-patients-view";
import { AdminReportsView } from "@/components/admin/admin-reports-view";
import { AdminSchedulesView } from "@/components/admin/admin-schedules-view";
import { AppointmentDeskView, AppointmentItem } from "@/components/appointments/appointment-desk-view";
import { AdminNotificationsView } from "@/components/cms/admin-notifications-view";

export interface AdminDashboardClinic {
  id: string;
  name: string;
  slug?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface AdminDashboardSiteSettings {
  id?: string;
  siteTitle?: string | null;
  tagline?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  whatsappNumber?: string | null;
  address?: string | null;
  mapEmbedUrl?: string | null;
  socialFacebook?: string | null;
  socialInstagram?: string | null;
  socialTwitter?: string | null;
  socialYoutube?: string | null;
  socialLinkedin?: string | null;
  metaDescription?: string | null;
  customCss?: string | null;
  headerConfig?: unknown;
  footerConfig?: unknown;
}

export interface AdminDashboardSection {
  id: string;
  sectionType: string;
  title?: string | null;
  subtitle?: string | null;
  content: unknown;
  isVisible: boolean;
  sortOrder: number;
}

export interface AdminDashboardService {
  id: string;
  name: string;
  slug: string;
  fee: number | string | unknown;
  durationMinutes: number;
  shortDescription?: string | null;
  description?: string | null;
  isActive: boolean;
}

export interface AdminDashboardDoctor {
  id: string;
  specialization: string;
  qualification: string;
  experienceYears?: number;
  registrationNumber?: string | null;
  languages?: string | null;
  appointmentDurationMinutes?: number;
  maxDailyAppointments?: number | null;
  roomNumber?: string | null;
  clinicLocation?: string | null;
  consultationFee: number | string | unknown;
  advanceBookingFee?: number | string | unknown;
  bio?: string | null;
  profilePhotoUrl?: string | null;
  isActive?: boolean;
  isAvailableForBooking?: boolean;
  clinic?: {
    id: string;
    name: string;
  } | null;
  user?: {
    id?: string;
    fullName: string;
    email: string;
    phone?: string | null;
    isActive?: boolean;
  } | null;
  services?: Array<{ service: { id: string; name: string } }>;
  schedules?: ScheduleItem[];
  leaves?: LeaveItem[];
  blockedSlots?: BlockedSlotItem[];
}

export interface AdminDashboardHoliday {
  id: string;
  clinicId?: string;
  date: string;
  title: string;
  description?: string | null;
}

interface AdminDashboardViewProps {
  initialData: {
    clinic: AdminDashboardClinic;
    siteSettings: AdminDashboardSiteSettings | null;
    clinicSettings?: Record<string, unknown> | null;
    sections: AdminDashboardSection[];
    services: AdminDashboardService[];
    doctors: AdminDashboardDoctor[];
    holidays?: AdminDashboardHoliday[];
    patients?: AdminPatientItem[];
    appointments?: AppointmentItem[];
  };
  userRole?: string;
}

export function AdminDashboardView({ initialData, userRole = "CLINIC_ADMIN" }: AdminDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<
    "doctors" | "patients" | "appointments" | "schedules" | "services" | "payments" | "reports" | "cms" | "notifications"
  >("doctors");
  const [cmsSubTab, setCmsSubTab] = useState<
    "homepage" | "about" | "testimonials" | "faq" | "header_footer" | "theme" | "clinic" | "rules_fees" | "media" | "seo"
  >("homepage");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Media Picker state
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaTargetField, setMediaTargetField] = useState<string | null>(null);

  // 1. Homepage Hero state
  const heroSection = initialData.sections.find((s) => s.sectionType === "HERO");
  const heroContent = (heroSection?.content as Record<string, string | undefined>) || {};

  const [heroHeading, setHeroHeading] = useState<string>(
    heroSection?.title || "Specialized Healthcare, Modern Consultations & Clinical Care"
  );
  const [heroParagraph, setHeroParagraph] = useState<string>(
    heroContent.paragraph ||
      "Experience personalized medical consultations, specialized clinical therapies, and compassionate care with certified healthcare specialists."
  );
  const [heroImage, setHeroImage] = useState<string>(
    heroContent.imageUrl || "/hero-clinic.jpg"
  );
  const [heroCtaText, setHeroCtaText] = useState<string>(
    heroContent.ctaText || "Book Doctor Appointment"
  );
  const [heroCtaLink, setHeroCtaLink] = useState<string>(
    heroContent.ctaLink || "/signup"
  );
  const [heroBadgeText, setHeroBadgeText] = useState<string>(
    heroContent.badgeText || "Certified Clinical Excellence"
  );

  // Section visibility states
  const [sectionVisibility, setSectionVisibility] = useState<Record<string, boolean>>({
    HERO: heroSection?.isVisible ?? true,
    ABOUT: initialData.sections.find((s) => s.sectionType === "ABOUT")?.isVisible ?? true,
    SERVICES: initialData.sections.find((s) => s.sectionType === "SERVICES")?.isVisible ?? true,
    DOCTORS: initialData.sections.find((s) => s.sectionType === "DOCTORS")?.isVisible ?? true,
    TESTIMONIALS: initialData.sections.find((s) => s.sectionType === "TESTIMONIALS")?.isVisible ?? true,
    FAQ: initialData.sections.find((s) => s.sectionType === "FAQ")?.isVisible ?? true,
    CTA: initialData.sections.find((s) => s.sectionType === "CTA")?.isVisible ?? true,
  });

  // 1b. About Section state
  const aboutSection = initialData.sections.find((s) => s.sectionType === "ABOUT");
  const aboutContent = (aboutSection?.content as Record<string, string | undefined>) || {};
  const [aboutTitle, setAboutTitle] = useState(
    aboutSection?.title || "Restoring Equilibrium Through Root-Cause Healing"
  );
  const [aboutSubtitle, setAboutSubtitle] = useState(
    aboutSection?.subtitle ||
      "Bridging timeless Ayurvedic wisdom with contemporary clinical excellence, personalized patient care, and evidence-informed therapies."
  );
  const [aboutParagraph, setAboutParagraph] = useState(
    aboutContent.paragraph ||
      `At ${initialData.clinic?.name || "our clinic"}, we believe true healthcare is proactive, personalized, and restorative.`
  );
  const [aboutImage, setAboutImage] = useState(aboutContent.imageUrl || "/hero-clinic.jpg");
  const [aboutYears, setAboutYears] = useState(aboutContent.yearsExperience || "12+ Years");

  // 1c. Testimonials state
  const testimonialsSection = initialData.sections.find((s) => s.sectionType === "TESTIMONIALS");
  const initialTestimonials =
    ((testimonialsSection?.content as Record<string, unknown>)?.items as Array<{
      name: string;
      treatment: string;
      quote: string;
      rating: number;
    }>) || [
      {
        name: "Meera Krishnan",
        treatment: "Panchakarma Detox Therapy",
        quote: "The doctors here provided immense relief for my chronic arthritis. The systematic herbal therapies and compassionate clinical guidance changed my life.",
        rating: 5,
      },
      {
        name: "Rajesh Sharma",
        treatment: "Digestive & Metabolic Wellness",
        quote: "Outstanding medical attention. The online booking made scheduling effortless, and the doctor took ample time to listen to my concerns.",
        rating: 5,
      },
      {
        name: "Ananya Deshmukh",
        treatment: "Preventive Health & Wellness",
        quote: "Exceptional clinical care and modern hygiene. I appreciate the transparent fee structure, prompt appointments, and personalized medical attention.",
        rating: 5,
      },
    ];
  const [testimonialsList, setTestimonialsList] = useState(initialTestimonials);
  const [newTestimonialName, setNewTestimonialName] = useState("");
  const [newTestimonialTreatment, setNewTestimonialTreatment] = useState("");
  const [newTestimonialQuote, setNewTestimonialQuote] = useState("");
  const [newTestimonialRating, setNewTestimonialRating] = useState(5);

  // 1d. FAQ state
  const faqSection = initialData.sections.find((s) => s.sectionType === "FAQ");
  const initialFaqs =
    ((faqSection?.content as Record<string, unknown>)?.items as Array<{ q: string; a: string }>) || [
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
  const [faqsList, setFaqsList] = useState(initialFaqs);
  const [newFaqQ, setNewFaqQ] = useState("");
  const [newFaqA, setNewFaqA] = useState("");

  // 1e. Header & Footer state
  const headerConf = (initialData.siteSettings?.headerConfig as Record<string, unknown>) || {};
  const footerConf = (initialData.siteSettings?.footerConfig as Record<string, unknown>) || {};
  const [headerAnnouncement, setHeaderAnnouncement] = useState(
    (headerConf.announcement as string) || "✨ Welcoming new patients. Book online consultation with verified specialists."
  );
  const [showTopBanner, setShowTopBanner] = useState((headerConf.showTopBanner as boolean) ?? true);
  const [footerCopyright, setFooterCopyright] = useState(
    (footerConf.copyright as string) || "All rights reserved. Certified Healthcare & Ayurvedic Excellence."
  );
  const [footerDisclaimer, setFooterDisclaimer] = useState(
    (footerConf.disclaimer as string) ||
      "Medical Disclaimer: The information provided on this website is for educational and healthcare facilitation purposes and should not be substituted for direct acute emergency care."
  );

  // 1f. Rules & Fees (Clinic Settings) state
  const cSettings = initialData.clinicSettings as Record<string, unknown> | null;
  const [openingTime, setOpeningTime] = useState((cSettings?.openingTime as string) || "09:00");
  const [closingTime, setClosingTime] = useState((cSettings?.closingTime as string) || "20:00");
  const [slotDuration, setSlotDuration] = useState(Number(cSettings?.defaultSlotDurationMinutes || 15));
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(Number(cSettings?.maxAdvanceBookingDays || 30));
  const [cancellationHours, setCancellationHours] = useState(Number(cSettings?.cancellationCutoffHours || 2));
  const [minAdvance, setMinAdvance] = useState(Number(cSettings?.minAdvanceAmount || 100));
  const [enableOnlinePay, setEnableOnlinePay] = useState((cSettings?.enableOnlinePayment as boolean) ?? true);

  // 2. Theme & Branding state
  const [primaryColor, setPrimaryColor] = useState<string>(
    initialData.siteSettings?.primaryColor || "#0D9488"
  );
  const [secondaryColor, setSecondaryColor] = useState<string>(
    initialData.siteSettings?.secondaryColor || "#0F766E"
  );
  const [accentColor, setAccentColor] = useState<string>(
    initialData.siteSettings?.accentColor || "#F59E0B"
  );
  const [logoUrl, setLogoUrl] = useState<string>(initialData.siteSettings?.logoUrl || "");
  const [faviconUrl, setFaviconUrl] = useState<string>(initialData.siteSettings?.faviconUrl || "");
  const [ogImageUrl, setOgImageUrl] = useState<string>(initialData.siteSettings?.logoUrl || "/hero-clinic.jpg");

  // 3. Clinic Profile & Contacts
  const [clinicName, setClinicName] = useState<string>(initialData.clinic?.name || "");
  const [siteTitle, setSiteTitle] = useState<string>(initialData.siteSettings?.siteTitle || "");
  const [tagline, setTagline] = useState<string>(initialData.siteSettings?.tagline || "");
  const [phone, setPhone] = useState<string>(initialData.siteSettings?.contactPhone || "");
  const [whatsapp, setWhatsapp] = useState<string>(initialData.siteSettings?.whatsappNumber || "");
  const [email, setEmail] = useState<string>(initialData.siteSettings?.contactEmail || "");
  const [address, setAddress] = useState<string>(initialData.siteSettings?.address || "");
  const [mapEmbedUrl, setMapEmbedUrl] = useState<string>(initialData.siteSettings?.mapEmbedUrl || "");

  // 4. Social Links
  const [socialFacebook, setSocialFacebook] = useState<string>(initialData.siteSettings?.socialFacebook || "");
  const [socialInstagram, setSocialInstagram] = useState<string>(initialData.siteSettings?.socialInstagram || "");
  const [socialTwitter, setSocialTwitter] = useState<string>(initialData.siteSettings?.socialTwitter || "");
  const [socialYoutube, setSocialYoutube] = useState<string>(initialData.siteSettings?.socialYoutube || "");
  const [socialLinkedin, setSocialLinkedin] = useState<string>(initialData.siteSettings?.socialLinkedin || "");

  // 5. SEO
  const [metaDescription, setMetaDescription] = useState<string>(
    initialData.siteSettings?.metaDescription || ""
  );

  // 6. Services State
  const [servicesList, setServicesList] = useState<AdminDashboardService[]>(initialData.services || []);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceSlug, setNewServiceSlug] = useState("");
  const [newServiceFee, setNewServiceFee] = useState("500");
  const [newServiceDuration, setNewServiceDuration] = useState("30");
  const [newServiceDesc, setNewServiceDesc] = useState("");

  // 7. Doctors State
  const [doctorsList, setDoctorsList] = useState<AdminDashboardDoctor[]>(initialData.doctors || []);
  const [selectedScheduleDoctor, setSelectedScheduleDoctor] = useState<AdminDashboardDoctor | null>(null);
  const [addDoctorModalOpen, setAddDoctorModalOpen] = useState(false);
  const [editDoctorModalDoc, setEditDoctorModalDoc] = useState<AdminDashboardDoctor | null>(null);

  // New Doctor Form State
  const [docFullName, setDocFullName] = useState("");
  const [docEmail, setDocEmail] = useState("");
  const [docPhone, setDocPhone] = useState("");
  const [docPassword, setDocPassword] = useState("DoctorPass#2026");
  const [docSpecialization, setDocSpecialization] = useState("");
  const [docQualification, setDocQualification] = useState("");
  const [docExperience, setDocExperience] = useState("5");
  const [docRegNo, setDocRegNo] = useState("");
  const [docLanguages, setDocLanguages] = useState("English, Hindi");
  const [docFee, setDocFee] = useState("500");
  const [docAdvanceFee, setDocAdvanceFee] = useState("100");
  const [docDuration, setDocDuration] = useState("15");
  const [docRoom, setDocRoom] = useState("OPD Room 1");
  const [docBio, setDocBio] = useState("");
  const [docPhotoUrl, setDocPhotoUrl] = useState("");
  const [docSelectedServiceIds, setDocSelectedServiceIds] = useState<string[]>([]);

  // Holidays state
  const [holidaysList, setHolidaysList] = useState<AdminDashboardHoliday[]>(initialData.holidays || []);
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayTitle, setHolidayTitle] = useState("");
  const [holidayDesc, setHolidayDesc] = useState("");

  const openPickerFor = (field: string) => {
    setMediaTargetField(field);
    setMediaPickerOpen(true);
  };

  const handleMediaSelect = (url: string) => {
    if (mediaTargetField === "heroImage") setHeroImage(url);
    if (mediaTargetField === "logoUrl") setLogoUrl(url);
    if (mediaTargetField === "faviconUrl") setFaviconUrl(url);
    if (mediaTargetField === "docPhoto") setDocPhotoUrl(url);
    if (mediaTargetField === "aboutImage") setAboutImage(url);
    if (mediaTargetField === "ogImageUrl") setOgImageUrl(url);
    setMediaTargetField(null);
  };

  // Save Homepage changes
  const saveHomepage = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/cms/homepage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionType: "HERO",
          title: heroHeading,
          subtitle: heroBadgeText,
          isVisible: sectionVisibility.HERO,
          content: {
            paragraph: heroParagraph,
            imageUrl: heroImage,
            ctaText: heroCtaText,
            ctaLink: heroCtaLink,
            badgeText: heroBadgeText,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: "error", text: data.error?.message || "Failed to save homepage." });
      } else {
        setMessage({ type: "success", text: "Homepage updated! Changes are live on the public website." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error while saving." });
    } finally {
      setSaving(false);
    }
  };

  // Save Theme changes
  const saveTheme = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/cms/site-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryColor,
          secondaryColor,
          accentColor,
          logoUrl,
          faviconUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: "error", text: data.error?.message || "Failed to save theme." });
      } else {
        setMessage({ type: "success", text: "Theme and brand colors updated successfully!" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error while saving." });
    } finally {
      setSaving(false);
    }
  };

  // Save Clinic & Contact Settings
  const saveClinicProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const [cmsRes, clinicRes] = await Promise.all([
        fetch("/api/cms/site-settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            siteTitle,
            tagline,
            contactPhone: phone,
            whatsappNumber: whatsapp,
            contactEmail: email,
            address,
            mapEmbedUrl,
            socialFacebook,
            socialInstagram,
            socialTwitter,
            socialYoutube,
            socialLinkedin,
            metaDescription,
          }),
        }),
        fetch("/api/admin/settings/clinic", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: clinicName,
            phone,
            email,
            address,
          }),
        }),
      ]);

      const data = await cmsRes.json();
      if (!cmsRes.ok || !data.success) {
        setMessage({ type: "error", text: data.error?.message || "Failed to save clinic profile." });
      } else {
        setMessage({ type: "success", text: "Clinic profile and contact information updated!" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error while saving." });
    } finally {
      setSaving(false);
    }
  };

  // Save About section
  const saveAbout = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/cms/homepage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionType: "ABOUT",
          title: aboutTitle,
          subtitle: aboutSubtitle,
          isVisible: sectionVisibility.ABOUT,
          content: {
            paragraph: aboutParagraph,
            imageUrl: aboutImage,
            yearsExperience: aboutYears,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: "error", text: data.error?.message || "Failed to save about section." });
      } else {
        setMessage({ type: "success", text: "About section updated! Changes are live on the public website." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error saving about section." });
    } finally {
      setSaving(false);
    }
  };

  // Save Testimonials
  const saveTestimonials = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/cms/homepage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionType: "TESTIMONIALS",
          title: "What Our Patients Say",
          isVisible: sectionVisibility.TESTIMONIALS,
          content: {
            items: testimonialsList,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: "error", text: data.error?.message || "Failed to save testimonials." });
      } else {
        setMessage({ type: "success", text: "Testimonials updated! Changes are live on the public website." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error saving testimonials." });
    } finally {
      setSaving(false);
    }
  };

  // Save FAQs
  const saveFaqs = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/cms/homepage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionType: "FAQ",
          title: "Frequently Asked Questions",
          isVisible: sectionVisibility.FAQ,
          content: {
            items: faqsList,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: "error", text: data.error?.message || "Failed to save FAQs." });
      } else {
        setMessage({ type: "success", text: "FAQs updated! Changes are live on the public website." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error saving FAQs." });
    } finally {
      setSaving(false);
    }
  };

  // Save Header & Footer configuration
  const saveHeaderFooter = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/cms/site-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headerConfig: {
            announcement: headerAnnouncement,
            showTopBanner,
          },
          footerConfig: {
            copyright: footerCopyright,
            disclaimer: footerDisclaimer,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: "error", text: data.error?.message || "Failed to save header/footer." });
      } else {
        setMessage({ type: "success", text: "Header and Footer configurations saved!" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error saving header/footer settings." });
    } finally {
      setSaving(false);
    }
  };

  // Save Operational Rules, Opening Hours, Capacity & Fees
  const saveRulesAndFees = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/clinic", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openingTime,
          closingTime,
          defaultSlotDurationMinutes: Number(slotDuration),
          maxAdvanceBookingDays: Number(maxAdvanceDays),
          cancellationCutoffHours: Number(cancellationHours),
          minAdvanceAmount: Number(minAdvance),
          enableOnlinePayment: Boolean(enableOnlinePay),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: "error", text: data.error?.message || "Failed to save operational rules." });
      } else {
        setMessage({ type: "success", text: "Appointment rules, opening hours, capacity and advance fees updated!" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error saving rules & fees." });
    } finally {
      setSaving(false);
    }
  };

  // Add Service
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName || !newServiceSlug) return;
    setSaving(true);
    try {
      const res = await fetch("/api/cms/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newServiceName,
          slug: newServiceSlug,
          fee: newServiceFee,
          durationMinutes: newServiceDuration,
          shortDescription: newServiceDesc,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setServicesList((prev) => [...prev, data.data]);
        setNewServiceName("");
        setNewServiceSlug("");
        setNewServiceDesc("");
        setMessage({ type: "success", text: "Service created successfully!" });
      } else {
        setMessage({ type: "error", text: data.error?.message || "Failed to create service." });
      }
    } catch {
      setMessage({ type: "error", text: "Error creating service." });
    } finally {
      setSaving(false);
    }
  };

  // Delete Service
  const handleDeleteService = async (id: string) => {
    if (!confirm("Are you sure you want to delete this clinical service?")) return;
    try {
      const res = await fetch(`/api/cms/services/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setServicesList((prev) => prev.filter((s) => s.id !== id));
        setMessage({ type: "success", text: "Service deleted successfully!" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to delete service." });
    }
  };

  // Update Doctor Fee/Specialization
  const handleDoctorUpdate = async (docId: string, payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/cms/doctors/${docId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setDoctorsList((prev) =>
          prev.map((d) => (d.id === docId ? { ...d, ...data.data } : d))
        );
        setMessage({ type: "success", text: "Doctor profile updated!" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to update doctor." });
    } finally {
      setSaving(false);
    }
  };

  // Create Doctor
  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFullName || !docEmail || !docSpecialization || !docQualification) {
      setMessage({
        type: "error",
        text: "Please fill in all required fields (Name, Email, Specialization, Qualification).",
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/cms/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: docFullName,
          email: docEmail,
          phone: docPhone,
          password: docPassword,
          specialization: docSpecialization,
          qualification: docQualification,
          experienceYears: Number(docExperience),
          registrationNumber: docRegNo,
          languages: docLanguages,
          consultationFee: Number(docFee),
          advanceBookingFee: Number(docAdvanceFee),
          appointmentDurationMinutes: Number(docDuration),
          roomNumber: docRoom,
          bio: docBio,
          profilePhotoUrl: docPhotoUrl,
          serviceIds: docSelectedServiceIds,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: "error", text: data.error?.message || "Failed to create doctor." });
      } else {
        setDoctorsList((prev) => [...prev, data.data]);
        setAddDoctorModalOpen(false);
        setDocFullName("");
        setDocEmail("");
        setDocPhone("");
        setDocSpecialization("");
        setDocQualification("");
        setDocBio("");
        setDocPhotoUrl("");
        setDocSelectedServiceIds([]);
        setMessage({
          type: "success",
          text: `Dr. ${data.data.user?.fullName} registered successfully with default working schedules!`,
        });
      }
    } catch {
      setMessage({ type: "error", text: "Network error while creating doctor." });
    } finally {
      setSaving(false);
    }
  };

  // Toggle Doctor Active / Deactivate
  const handleToggleDoctorActive = async (doc: AdminDashboardDoctor) => {
    const nextStatus = !doc.isActive;
    setSaving(true);
    try {
      const res = await fetch(`/api/cms/doctors/${doc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: nextStatus,
          isAvailableForBooking: nextStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDoctorsList((prev) =>
          prev.map((d) => (d.id === doc.id ? { ...d, isActive: nextStatus, isAvailableForBooking: nextStatus } : d))
        );
        setMessage({
          type: "success",
          text: `Doctor ${nextStatus ? "activated" : "deactivated"} successfully.`,
        });
      } else {
        setMessage({ type: "error", text: data.error?.message || "Failed to update doctor status." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error." });
    } finally {
      setSaving(false);
    }
  };

  // Add Clinic Holiday
  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayDate || !holidayTitle) return;
    setSaving(true);
    try {
      const res = await fetch("/api/clinic/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: holidayDate,
          title: holidayTitle,
          description: holidayDesc,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHolidaysList([data.data, ...holidaysList]);
        setHolidayDate("");
        setHolidayTitle("");
        setHolidayDesc("");
        setMessage({ type: "success", text: "Clinic holiday added successfully." });
      } else {
        setMessage({ type: "error", text: data.error?.message || "Failed to add holiday." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error adding holiday." });
    } finally {
      setSaving(false);
    }
  };

  // Delete Clinic Holiday
  const handleDeleteHoliday = async (id: string) => {
    try {
      const res = await fetch(`/api/clinic/holidays/${id}`, { method: "DELETE" });
      if (res.ok) {
        setHolidaysList(holidaysList.filter((h) => h.id !== id));
        setMessage({ type: "success", text: "Clinic holiday removed." });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to delete holiday." });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Feedback */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Clinic Content & CMS Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Customize website content, doctor profiles, services, and branding without modifying code.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="teal">Database Backed</Badge>
          <a
            href="/dashboard/receptionist"
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 shadow-xs transition"
          >
            📋 Appointments Desk →
          </a>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Preview Public Site ↗
          </a>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs (Phase 7 Specification) */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
        {[
          { key: "doctors", label: "👨‍⚕️ Doctors" },
          { key: "patients", label: "👥 Patients" },
          { key: "appointments", label: "📋 Appointments" },
          { key: "schedules", label: "📅 Schedules" },
          { key: "services", label: "🩺 Services" },
          { key: "payments", label: "💳 Payments" },
          { key: "reports", label: "📊 Reports" },
          { key: "cms", label: "🎨 CMS & Branding" },
          { key: "notifications", label: "🔔 Notifications" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key as any);
              setMessage(null);
            }}
            className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer ${
              activeTab === tab.key
                ? "bg-teal-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CMS Subtabs Bar */}
      {activeTab === "cms" && (
        <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs">
          {[
            { key: "homepage", label: "🏠 Homepage Hero" },
            { key: "about", label: "📖 About Section" },
            { key: "testimonials", label: "⭐ Testimonials" },
            { key: "faq", label: "❓ FAQs" },
            { key: "header_footer", label: "📑 Header & Footer" },
            { key: "theme", label: "🎨 Theme & Colors" },
            { key: "clinic", label: "🏥 Clinic Contacts" },
            { key: "rules_fees", label: "⚙️ Rules & Fees" },
            { key: "media", label: "🖼️ Media Assets" },
            { key: "seo", label: "🔍 SEO & Socials" },
          ].map((sub) => (
            <button
              key={sub.key}
              onClick={() => setCmsSubTab(sub.key as any)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                cmsSubTab === sub.key
                  ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {/* TAB: PATIENTS */}
      {activeTab === "patients" && <AdminPatientsView initialPatients={initialData.patients || []} />}

      {/* TAB: APPOINTMENTS */}
      {activeTab === "appointments" && (
        <AppointmentDeskView
          initialAppointments={initialData.appointments || []}
          doctors={doctorsList.map((d) => ({
            id: d.id,
            name: `Dr. ${d.user?.fullName || ""} (${d.specialization})`,
          }))}
          role="CLINIC_ADMIN"
        />
      )}

      {/* TAB: SCHEDULES */}
      {activeTab === "schedules" && (
        <AdminSchedulesView doctors={doctorsList} initialHolidays={holidaysList} />
      )}

      {/* TAB: REPORTS */}
      {activeTab === "reports" && <AdminReportsView />}

      {/* TAB 1: HOMEPAGE CMS */}
      {activeTab === "cms" && cmsSubTab === "homepage" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hero Section Content</CardTitle>
              <CardDescription>
                Customize the main headline, description, call to action button, and hero banner image.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Hero Heading"
                id="hero-heading-input"
                value={heroHeading}
                onChange={(e) => setHeroHeading(e.target.value)}
                placeholder="e.g. Authentic Ayurvedic Care & Specialized Consultations"
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Hero Paragraph
                </label>
                <textarea
                  id="hero-paragraph-input"
                  rows={3}
                  value={heroParagraph}
                  onChange={(e) => setHeroParagraph(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-400 dark:bg-slate-900 dark:border-slate-800"
                  placeholder="Describe your clinic's primary value proposition..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Badge Tagline"
                  value={heroBadgeText}
                  onChange={(e) => setHeroBadgeText(e.target.value)}
                  placeholder="e.g. Certified Clinical Excellence"
                />

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    Hero Banner Image
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="hero-image-input"
                      type="text"
                      value={heroImage}
                      onChange={(e) => setHeroImage(e.target.value)}
                      placeholder="/hero-image.jpg or URL"
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-800"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openPickerFor("heroImage")}
                    >
                      Browse Media
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Primary CTA Button Text"
                  value={heroCtaText}
                  onChange={(e) => setHeroCtaText(e.target.value)}
                />
                <Input
                  label="Primary CTA Button Link"
                  value={heroCtaLink}
                  onChange={(e) => setHeroCtaLink(e.target.value)}
                />
              </div>

              {heroImage && (
                <div className="mt-2">
                  <p className="text-xs text-slate-500 mb-1">Image Preview:</p>
                  <div className="h-32 w-64 rounded-xl border overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img src={heroImage} alt="Hero Preview" className="h-full w-full object-cover" />
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Button id="save-homepage-btn" onClick={saveHomepage} isLoading={saving}>
                  Save Homepage Content
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Homepage Section Visibility</CardTitle>
              <CardDescription>
                Enable or disable sections on the public homepage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Object.keys(sectionVisibility).map((sec) => (
                  <label
                    key={sec}
                    className="flex items-center space-x-3 p-3 border rounded-xl bg-slate-50 dark:bg-slate-800/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={sectionVisibility[sec]}
                      onChange={(e) =>
                        setSectionVisibility((prev) => ({
                          ...prev,
                          [sec]: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {sec} Section
                    </span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SUBTAB: ABOUT SECTION */}
      {activeTab === "cms" && cmsSubTab === "about" && (
        <Card>
          <CardHeader>
            <CardTitle>About Section & Clinical Heritage</CardTitle>
            <CardDescription>
              Customize the clinic philosophy, experience badge, and descriptive paragraphs shown on the About page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="About Section Title"
              value={aboutTitle}
              onChange={(e) => setAboutTitle(e.target.value)}
              placeholder="e.g. Restoring Equilibrium Through Root-Cause Healing"
            />

            <Input
              label="Mission Subtitle"
              value={aboutSubtitle}
              onChange={(e) => setAboutSubtitle(e.target.value)}
              placeholder="e.g. Bridging timeless Ayurvedic wisdom with contemporary clinical excellence..."
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Detailed Clinical Story & Healing Approach
              </label>
              <textarea
                rows={4}
                value={aboutParagraph}
                onChange={(e) => setAboutParagraph(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-3 text-sm dark:bg-slate-900 dark:border-slate-800"
                placeholder="Describe your clinic's philosophy, diagnosis modalities, and therapies..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Experience Highlight Badge"
                value={aboutYears}
                onChange={(e) => setAboutYears(e.target.value)}
                placeholder="e.g. 12+ Years"
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                  About Feature Image
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aboutImage}
                    onChange={(e) => setAboutImage(e.target.value)}
                    placeholder="/hero-clinic.jpg or URL"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-800"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openPickerFor("aboutImage")}
                  >
                    Browse Media
                  </Button>
                </div>
              </div>
            </div>

            {aboutImage && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Image Preview:</p>
                <div className="h-28 w-48 rounded-xl border overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img src={aboutImage} alt="About Preview" className="h-full w-full object-cover" />
                </div>
              </div>
            )}

            <Button onClick={saveAbout} isLoading={saving}>
              Save About Content
            </Button>
          </CardContent>
        </Card>
      )}

      {/* SUBTAB: TESTIMONIALS */}
      {activeTab === "cms" && cmsSubTab === "testimonials" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Patient Testimonials & Reviews</CardTitle>
              <CardDescription>
                Manage authentic patient feedback and clinical recovery stories displayed on the homepage.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                {testimonialsList.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex flex-col md:flex-row justify-between gap-4"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">{t.name}</span>
                        <span className="text-xs text-teal-600 dark:text-teal-400 font-semibold">• {t.treatment}</span>
                        <span className="text-xs text-amber-500">{"★".repeat(t.rating)}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 italic">&ldquo;{t.quote}&rdquo;</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setTestimonialsList(testimonialsList.filter((_, i) => i !== idx))}
                      className="text-red-600 hover:text-red-700 self-start md:self-center"
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>

              <div className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-900 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Add New Testimonial
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    label="Patient Name"
                    value={newTestimonialName}
                    onChange={(e) => setNewTestimonialName(e.target.value)}
                    placeholder="e.g. Sunita Nair"
                  />
                  <Input
                    label="Treatment / Therapy"
                    value={newTestimonialTreatment}
                    onChange={(e) => setNewTestimonialTreatment(e.target.value)}
                    placeholder="e.g. Panchakarma Detox"
                  />
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Rating (Stars)
                    </label>
                    <select
                      value={newTestimonialRating}
                      onChange={(e) => setNewTestimonialRating(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs dark:bg-slate-900 dark:border-slate-800"
                    >
                      <option value={5}>5 Stars ★★★★★</option>
                      <option value={4}>4 Stars ★★★★☆</option>
                      <option value={3}>3 Stars ★★★☆☆</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Patient Quote
                  </label>
                  <textarea
                    rows={2}
                    value={newTestimonialQuote}
                    onChange={(e) => setNewTestimonialQuote(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs dark:bg-slate-900 dark:border-slate-800"
                    placeholder="Describe the clinical experience and outcome..."
                  />
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (!newTestimonialName || !newTestimonialQuote) return;
                    setTestimonialsList([
                      ...testimonialsList,
                      {
                        name: newTestimonialName,
                        treatment: newTestimonialTreatment || "General Consultation",
                        quote: newTestimonialQuote,
                        rating: newTestimonialRating,
                      },
                    ]);
                    setNewTestimonialName("");
                    setNewTestimonialTreatment("");
                    setNewTestimonialQuote("");
                  }}
                >
                  + Add to Testimonials List
                </Button>
              </div>

              <Button onClick={saveTestimonials} isLoading={saving}>
                Save Testimonials
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SUBTAB: FAQ */}
      {activeTab === "cms" && cmsSubTab === "faq" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions (FAQ)</CardTitle>
              <CardDescription>
                Provide answers to common patient questions regarding appointments, therapies, and clinical policies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                {faqsList.map((faq, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex flex-col md:flex-row justify-between gap-4"
                  >
                    <div className="space-y-1 flex-1">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Q: {faq.q}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300">A: {faq.a}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFaqsList(faqsList.filter((_, i) => i !== idx))}
                      className="text-red-600 hover:text-red-700 self-start md:self-center"
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>

              <div className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-900 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Add New FAQ Entry
                </h4>
                <Input
                  label="Question"
                  value={newFaqQ}
                  onChange={(e) => setNewFaqQ(e.target.value)}
                  placeholder="e.g. Can I reschedule my appointment online?"
                />
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Answer
                  </label>
                  <textarea
                    rows={3}
                    value={newFaqA}
                    onChange={(e) => setNewFaqA(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs dark:bg-slate-900 dark:border-slate-800"
                    placeholder="Provide clear, patient-friendly guidance..."
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (!newFaqQ || !newFaqA) return;
                    setFaqsList([...faqsList, { q: newFaqQ, a: newFaqA }]);
                    setNewFaqQ("");
                    setNewFaqA("");
                  }}
                >
                  + Add to FAQ List
                </Button>
              </div>

              <Button onClick={saveFaqs} isLoading={saving}>
                Save FAQs
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SUBTAB: HEADER & FOOTER */}
      {activeTab === "cms" && cmsSubTab === "header_footer" && (
        <Card>
          <CardHeader>
            <CardTitle>Header Banner & Footer Settings</CardTitle>
            <CardDescription>
              Configure top announcement bar, footer copyright text, and legal disclaimers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Header Top Announcement Banner</h4>
              <Input
                label="Banner Announcement Message"
                value={headerAnnouncement}
                onChange={(e) => setHeaderAnnouncement(e.target.value)}
                placeholder="e.g. Welcoming new patients. Book online consultation with verified specialists."
              />
              <label className="flex items-center space-x-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTopBanner}
                  onChange={(e) => setShowTopBanner(e.target.checked)}
                  className="h-4 w-4 rounded text-teal-600"
                />
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Display announcement bar on public website
                </span>
              </label>
            </div>

            <div className="space-y-3 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Footer Legal & Copyright</h4>
              <Input
                label="Footer Copyright Text"
                value={footerCopyright}
                onChange={(e) => setFooterCopyright(e.target.value)}
                placeholder="e.g. All rights reserved. Certified Healthcare Excellence."
              />
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Medical Disclaimer Notice
                </label>
                <textarea
                  rows={3}
                  value={footerDisclaimer}
                  onChange={(e) => setFooterDisclaimer(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs dark:bg-slate-900 dark:border-slate-800"
                  placeholder="The medical information provided is for educational purposes..."
                />
              </div>
            </div>

            <Button onClick={saveHeaderFooter} isLoading={saving}>
              Save Header & Footer Settings
            </Button>
          </CardContent>
        </Card>
      )}

      {/* SUBTAB: APPOINTMENT RULES & FEES */}
      {activeTab === "cms" && cmsSubTab === "rules_fees" && (
        <Card>
          <CardHeader>
            <CardTitle>Appointment Rules, Capacity & Advance Payment</CardTitle>
            <CardDescription>
              Configure operating hours, consultation slot duration, cancellation limits, and advance booking deposit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Daily Opening Time"
                type="time"
                value={openingTime}
                onChange={(e) => setOpeningTime(e.target.value)}
              />
              <Input
                label="Daily Closing Time"
                type="time"
                value={closingTime}
                onChange={(e) => setClosingTime(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Default Slot Duration (Minutes)"
                type="number"
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
              />
              <Input
                label="Max Advance Booking Window (Days)"
                type="number"
                value={maxAdvanceDays}
                onChange={(e) => setMaxAdvanceDays(Number(e.target.value))}
              />
              <Input
                label="Free Cancellation Cutoff (Hours)"
                type="number"
                value={cancellationHours}
                onChange={(e) => setCancellationHours(Number(e.target.value))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900">
              <div>
                <Input
                  label="Minimum Advance Deposit Required (₹)"
                  type="number"
                  value={minAdvance}
                  onChange={(e) => setMinAdvance(Number(e.target.value))}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Default platform requirement is ₹100 advance deposit per confirmed booking.
                </p>
              </div>

              <div className="flex flex-col justify-center">
                <label className="flex items-center space-x-2.5 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableOnlinePay}
                    onChange={(e) => setEnableOnlinePay(e.target.checked)}
                    className="h-4 w-4 rounded text-teal-600"
                  />
                  <span>Enable Online Advance Payment Processing</span>
                </label>
                <p className="text-xs text-slate-500 mt-1">
                  Patients can complete advance payments via Razorpay / Mock Gateway.
                </p>
              </div>
            </div>

            <Button onClick={saveRulesAndFees} isLoading={saving}>
              Save Appointment Rules & Fees
            </Button>
          </CardContent>
        </Card>
      )}

      {/* TAB 2: THEME & COLORS */}
      {activeTab === "cms" && cmsSubTab === "theme" && (
        <Card>
          <CardHeader>
            <CardTitle>Theme & Branding Colors</CardTitle>
            <CardDescription>
              Modify brand colors and assets. The public website automatically applies these styles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Primary Color (Main Buttons, Accents)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-16 cursor-pointer rounded-lg border border-slate-300 p-1"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="font-mono text-xs uppercase"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Secondary Color (Hover States, Dark Accents)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="h-10 w-16 cursor-pointer rounded-lg border border-slate-300 p-1"
                  />
                  <Input
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="font-mono text-xs uppercase"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Accent Color (Badges, Highlights)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-10 w-16 cursor-pointer rounded-lg border border-slate-300 p-1"
                  />
                  <Input
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="font-mono text-xs uppercase"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-800 space-y-3">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Live Palette Preview:</p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  style={{ backgroundColor: primaryColor }}
                  className="px-4 py-2 text-white font-semibold text-xs rounded-lg shadow-xs"
                >
                  Primary Action Button
                </button>
                <button
                  type="button"
                  style={{ backgroundColor: secondaryColor }}
                  className="px-4 py-2 text-white font-semibold text-xs rounded-lg shadow-xs"
                >
                  Secondary Action Button
                </button>
                <span
                  style={{ backgroundColor: accentColor }}
                  className="px-3 py-1 text-white font-bold text-xs rounded-full"
                >
                  Accent Badge
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                  Clinic Logo URL
                </label>
                <div className="flex gap-2">
                  <Input
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://... or /logo.png"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => openPickerFor("logoUrl")}>
                    Pick
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                  Favicon URL
                </label>
                <div className="flex gap-2">
                  <Input
                    value={faviconUrl}
                    onChange={(e) => setFaviconUrl(e.target.value)}
                    placeholder="/favicon.ico"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => openPickerFor("faviconUrl")}>
                    Pick
                  </Button>
                </div>
              </div>
            </div>

            <Button onClick={saveTheme} isLoading={saving}>
              Save Theme Settings
            </Button>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: CLINIC PROFILE & CONTACT */}
      {activeTab === "cms" && cmsSubTab === "clinic" && (
        <Card>
          <CardHeader>
            <CardTitle>Clinic Identity & Contact Information</CardTitle>
            <CardDescription>
              Client-specific information displayed on the website and booking receipts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Clinic Registered Practice Name"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="e.g. Doctor Plus Specialized Clinic"
              />
              <Input
                label="Site / Brand Display Title"
                value={siteTitle}
                onChange={(e) => setSiteTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4">
              <Input
                label="Tagline / Motto"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Contact Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                label="WhatsApp Number (With Country Code)"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
              <Input
                label="Contact Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Clinic Physical Address
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-teal-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800"
              />
            </div>

            <Input
              label="Google Maps Embed URL (iframe src)"
              value={mapEmbedUrl}
              onChange={(e) => setMapEmbedUrl(e.target.value)}
              placeholder="https://www.google.com/maps/embed?..."
            />

            <Button onClick={saveClinicProfile} isLoading={saving}>
              Save Clinic Profile
            </Button>
          </CardContent>
        </Card>
      )}

      {/* TAB 4: SERVICES CATALOG */}
      {activeTab === "services" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New Clinical Service</CardTitle>
              <CardDescription>Publish medical offerings, consultation durations, and fees.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddService} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Service Name"
                    required
                    value={newServiceName}
                    onChange={(e) => {
                      setNewServiceName(e.target.value);
                      if (!newServiceSlug) {
                        setNewServiceSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"));
                      }
                    }}
                    placeholder="e.g. Panchakarma Detoxification"
                  />
                  <Input
                    label="URL Slug"
                    required
                    value={newServiceSlug}
                    onChange={(e) => setNewServiceSlug(e.target.value)}
                    placeholder="panchakarma-detox"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Fee (₹)"
                    type="number"
                    value={newServiceFee}
                    onChange={(e) => setNewServiceFee(e.target.value)}
                  />
                  <Input
                    label="Duration (Minutes)"
                    type="number"
                    value={newServiceDuration}
                    onChange={(e) => setNewServiceDuration(e.target.value)}
                  />
                </div>

                <Input
                  label="Short Summary"
                  value={newServiceDesc}
                  onChange={(e) => setNewServiceDesc(e.target.value)}
                  placeholder="Brief one-line summary displayed on homepage cards..."
                />

                <Button type="submit" isLoading={saving}>
                  + Add Service to Catalog
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Clinical Services ({servicesList.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {servicesList.map((service) => (
                  <div key={service.id} className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {service.name}
                      </h4>
                      <p className="text-xs text-slate-500">
                        ₹{Number(service.fee).toFixed(0)} • {service.durationMinutes} mins • /{service.slug}
                      </p>
                      {service.shortDescription && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {service.shortDescription}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteService(service.id)}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 5: DOCTOR PROFILES & SCHEDULE ENGINE */}
      {activeTab === "doctors" && (
        <div className="space-y-6">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Medical Practitioners & Clinical Specialists ({doctorsList.length})
              </h3>
              <p className="text-xs text-slate-500">
                Manage doctor profiles, qualifications, consultation fees, weekly working hours, and shift breaks.
              </p>
            </div>
            <Button
              id="add-doctor-modal-btn"
              onClick={() => setAddDoctorModalOpen(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white"
              size="sm"
            >
              + Add New Doctor
            </Button>
          </div>

          {/* Doctor Cards Grid */}
          {doctorsList.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-slate-400">No doctors registered yet.</p>
                <Button onClick={() => setAddDoctorModalOpen(true)} className="mt-4" size="sm">
                  Register First Doctor
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {doctorsList.map((doc) => (
                <Card
                  key={doc.id}
                  className={`border transition shadow-xs ${
                    doc.isActive === false ? "opacity-75 bg-slate-50 dark:bg-slate-900" : ""
                  }`}
                >
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-teal-500 bg-slate-200 flex-shrink-0 flex items-center justify-center">
                          {doc.profilePhotoUrl ? (
                            <img
                              src={doc.profilePhotoUrl}
                              alt={doc.user?.fullName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="font-bold text-sm text-slate-600">Dr</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-base text-slate-900 dark:text-white">
                              Dr. {doc.user?.fullName || "Doctor"}
                            </h4>
                            <Badge variant={doc.isActive ? "teal" : "slate"}>
                              {doc.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                            {doc.specialization}
                          </p>
                          <p className="text-[11px] text-slate-500">{doc.user?.email}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleDoctorActive(doc)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                          doc.isActive
                            ? "text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100"
                            : "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                        }`}
                      >
                        {doc.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 px-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Fee (₹)</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          ₹{Number(doc.consultationFee).toFixed(0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Advance (₹)</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          ₹{Number(doc.advanceBookingFee || 100).toFixed(0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Slot Duration</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {doc.appointmentDurationMinutes || 15} min
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Room / OPD</span>
                        <span className="font-bold text-slate-900 dark:text-white truncate block">
                          {doc.roomNumber || "Main OPD"}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                      <p>
                        <strong className="text-slate-900 dark:text-white font-medium">Qualifications:</strong>{" "}
                        {doc.qualification} {doc.experienceYears ? `(${doc.experienceYears} yrs exp)` : ""}
                      </p>
                      {doc.registrationNumber && (
                        <p>
                          <strong className="text-slate-900 dark:text-white font-medium">Reg No:</strong>{" "}
                          {doc.registrationNumber}
                        </p>
                      )}
                      {doc.languages && (
                        <p>
                          <strong className="text-slate-900 dark:text-white font-medium">Languages:</strong>{" "}
                          {doc.languages}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditDoctorModalDoc(doc)}
                        className="text-xs"
                      >
                        Edit Details
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => setSelectedScheduleDoctor(doc)}
                        className="text-xs bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-700"
                      >
                        📅 Manage Schedules & Breaks
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* CLINIC HOLIDAYS CARD */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Clinic Holidays & Closed Dates</CardTitle>
              <CardDescription className="text-xs">
                During clinic holidays, all doctors are automatically unavailable for appointment bookings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleAddHoliday} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <Input
                  label="Holiday Date"
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  required
                />
                <Input
                  label="Holiday Title"
                  placeholder="e.g. Diwali / Republic Day"
                  value={holidayTitle}
                  onChange={(e) => setHolidayTitle(e.target.value)}
                  required
                />
                <Input
                  label="Description / Note"
                  placeholder="Clinic closed for festival"
                  value={holidayDesc}
                  onChange={(e) => setHolidayDesc(e.target.value)}
                />
                <Button type="submit" isLoading={saving} size="sm">
                  Add Holiday
                </Button>
              </form>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 pt-2">
                {holidaysList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No clinic holidays scheduled.</p>
                ) : (
                  holidaysList.map((h) => (
                    <div key={h.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {new Date(h.date).toLocaleDateString()} — {h.title}
                        </span>
                        {h.description && <p className="text-[11px] text-slate-500">{h.description}</p>}
                      </div>
                      <button
                        onClick={() => handleDeleteHoliday(h.id)}
                        className="text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* SCHEDULE MANAGER MODAL */}
          {selectedScheduleDoctor && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <DoctorScheduleManager
                  doctorId={selectedScheduleDoctor.id}
                  doctorName={selectedScheduleDoctor.user?.fullName || "Doctor"}
                  initialSchedules={selectedScheduleDoctor.schedules || []}
                  initialLeaves={selectedScheduleDoctor.leaves || []}
                  initialBlockedSlots={selectedScheduleDoctor.blockedSlots || []}
                  onClose={() => setSelectedScheduleDoctor(null)}
                />
              </div>
            </div>
          )}

          {/* ADD DOCTOR MODAL */}
          {addDoctorModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Register New Doctor</h3>
                    <p className="text-xs text-slate-500">
                      Creates a practitioner account with default weekly consultation schedules.
                    </p>
                  </div>
                  <button
                    onClick={() => setAddDoctorModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 font-bold text-lg"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateDoctor} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Doctor Full Name *"
                      placeholder="e.g. Dr. Ramesh Vaidya"
                      value={docFullName}
                      onChange={(e) => setDocFullName(e.target.value)}
                      required
                    />
                    <Input
                      label="Email Address (Login ID) *"
                      type="email"
                      placeholder="doctor@clinic.com"
                      value={docEmail}
                      onChange={(e) => setDocEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Phone Number"
                      placeholder="+91 98765 43210"
                      value={docPhone}
                      onChange={(e) => setDocPhone(e.target.value)}
                    />
                    <Input
                      label="Initial Login Password *"
                      value={docPassword}
                      onChange={(e) => setDocPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Specialization *"
                      placeholder="e.g. Ayurvedic Panchakarma Specialist"
                      value={docSpecialization}
                      onChange={(e) => setDocSpecialization(e.target.value)}
                      required
                    />
                    <Input
                      label="Qualifications *"
                      placeholder="e.g. BAMS, MD (Ayurveda)"
                      value={docQualification}
                      onChange={(e) => setDocQualification(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="Experience (Years)"
                      type="number"
                      value={docExperience}
                      onChange={(e) => setDocExperience(e.target.value)}
                    />
                    <Input
                      label="Medical Registration No."
                      placeholder="e.g. AYUSH-9842"
                      value={docRegNo}
                      onChange={(e) => setDocRegNo(e.target.value)}
                    />
                    <Input
                      label="Languages Spoken"
                      placeholder="e.g. English, Hindi, Kannada"
                      value={docLanguages}
                      onChange={(e) => setDocLanguages(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Input
                      label="Consultation Fee (₹) *"
                      type="number"
                      value={docFee}
                      onChange={(e) => setDocFee(e.target.value)}
                      required
                    />
                    <Input
                      label="Advance Booking Fee (₹) *"
                      type="number"
                      value={docAdvanceFee}
                      onChange={(e) => setDocAdvanceFee(e.target.value)}
                      required
                    />
                    <Input
                      label="Slot Duration (Mins) *"
                      type="number"
                      value={docDuration}
                      onChange={(e) => setDocDuration(e.target.value)}
                      required
                    />
                    <Input
                      label="Room Number / OPD"
                      placeholder="e.g. Room 102"
                      value={docRoom}
                      onChange={(e) => setDocRoom(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Doctor Profile Photo URL
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={docPhotoUrl}
                        onChange={(e) => setDocPhotoUrl(e.target.value)}
                        placeholder="/doctors/dr-photo.jpg or URL"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openPickerFor("docPhoto")}
                      >
                        Pick
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Doctor Bio & Background
                    </label>
                    <textarea
                      rows={2}
                      value={docBio}
                      onChange={(e) => setDocBio(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs dark:bg-slate-900"
                      placeholder="Experienced clinician with expertise in herbal formulations..."
                    />
                  </div>

                  {servicesList.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Offered Clinical Services
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl max-h-36 overflow-y-auto">
                        {servicesList.map((svc) => (
                          <label key={svc.id} className="flex items-center space-x-2 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={docSelectedServiceIds.includes(svc.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setDocSelectedServiceIds([...docSelectedServiceIds, svc.id]);
                                } else {
                                  setDocSelectedServiceIds(docSelectedServiceIds.filter((id) => id !== svc.id));
                                }
                              }}
                              className="h-3.5 w-3.5 rounded text-teal-600"
                            />
                            <span className="truncate">{svc.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setAddDoctorModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" isLoading={saving}>
                      Register Doctor
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* EDIT DOCTOR MODAL */}
          {editDoctorModalDoc && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Edit Dr. {editDoctorModalDoc.user?.fullName}
                  </h3>
                  <button
                    onClick={() => setEditDoctorModalDoc(null)}
                    className="text-slate-400 hover:text-slate-600 font-bold text-lg"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label="Specialization"
                      value={editDoctorModalDoc.specialization}
                      onChange={(e) =>
                        setEditDoctorModalDoc({
                          ...editDoctorModalDoc,
                          specialization: e.target.value,
                        })
                      }
                    />
                    <Input
                      label="Qualifications"
                      value={editDoctorModalDoc.qualification}
                      onChange={(e) =>
                        setEditDoctorModalDoc({
                          ...editDoctorModalDoc,
                          qualification: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      label="Consultation Fee (₹)"
                      type="number"
                      value={Number(editDoctorModalDoc.consultationFee)}
                      onChange={(e) =>
                        setEditDoctorModalDoc({
                          ...editDoctorModalDoc,
                          consultationFee: Number(e.target.value),
                        })
                      }
                    />
                    <Input
                      label="Advance Booking Fee (₹)"
                      type="number"
                      value={Number(editDoctorModalDoc.advanceBookingFee || 100)}
                      onChange={(e) =>
                        setEditDoctorModalDoc({
                          ...editDoctorModalDoc,
                          advanceBookingFee: Number(e.target.value),
                        })
                      }
                    />
                    <Input
                      label="Duration (Mins)"
                      type="number"
                      value={editDoctorModalDoc.appointmentDurationMinutes || 15}
                      onChange={(e) =>
                        setEditDoctorModalDoc({
                          ...editDoctorModalDoc,
                          appointmentDurationMinutes: Number(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label="Room Number / OPD"
                      value={editDoctorModalDoc.roomNumber || ""}
                      onChange={(e) =>
                        setEditDoctorModalDoc({
                          ...editDoctorModalDoc,
                          roomNumber: e.target.value,
                        })
                      }
                    />
                    <Input
                      label="Languages Spoken"
                      value={editDoctorModalDoc.languages || ""}
                      onChange={(e) =>
                        setEditDoctorModalDoc({
                          ...editDoctorModalDoc,
                          languages: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Bio</label>
                    <textarea
                      rows={3}
                      value={editDoctorModalDoc.bio || ""}
                      onChange={(e) =>
                        setEditDoctorModalDoc({
                          ...editDoctorModalDoc,
                          bio: e.target.value,
                        })
                      }
                      className="w-full text-xs rounded-lg border border-slate-300 p-2 dark:bg-slate-900"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditDoctorModalDoc(null)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        await handleDoctorUpdate(editDoctorModalDoc.id, {
                          specialization: editDoctorModalDoc.specialization,
                          qualification: editDoctorModalDoc.qualification,
                          consultationFee: editDoctorModalDoc.consultationFee,
                          advanceBookingFee: editDoctorModalDoc.advanceBookingFee,
                          appointmentDurationMinutes: editDoctorModalDoc.appointmentDurationMinutes,
                          roomNumber: editDoctorModalDoc.roomNumber,
                          languages: editDoctorModalDoc.languages,
                          bio: editDoctorModalDoc.bio,
                        });
                        setEditDoctorModalDoc(null);
                      }}
                      isLoading={saving}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: SEO & SOCIALS */}
      {activeTab === "cms" && cmsSubTab === "seo" && (
        <Card>
          <CardHeader>
            <CardTitle>SEO & Social Channels</CardTitle>
            <CardDescription>Search engine tags and social media links.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Global Meta Description (SEO)
              </label>
              <textarea
                rows={3}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm dark:bg-slate-900"
                placeholder="Meta description displayed on Google search results..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Facebook Page URL"
                value={socialFacebook}
                onChange={(e) => setSocialFacebook(e.target.value)}
                placeholder="https://facebook.com/..."
              />
              <Input
                label="Instagram Profile URL"
                value={socialInstagram}
                onChange={(e) => setSocialInstagram(e.target.value)}
                placeholder="https://instagram.com/..."
              />
              <Input
                label="Twitter / X Profile URL"
                value={socialTwitter}
                onChange={(e) => setSocialTwitter(e.target.value)}
                placeholder="https://x.com/..."
              />
              <Input
                label="YouTube Channel URL"
                value={socialYoutube}
                onChange={(e) => setSocialYoutube(e.target.value)}
                placeholder="https://youtube.com/..."
              />
              <Input
                label="LinkedIn Profile URL"
                value={socialLinkedin}
                onChange={(e) => setSocialLinkedin(e.target.value)}
                placeholder="https://linkedin.com/company/..."
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                  Open Graph (OG) Share Image
                </label>
                <div className="flex gap-2">
                  <Input
                    value={ogImageUrl}
                    onChange={(e) => setOgImageUrl(e.target.value)}
                    placeholder="/hero-clinic.jpg or URL"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => openPickerFor("ogImageUrl")}>
                    Pick
                  </Button>
                </div>
              </div>
            </div>

            <Button onClick={saveClinicProfile} isLoading={saving}>
              Save SEO & Social Settings
            </Button>
          </CardContent>
        </Card>
      )}

      {/* TAB: PAYMENTS & TRANSACTIONS */}
      {activeTab === "payments" && <AdminPaymentsView />}

      {/* TAB 7: MEDIA LIBRARY */}
      {activeTab === "cms" && cmsSubTab === "media" && (
        <Card>
          <CardHeader>
            <CardTitle>Media Library & Assets</CardTitle>
            <CardDescription>
              Upload and manage clinic banners, doctor portraits, and treatment photos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-xs text-slate-500">
                Uploaded images are stored via storage abstraction and registered in PostgreSQL.
              </p>
              <Button onClick={() => setMediaPickerOpen(true)}>
                Open Media Uploader & Library
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB: NOTIFICATIONS (PHASE 8 SPECIFICATION) */}
      {activeTab === "notifications" && <AdminNotificationsView />}

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={handleMediaSelect}
      />
    </div>
  );
}
