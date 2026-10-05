import { prisma } from "@/lib/db";
import { recordAuditLog } from "@/lib/services/audit.service";
import { AppError } from "@/lib/utils/api-response";
import { storage } from "@/lib/storage";

export interface HomepageHeroContent {
  heading: string;
  paragraph: string;
  imageUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  badgeText?: string;
}

export interface SectionConfig {
  sectionType: string;
  title?: string;
  subtitle?: string;
  content: Record<string, unknown>;
  sortOrder: number;
  isVisible: boolean;
}

export const DEFAULT_FALLBACK_SERVICES = [
  {
    id: "srv-general-consultation",
    name: "General Medical Consultation",
    slug: "general-consultation",
    shortDescription: "Comprehensive health diagnosis, physical examination, vitals assessment, and prescription.",
    description: "Thorough clinical examination, symptom analysis, treatment protocol, and personalized medical prescription.",
    durationMinutes: 20,
    fee: 500.0,
    isPopular: true,
    isActive: true,
    sortOrder: 1,
    doctors: [
      {
        doctor: {
          user: { fullName: "Dr. Rohit Kumar", email: "dr.rohit@doctorplus.com" },
        },
      },
    ],
  },
  {
    id: "srv-cardiology-check",
    name: "Cardiology & ECG Consultation",
    slug: "cardiology-consultation",
    shortDescription: "Complete heart assessment, blood pressure monitoring, ECG interpretation, and cardiovascular advice.",
    description: "Specialized cardiac evaluation including 12-lead ECG analysis, hypertension management, and heart health counseling.",
    durationMinutes: 30,
    fee: 800.0,
    isPopular: true,
    isActive: true,
    sortOrder: 2,
    doctors: [
      {
        doctor: {
          user: { fullName: "Dr. Ananya Sharma", email: "dr.ananya@doctorplus.com" },
        },
      },
    ],
  },
  {
    id: "srv-orthopedic-care",
    name: "Orthopedic & Joint Care",
    slug: "orthopedic-consultation",
    shortDescription: "Bone density evaluation, arthritis relief, joint mobility therapy, and fracture care.",
    description: "Expert orthopedic consultation for chronic back pain, knee arthritis, posture correction, and rehabilitation.",
    durationMinutes: 25,
    fee: 600.0,
    isPopular: false,
    isActive: true,
    sortOrder: 3,
    doctors: [
      {
        doctor: {
          user: { fullName: "Dr. Rajesh Verma", email: "dr.rajesh@doctorplus.com" },
        },
      },
    ],
  },
  {
    id: "srv-dermatology-skin",
    name: "Dermatology & Skin Therapy",
    slug: "dermatology-consultation",
    shortDescription: "Clinical skin diagnosis, acne management, allergy testing, and chronic dermatosis treatment.",
    description: "Specialized dermatological evaluation and advanced therapeutic protocols for healthy skin and hair care.",
    durationMinutes: 20,
    fee: 500.0,
    isPopular: false,
    isActive: true,
    sortOrder: 4,
    doctors: [
      {
        doctor: {
          user: { fullName: "Dr. Priya Patel", email: "dr.priya@doctorplus.com" },
        },
      },
    ],
  },
  {
    id: "srv-full-body-checkup",
    name: "Complete Preventive Health Checkup",
    slug: "full-body-health-checkup",
    shortDescription: "Full metabolic screening, organ profile consultation, lipid review, and lifestyle optimization.",
    description: "In-depth annual executive health screening covering liver, kidney, blood sugar, lipid parameters, and lifestyle recommendations.",
    durationMinutes: 45,
    fee: 1200.0,
    isPopular: true,
    isActive: true,
    sortOrder: 5,
    doctors: [
      {
        doctor: {
          user: { fullName: "Dr. Rohit Kumar", email: "dr.rohit@doctorplus.com" },
        },
      },
    ],
  },
  {
    id: "srv-pediatric-care",
    name: "Pediatric & Child Wellness",
    slug: "pediatric-consultation",
    shortDescription: "Infant and child growth monitoring, vaccinations, common pediatric infections, and dietary guidance.",
    description: "Dedicated child healthcare consultations providing compassionate care, growth tracking, and developmental assessments.",
    durationMinutes: 20,
    fee: 500.0,
    isPopular: false,
    isActive: true,
    sortOrder: 6,
    doctors: [
      {
        doctor: {
          user: { fullName: "Dr. Ananya Sharma", email: "dr.ananya@doctorplus.com" },
        },
      },
    ],
  },
];

export const DEFAULT_FALLBACK_DOCTORS = [
  {
    id: "doc-rohit-kumar",
    specialization: "General Physician & Chief Consultant",
    qualification: "MBBS, MD (Medicine)",
    experienceYears: 10,
    bio: "Senior medical practitioner with over 10 years of clinical experience in comprehensive diagnostics, chronic disease management, and primary care.",
    consultationFee: 500.0,
    advanceBookingFee: 100.0,
    appointmentDurationMinutes: 20,
    roomNumber: "Room 101",
    profilePhotoUrl: null,
    isActive: true,
    isAvailableForBooking: true,
    user: {
      fullName: "Dr. Rohit Kumar",
      email: "dr.rohit@doctorplus.com",
      phone: "+91 98765 43210",
    },
    services: [
      { service: { id: "srv-general-consultation", name: "General Medical Consultation", fee: 500 } },
      { service: { id: "srv-full-body-checkup", name: "Complete Preventive Health Checkup", fee: 1200 } },
    ],
    schedules: [
      { dayOfWeek: "MONDAY", startTime: "09:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: "TUESDAY", startTime: "09:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: "WEDNESDAY", startTime: "09:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: "THURSDAY", startTime: "09:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: "FRIDAY", startTime: "09:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: "SATURDAY", startTime: "09:00", endTime: "14:00", isAvailable: true },
    ],
  },
  {
    id: "doc-ananya-sharma",
    specialization: "Cardiologist & Heart Specialist",
    qualification: "MBBS, MD, DM (Cardiology)",
    experienceYears: 12,
    bio: "Renowned cardiologist dedicated to cardiovascular health, preventive cardiology, ECG diagnosis, and heart care.",
    consultationFee: 800.0,
    advanceBookingFee: 150.0,
    appointmentDurationMinutes: 30,
    roomNumber: "Room 102",
    profilePhotoUrl: null,
    isActive: true,
    isAvailableForBooking: true,
    user: {
      fullName: "Dr. Ananya Sharma",
      email: "dr.ananya@doctorplus.com",
      phone: "+91 98765 43211",
    },
    services: [
      { service: { id: "srv-cardiology-check", name: "Cardiology & ECG Consultation", fee: 800 } },
      { service: { id: "srv-pediatric-care", name: "Pediatric & Child Wellness", fee: 500 } },
    ],
    schedules: [
      { dayOfWeek: "MONDAY", startTime: "10:00", endTime: "16:00", isAvailable: true },
      { dayOfWeek: "WEDNESDAY", startTime: "10:00", endTime: "16:00", isAvailable: true },
      { dayOfWeek: "FRIDAY", startTime: "10:00", endTime: "16:00", isAvailable: true },
      { dayOfWeek: "SATURDAY", startTime: "10:00", endTime: "14:00", isAvailable: true },
    ],
  },
  {
    id: "doc-rajesh-verma",
    specialization: "Orthopedic & Joint Care Specialist",
    qualification: "MBBS, MS (Orthopedics)",
    experienceYears: 8,
    bio: "Specialized in musculoskeletal disorders, sports injuries, joint preservation therapy, and post-fracture physical rehabilitation.",
    consultationFee: 600.0,
    advanceBookingFee: 100.0,
    appointmentDurationMinutes: 25,
    roomNumber: "Room 103",
    profilePhotoUrl: null,
    isActive: true,
    isAvailableForBooking: true,
    user: {
      fullName: "Dr. Rajesh Verma",
      email: "dr.rajesh@doctorplus.com",
      phone: "+91 98765 43212",
    },
    services: [
      { service: { id: "srv-orthopedic-care", name: "Orthopedic & Joint Care", fee: 600 } },
    ],
    schedules: [
      { dayOfWeek: "TUESDAY", startTime: "11:00", endTime: "19:00", isAvailable: true },
      { dayOfWeek: "THURSDAY", startTime: "11:00", endTime: "19:00", isAvailable: true },
      { dayOfWeek: "SATURDAY", startTime: "11:00", endTime: "18:00", isAvailable: true },
    ],
  },
  {
    id: "doc-priya-patel",
    specialization: "Dermatologist & Skin Specialist",
    qualification: "MBBS, MD (Dermatology)",
    experienceYears: 7,
    bio: "Expert dermatologist providing clinical treatment for persistent acne, hair fall, allergies, psoriasis, and medical skincare.",
    consultationFee: 500.0,
    advanceBookingFee: 100.0,
    appointmentDurationMinutes: 20,
    roomNumber: "Room 104",
    profilePhotoUrl: null,
    isActive: true,
    isAvailableForBooking: true,
    user: {
      fullName: "Dr. Priya Patel",
      email: "dr.priya@doctorplus.com",
      phone: "+91 98765 43213",
    },
    services: [
      { service: { id: "srv-dermatology-skin", name: "Dermatology & Skin Therapy", fee: 500 } },
    ],
    schedules: [
      { dayOfWeek: "MONDAY", startTime: "09:30", endTime: "17:30", isAvailable: true },
      { dayOfWeek: "WEDNESDAY", startTime: "09:30", endTime: "17:30", isAvailable: true },
      { dayOfWeek: "FRIDAY", startTime: "09:30", endTime: "17:30", isAvailable: true },
    ],
  },
];

const DEFAULT_FALLBACK_CLINIC = {
  id: "default-clinic-id",
  name: "Doctor Plus",
  slug: "doctorplus",
  description: "Specialist Doctors & Medical Clinic",
  email: "care@doctorplus.com",
  phone: "+91 98765 43210",
  address: "123 Health Boulevard, Medical Enclave",
  city: "Kolkata",
  state: "West Bengal",
  postalCode: "700001",
  country: "India",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  settings: {
    id: "default-settings",
    clinicId: "default-clinic-id",
    minAdvanceAmount: 100,
    defaultSlotDurationMinutes: 15,
    maxAdvanceBookingDays: 30,
    cancellationCutoffHours: 2,
    currency: "INR",
    timezone: "Asia/Kolkata",
    openingTime: "09:00",
    closingTime: "20:00",
    enableOnlinePayment: true,
  },
  siteSettings: {
    id: "default-sitesettings",
    clinicId: "default-clinic-id",
    siteTitle: "Doctor Plus",
    tagline: "Specialist Doctors & Medical Clinic",
    metaDescription: "Book appointments with experienced doctors and medical specialists.",
    logoUrl: "/doctor-plus-icon.svg",
    faviconUrl: "/doctor-plus-icon.svg",
    primaryColor: "#0D9488",
    secondaryColor: "#0F766E",
    accentColor: "#F59E0B",
    contactEmail: "care@doctorplus.com",
    contactPhone: "+91 98765 43210",
    whatsappNumber: "+919876543210",
    address: "123 Health Boulevard, Medical Enclave",
    mapEmbedUrl: "https://maps.google.com/maps?q=Keutia,+Bhatpara,+Kolkata+743126&t=&z=15&ie=UTF8&iwloc=&output=embed",
  },
};

/**
 * Retrieves the active clinic record with its settings.
 */
export async function getActiveClinic() {
  try {
    const clinic = await prisma.clinic.findFirst({
      where: { isActive: true, slug: { not: "test-clinic-tenant-b" } },
      orderBy: { createdAt: "asc" },
      include: {
        settings: true,
        siteSettings: true,
      },
    });

    if (clinic) return clinic;
  } catch (err: any) {
    console.warn("[CMS Service] Could not connect to database in getActiveClinic. Using default clinic fallback.");
  }

  return DEFAULT_FALLBACK_CLINIC as any;
}

/**
 * Retrieves global site settings for public display and dynamic theming.
 */
export async function getSiteSettings(clinicId?: string) {
  try {
    let targetClinicId = clinicId;

    if (!targetClinicId) {
      const active = await getActiveClinic();
      targetClinicId = active.id;
    }

    const settings = await prisma.siteSettings.findUnique({
      where: { clinicId: targetClinicId },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            slug: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
          },
        },
      },
    });

    if (settings) return settings;
  } catch (err: any) {
    console.warn("[CMS Service] Could not fetch site settings from DB. Using fallback.");
  }

  return DEFAULT_FALLBACK_CLINIC.siteSettings as any;
}

/**
 * Updates site branding, contact information, social links, or custom theme colors.
 */
export async function updateSiteSettings(
  clinicId: string,
  data: {
    siteTitle?: string;
    tagline?: string;
    metaDescription?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    logoUrl?: string;
    faviconUrl?: string;
    contactEmail?: string;
    contactPhone?: string;
    whatsappNumber?: string;
    address?: string;
    mapEmbedUrl?: string;
    socialFacebook?: string;
    socialInstagram?: string;
    socialTwitter?: string;
    socialYoutube?: string;
    socialLinkedin?: string;
    headerConfig?: unknown;
    footerConfig?: unknown;
  },
  userId: string
) {
  const updated = await prisma.siteSettings.upsert({
    where: { clinicId },
    update: {
      ...data,
      headerConfig: data.headerConfig ? JSON.parse(JSON.stringify(data.headerConfig)) : undefined,
      footerConfig: data.footerConfig ? JSON.parse(JSON.stringify(data.footerConfig)) : undefined,
    },
    create: {
      clinicId,
      ...data,
      headerConfig: data.headerConfig ? JSON.parse(JSON.stringify(data.headerConfig)) : undefined,
      footerConfig: data.footerConfig ? JSON.parse(JSON.stringify(data.footerConfig)) : undefined,
    },
  });

  await recordAuditLog({
    userId,
    clinicId,
    action: "UPDATE_SITE_SETTINGS",
    entity: "SiteSettings",
    entityId: updated.id,
    metadata: { updatedFields: Object.keys(data) },
  });

  return updated;
}

/**
 * Retrieves the complete homepage layout with all sections.
 */
export async function getHomepageData(clinicId?: string) {
  try {
    const clinic = await getActiveClinic();
    const targetClinicId = clinicId || clinic.id;

    const page = await prisma.page
      .findUnique({
        where: {
          clinicId_slug: {
            clinicId: targetClinicId,
            slug: "home",
          },
        },
        include: {
          sections: {
            orderBy: { sortOrder: "asc" },
          },
        },
      })
      .catch(() => null);

    // Services list
    const dbServices = await prisma.service
      .findMany({
        where: { clinicId: targetClinicId, isActive: true },
        orderBy: { sortOrder: "asc" },
        take: 6,
      })
      .catch(() => []);

    // Doctors list
    const dbDoctors = await prisma.doctor
      .findMany({
        where: { clinicId: targetClinicId, isActive: true },
        include: {
          user: {
            select: { fullName: true, email: true },
          },
        },
      })
      .catch(() => []);

    const services = dbServices.length > 0 ? dbServices : (DEFAULT_FALLBACK_SERVICES as any);
    const doctors = dbDoctors.length > 0 ? dbDoctors : (DEFAULT_FALLBACK_DOCTORS as any);

    return {
      clinic,
      siteSettings: clinic.siteSettings,
      clinicSettings: clinic.settings,
      page,
      sections: page?.sections || [],
      services,
      doctors,
    };
  } catch (err: any) {
    console.warn("[CMS Service] Error getting homepage data from DB. Using fallback.");
    return {
      clinic: DEFAULT_FALLBACK_CLINIC as any,
      siteSettings: DEFAULT_FALLBACK_CLINIC.siteSettings as any,
      clinicSettings: DEFAULT_FALLBACK_CLINIC.settings as any,
      page: null,
      sections: [],
      services: DEFAULT_FALLBACK_SERVICES as any,
      doctors: DEFAULT_FALLBACK_DOCTORS as any,
    };
  }
}

/**
 * Updates a specific page section (e.g. HERO, ABOUT, FAQ) or creates it if missing.
 */
export async function updatePageSection(
  clinicId: string,
  pageSlug: string,
  sectionType: string,
  data: {
    title?: string;
    subtitle?: string;
    content?: Record<string, unknown>;
    isVisible?: boolean;
    sortOrder?: number;
  },
  userId: string
) {
  const page = await prisma.page.findUnique({
    where: {
      clinicId_slug: {
        clinicId,
        slug: pageSlug,
      },
    },
  });

  if (!page) {
    throw new AppError(`Page "${pageSlug}" not found.`, 404, "PAGE_NOT_FOUND");
  }

  // Find existing section by pageId and sectionType
  const existingSection = await prisma.pageSection.findFirst({
    where: {
      pageId: page.id,
      sectionType,
    },
  });

  let section;
  if (existingSection) {
    section = await prisma.pageSection.update({
      where: { id: existingSection.id },
      data: {
        title: data.title ?? existingSection.title,
        subtitle: data.subtitle ?? existingSection.subtitle,
        content: data.content ? JSON.parse(JSON.stringify(data.content)) : existingSection.content,
        isVisible: data.isVisible !== undefined ? data.isVisible : existingSection.isVisible,
        sortOrder: data.sortOrder !== undefined ? data.sortOrder : existingSection.sortOrder,
      },
    });
  } else {
    section = await prisma.pageSection.create({
      data: {
        pageId: page.id,
        sectionType,
        title: data.title || null,
        subtitle: data.subtitle || null,
        content: data.content ? JSON.parse(JSON.stringify(data.content)) : {},
        isVisible: data.isVisible !== undefined ? data.isVisible : true,
        sortOrder: data.sortOrder || 0,
      },
    });
  }

  await recordAuditLog({
    userId,
    clinicId,
    action: "UPDATE_PAGE_SECTION",
    entity: "PageSection",
    entityId: section.id,
    metadata: { pageSlug, sectionType, title: section.title },
  });

  return section;
}

/**
 * Media Asset management
 */
export async function uploadMediaAsset(
  clinicId: string,
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  altText?: string,
  title?: string,
  userId?: string
) {
  const uploadResult = await storage.uploadFile(fileBuffer, originalName, mimeType, "cms");

  const asset = await prisma.mediaAsset.create({
    data: {
      clinicId,
      fileName: uploadResult.fileName,
      fileKey: uploadResult.fileKey,
      url: uploadResult.url,
      mimeType: uploadResult.mimeType,
      sizeBytes: uploadResult.sizeBytes,
      altText: altText || originalName,
      title: title || originalName,
    },
  });

  await recordAuditLog({
    userId: userId || null,
    clinicId,
    action: "UPLOAD_MEDIA",
    entity: "MediaAsset",
    entityId: asset.id,
    metadata: { fileName: asset.fileName, url: asset.url },
  });

  return asset;
}

export async function listMediaAssets(clinicId: string, search?: string) {
  return prisma.mediaAsset.findMany({
    where: {
      clinicId,
      ...(search
        ? {
            OR: [
              { fileName: { contains: search, mode: "insensitive" } },
              { title: { contains: search, mode: "insensitive" } },
              { altText: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteMediaAsset(assetId: string, clinicId: string, userId: string) {
  const asset = await prisma.mediaAsset.findFirst({
    where: { id: assetId, clinicId },
  });

  if (!asset) {
    throw new AppError("Media asset not found.", 404, "MEDIA_NOT_FOUND");
  }

  await storage.deleteFile(asset.fileKey);
  await prisma.mediaAsset.delete({ where: { id: asset.id } });

  await recordAuditLog({
    userId,
    clinicId,
    action: "DELETE_MEDIA",
    entity: "MediaAsset",
    entityId: asset.id,
    metadata: { fileName: asset.fileName },
  });

  return { success: true };
}

export async function updateMediaAsset(
  assetId: string,
  clinicId: string,
  data: { title?: string; altText?: string },
  userId: string
) {
  const asset = await prisma.mediaAsset.update({
    where: { id: assetId, clinicId },
    data,
  });

  await recordAuditLog({
    userId,
    clinicId,
    action: "UPDATE_MEDIA_METADATA",
    entity: "MediaAsset",
    entityId: asset.id,
    metadata: data,
  });

  return asset;
}

/**
 * Retrieves a published CMS page by its slug with its sections.
 */
export async function getPageBySlug(slug: string, clinicId?: string) {
  try {
    let targetClinicId = clinicId;
    if (!targetClinicId) {
      const active = await getActiveClinic().catch(() => null);
      if (!active) return null;
      targetClinicId = active.id;
    }

    return await prisma.page.findUnique({
      where: {
        clinicId_slug: {
          clinicId: targetClinicId,
          slug,
        },
      },
      include: {
        sections: {
          where: { isVisible: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  } catch (err) {
    console.warn(`[CMS Service] Could not fetch page "${slug}" from DB:`, (err as Error).message);
    return null;
  }
}

/**
 * Retrieves all published clinical services for public directory.
 */
export async function getPublicServices(clinicId?: string) {
  try {
    let targetClinicId = clinicId;
    if (!targetClinicId) {
      const active = await getActiveClinic().catch(() => null);
      if (!active) return DEFAULT_FALLBACK_SERVICES as any;
      targetClinicId = active.id;
    }

    const services = await prisma.service.findMany({
      where: {
        clinicId: targetClinicId,
        isActive: true,
      },
      include: {
        doctors: {
          include: {
            doctor: {
              include: {
                user: { select: { fullName: true, email: true } },
              },
            },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return services.length > 0 ? services : (DEFAULT_FALLBACK_SERVICES as any);
  } catch (err) {
    console.warn("[CMS Service] Could not fetch public services from DB, using fallback:", (err as Error).message);
    return DEFAULT_FALLBACK_SERVICES as any;
  }
}

/**
 * Retrieves a single clinical service by its slug.
 */
export async function getPublicServiceBySlug(slug: string, clinicId?: string) {
  try {
    let targetClinicId = clinicId;
    if (!targetClinicId) {
      const active = await getActiveClinic().catch(() => null);
      if (!active) {
        return (DEFAULT_FALLBACK_SERVICES.find((s) => s.slug === slug) as any) || null;
      }
      targetClinicId = active.id;
    }

    const service = await prisma.service.findUnique({
      where: {
        clinicId_slug: {
          clinicId: targetClinicId,
          slug,
        },
      },
      include: {
        doctors: {
          include: {
            doctor: {
              include: {
                user: { select: { fullName: true, phone: true } },
                schedules: { where: { isAvailable: true } },
              },
            },
          },
        },
      },
    });

    if (service) return service;
  } catch (err) {
    console.warn(`[CMS Service] Could not fetch service "${slug}" from DB:`, (err as Error).message);
  }

  return (DEFAULT_FALLBACK_SERVICES.find((s) => s.slug === slug) as any) || null;
}

/**
 * Retrieves all active doctors for the public specialists directory.
 */
export async function getPublicDoctors(clinicId?: string) {
  try {
    let targetClinicId = clinicId;
    if (!targetClinicId) {
      const active = await getActiveClinic().catch(() => null);
      if (!active) return DEFAULT_FALLBACK_DOCTORS as any;
      targetClinicId = active.id;
    }

    const doctors = await prisma.doctor.findMany({
      where: {
        clinicId: targetClinicId,
        isActive: true,
        isAvailableForBooking: true,
      },
      include: {
        user: { select: { fullName: true, email: true, phone: true } },
        services: { include: { service: true } },
        schedules: { where: { isAvailable: true }, orderBy: { dayOfWeek: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    });

    return doctors.length > 0 ? doctors : (DEFAULT_FALLBACK_DOCTORS as any);
  } catch (err) {
    console.warn("[CMS Service] Could not fetch public doctors from DB, using fallback:", (err as Error).message);
    return DEFAULT_FALLBACK_DOCTORS as any;
  }
}

/**
 * Retrieves full public details of a doctor by their ID.
 */
export async function getPublicDoctorById(doctorId: string) {
  try {
    const doc = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        user: { select: { fullName: true, email: true, phone: true } },
        services: { include: { service: true } },
        schedules: { where: { isAvailable: true }, orderBy: { dayOfWeek: "asc" } },
        clinic: { select: { name: true, phone: true, address: true, city: true } },
      },
    });
    if (doc) return doc;
  } catch (err) {
    console.warn(`[CMS Service] Could not fetch doctor "${doctorId}" from DB:`, (err as Error).message);
  }

  return (DEFAULT_FALLBACK_DOCTORS.find((d) => d.id === doctorId) as any) || null;
}

/**
 * Generates dynamic SEO metadata from CMS Page & SiteSettings.
 */
export async function generateCmsMetadata(
  slug: string,
  fallbackTitle: string,
  fallbackDescription: string
) {
  const [page, siteSettings] = await Promise.all([
    getPageBySlug(slug).catch(() => null),
    getSiteSettings().catch(() => null),
  ]);

  const clinicName = siteSettings?.siteTitle || "Doctor Plus";
  const title = page?.metaTitle || page?.title || fallbackTitle;
  const description = page?.metaDescription || siteSettings?.metaDescription || fallbackDescription;

  return {
    title: `${title} | ${clinicName}`,
    description,
    openGraph: {
      title: `${title} | ${clinicName}`,
      description,
      siteName: clinicName,
      type: "website",
      images: siteSettings?.logoUrl ? [{ url: siteSettings.logoUrl }] : [],
    },
    icons: siteSettings?.faviconUrl ? [{ rel: "icon", url: siteSettings.faviconUrl }] : undefined,
  };
}
