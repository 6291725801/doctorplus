/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/db";
import { authenticateUser } from "@/lib/services/auth.service";
import {
  getHomepageData,
  updatePageSection,
  uploadMediaAsset,
  getActiveClinic,
  updateSiteSettings,
} from "@/lib/services/cms.service";
import fs from "fs/promises";
import path from "path";

describe("Phase 2 Real CMS Workflow Testing", () => {
  let clinicId: string;
  let adminUserId: string;

  beforeAll(async () => {
    const clinic = await getActiveClinic();
    clinicId = clinic.id;

    // Verify or find the provisioned admin user
    const admin = await prisma.user.findFirst({
      where: { role: "CLINIC_ADMIN" },
    });
    if (!admin) {
      throw new Error("Admin user not found. Ensure database is seeded.");
    }
    adminUserId = admin.id;
  });

  it("1. Admin logs in with credentials", async () => {
    const result = await authenticateUser({
      email: "admin@ayurvedacare.com",
      password: "AdminPass#2026",
    });

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe("admin@ayurvedacare.com");
    expect(result.user.role).toBe("CLINIC_ADMIN");
    expect(result.token).toBeDefined();
  });

  it("2. Admin changes homepage heading -> saves -> public homepage reflects change", async () => {
    const newHeading = "Ayurveda Wellness & Advanced Holistic Care 2026";
    const newParagraph = "Certified clinical experts providing comprehensive Panchakarma therapies.";

    // Admin updates the HERO section
    const updated = await updatePageSection(
      clinicId,
      "home",
      "HERO",
      {
        title: newHeading,
        subtitle: "Clinical Excellence 2026",
        content: {
          paragraph: newParagraph,
          imageUrl: "/uploads/cms/initial_banner.jpg",
          ctaText: "Book Instant Consultation",
          ctaLink: "/signup",
          badgeText: "Clinical Excellence 2026",
        },
        isVisible: true,
      },
      adminUserId
    );

    expect(updated.title).toBe(newHeading);

    // Verify public homepage data retrieval reflects this change immediately
    const publicHomepage = await getHomepageData(clinicId);
    const hero = publicHomepage.sections.find((s) => s.sectionType === "HERO");

    expect(hero).toBeDefined();
    expect(hero?.title).toBe(newHeading);
    expect((hero?.content as any)?.paragraph).toBe(newParagraph);
    expect((hero?.content as any)?.ctaText).toBe("Book Instant Consultation");

    // Verify AuditLog record was persisted in PostgreSQL
    const audit = await prisma.auditLog.findFirst({
      where: {
        userId: adminUserId,
        action: "UPDATE_PAGE_SECTION",
        entityId: updated.id,
      },
      orderBy: { createdAt: "desc" },
    });
    expect(audit).toBeDefined();
    expect(audit?.action).toBe("UPDATE_PAGE_SECTION");
  });

  it("3. Admin uploads image -> selects image in homepage -> saves -> public homepage displays new image", async () => {
    // Create a 1x1 dummy PNG buffer to simulate real image upload
    const dummyImageBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    );

    // Upload via CMS media service & storage abstraction
    const asset = await uploadMediaAsset(
      clinicId,
      dummyImageBuffer,
      "doctor_clinic_banner.png",
      "image/png",
      "Ayurveda Clinic Reception Banner",
      "Main Clinic Banner",
      adminUserId
    );

    expect(asset.id).toBeDefined();
    expect(asset.url.startsWith("/uploads/cms/")).toBe(true);
    expect(asset.fileName).toBe("doctor_clinic_banner.png");

    // Verify file exists on local storage filesystem
    const diskPath = path.resolve(process.cwd(), "public", asset.url.replace(/^\//, ""));
    const fileStat = await fs.stat(diskPath);
    expect(fileStat.size).toBe(dummyImageBuffer.length);

    // Admin selects this newly uploaded image in the Homepage Hero section
    const currentHero = (await getHomepageData(clinicId)).sections.find(
      (s) => s.sectionType === "HERO"
    );

    const updatedHero = await updatePageSection(
      clinicId,
      "home",
      "HERO",
      {
        title: currentHero?.title || "Ayurveda Wellness",
        content: {
          ...(currentHero?.content as any),
          imageUrl: asset.url,
        },
      },
      adminUserId
    );

    expect((updatedHero.content as any).imageUrl).toBe(asset.url);

    // Verify public homepage now reflects the new uploaded image URL
    const publicHomepage = await getHomepageData(clinicId);
    const heroSection = publicHomepage.sections.find((s) => s.sectionType === "HERO");
    expect((heroSection?.content as any)?.imageUrl).toBe(asset.url);

    // Verify Media Upload AuditLog was persisted
    const mediaAudit = await prisma.auditLog.findFirst({
      where: {
        userId: adminUserId,
        action: "UPLOAD_MEDIA",
        entityId: asset.id,
      },
    });
    expect(mediaAudit).toBeDefined();
  });

  it("4. Admin modifies theme colors and branding -> saved in PostgreSQL", async () => {
    const updatedTheme = await updateSiteSettings(
      clinicId,
      {
        primaryColor: "#0F766E",
        secondaryColor: "#115E59",
        accentColor: "#D97706",
      },
      adminUserId
    );

    expect(updatedTheme.primaryColor).toBe("#0F766E");
    expect(updatedTheme.secondaryColor).toBe("#115E59");
    expect(updatedTheme.accentColor).toBe("#D97706");

    // Verify public site settings reflect new colors
    const publicData = await getHomepageData(clinicId);
    expect(publicData.siteSettings?.primaryColor).toBe("#0F766E");
    expect(publicData.siteSettings?.accentColor).toBe("#D97706");
  });
});
