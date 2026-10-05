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

/**
 * Retrieves the active clinic record with its settings.
 */
export async function getActiveClinic() {
  const clinic = await prisma.clinic.findFirst({
    where: { isActive: true, slug: { not: "test-clinic-tenant-b" } },
    orderBy: { createdAt: "asc" },
    include: {
      settings: true,
      siteSettings: true,
    },
  });

  if (!clinic) {
    throw new AppError("No active clinic found.", 404, "CLINIC_NOT_FOUND");
  }

  return clinic;
}

/**
 * Retrieves global site settings for public display and dynamic theming.
 */
export async function getSiteSettings(clinicId?: string) {
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

  return settings;
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
  const clinic = await getActiveClinic();
  const targetClinicId = clinicId || clinic.id;

  const page = await prisma.page.findUnique({
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
  });

  // Services list
  const services = await prisma.service.findMany({
    where: { clinicId: targetClinicId, isActive: true },
    orderBy: { sortOrder: "asc" },
    take: 6,
  });

  // Doctors list
  const doctors = await prisma.doctor.findMany({
    where: { clinicId: targetClinicId, isActive: true },
    include: {
      user: {
        select: { fullName: true, email: true },
      },
    },
  });

  return {
    clinic,
    siteSettings: clinic.siteSettings,
    clinicSettings: clinic.settings,
    page,
    sections: page?.sections || [],
    services,
    doctors,
  };
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
  let targetClinicId = clinicId;
  if (!targetClinicId) {
    const active = await getActiveClinic().catch(() => null);
    if (!active) return null;
    targetClinicId = active.id;
  }

  return prisma.page.findUnique({
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
}

/**
 * Retrieves all published clinical services for public directory.
 */
export async function getPublicServices(clinicId?: string) {
  let targetClinicId = clinicId;
  if (!targetClinicId) {
    const active = await getActiveClinic().catch(() => null);
    if (!active) return [];
    targetClinicId = active.id;
  }

  return prisma.service.findMany({
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
}

/**
 * Retrieves a single clinical service by its slug.
 */
export async function getPublicServiceBySlug(slug: string, clinicId?: string) {
  let targetClinicId = clinicId;
  if (!targetClinicId) {
    const active = await getActiveClinic().catch(() => null);
    if (!active) return null;
    targetClinicId = active.id;
  }

  return prisma.service.findUnique({
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
}

/**
 * Retrieves all active doctors for the public specialists directory.
 */
export async function getPublicDoctors(clinicId?: string) {
  let targetClinicId = clinicId;
  if (!targetClinicId) {
    const active = await getActiveClinic().catch(() => null);
    if (!active) return [];
    targetClinicId = active.id;
  }

  return prisma.doctor.findMany({
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
}

/**
 * Retrieves full public details of a doctor by their ID.
 */
export async function getPublicDoctorById(doctorId: string) {
  return prisma.doctor.findUnique({
    where: { id: doctorId },
    include: {
      user: { select: { fullName: true, email: true, phone: true } },
      services: { include: { service: true } },
      schedules: { where: { isAvailable: true }, orderBy: { dayOfWeek: "asc" } },
      clinic: { select: { name: true, phone: true, address: true, city: true } },
    },
  });
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

  const clinicName = siteSettings?.siteTitle || "AyurvedaCare Healthcare";
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

