import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import {
  getSiteSettings,
  updateSiteSettings,
  getHomepageData,
  updatePageSection,
  uploadMediaAsset,
  getPublicDoctors,
} from "@/lib/services/cms.service";
import { assertTenantAccess, withTenantScope } from "@/lib/auth/tenant";
import { checkRateLimit, resetRateLimits } from "@/lib/security/rate-limit";
import { GET as healthCheckGet } from "@/app/api/health/route";
import { UserRole } from "@prisma/client";

describe("Phase 10: Final Production & Client-Customization Layer", () => {
  let mainClinicId: string;
  let adminUserId: string;
  let testClinicBId: string;
  let clinicBAdminUserId: string;

  beforeAll(async () => {
    // 1. Fetch active primary clinic
    const clinic = await prisma.clinic.findFirst({
      where: { isActive: true, slug: { not: "test-clinic-tenant-b" } },
      orderBy: { createdAt: "asc" },
    });
    if (!clinic) throw new Error("No active clinic found in database.");
    mainClinicId = clinic.id;

    // 2. Fetch admin user
    let admin = await prisma.user.findFirst({
      where: { role: UserRole.CLINIC_ADMIN, clinicId: mainClinicId },
    });
    if (!admin) {
      admin = await prisma.user.findFirst({
        where: { role: UserRole.SUPER_ADMIN },
      });
    }
    if (!admin) throw new Error("No admin user found.");
    adminUserId = admin.id;

    // 3. Create second clinic (Clinic B) to test tenant isolation
    const clinicB = await prisma.clinic.upsert({
      where: { slug: "test-clinic-tenant-b" },
      update: {},
      create: {
        name: "Wellness Haven Clinic B",
        slug: "test-clinic-tenant-b",
        email: "contact@clinic-b.example",
        phone: "+91 99887 76655",
        city: "Mumbai",
        state: "Maharashtra",
      },
    });
    testClinicBId = clinicB.id;

    // Create Clinic B admin user
    const clinicBAdmin = await prisma.user.upsert({
      where: { email: "admin-tenant-b@clinic-b.example" },
      update: {},
      create: {
        email: "admin-tenant-b@clinic-b.example",
        fullName: "Admin Clinic B",
        passwordHash: "$2b$10$abcdefghijklmnopqrstuvwxyz1234567890",
        role: UserRole.CLINIC_ADMIN,
        clinicId: testClinicBId,
      },
    });
    clinicBAdminUserId = clinicBAdmin.id;
  });

  afterAll(async () => {
    // Clean up test clinic B
    try {
      await prisma.user.deleteMany({ where: { email: "admin-tenant-b@clinic-b.example" } });
      await prisma.siteSettings.deleteMany({ where: { clinicId: testClinicBId } });
      await prisma.clinicSettings.deleteMany({ where: { clinicId: testClinicBId } });
      await prisma.clinic.deleteMany({ where: { id: testClinicBId } });

      // Restore mainClinicId minAdvanceAmount to default 100
      await prisma.clinicSettings.updateMany({
        where: { clinicId: mainClinicId },
        data: { minAdvanceAmount: 100.0 },
      });
    } catch {
      // Ignore cleanup error in test tear-down
    }
  });

  describe("1. Client Customization Layer (No Source Code Changes Required)", () => {
    it("updates clinic branding, logo, favicon, colors, and contacts dynamically", async () => {
      const customBrandData = {
        siteTitle: "Doctor Plus",
        tagline: "Advanced Healthcare & Specialized Clinical Services",
        metaDescription: "Doctor Plus - Book appointments with top doctors, specialists, and healthcare experts.",
        primaryColor: "#059669",
        secondaryColor: "#0284C7",
        accentColor: "#F59E0B",
        logoUrl: "/doctor-plus-icon.svg",
        faviconUrl: "/doctor-plus-icon.svg",
        contactPhone: "+91 98765 43210",
        whatsappNumber: "+919876543210",
        contactEmail: "care@doctorplus.com",
        address: "Keutia, Bhatpara, Kolkata, West Bengal 743126",
        mapEmbedUrl:
          "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14697!2d88.406!3d22.868!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39f89a9f!2sKeutia%2C+Bhatpara%2C+West+Bengal+743126!5e0!3m2!1sen!2sin!4v1",
        socialFacebook: "https://facebook.com/doctorplus",
        socialInstagram: "https://instagram.com/doctorplus",
        socialTwitter: "https://x.com/doctorplus",
        socialYoutube: "https://youtube.com/@doctorplus",
        socialLinkedin: "https://linkedin.com/company/doctorplus",
        headerConfig: {
          announcement: "🏥 Welcome to Doctor Plus — Specialized Healthcare & Expert Consultations",
          showTopBanner: true,
        },
        footerConfig: {
          copyright: "© 2026 Doctor Plus. All rights reserved.",
          disclaimer: "Doctor Plus provides accredited clinical healthcare and verified doctor consultations.",
        },
      };

      const updated = await updateSiteSettings(mainClinicId, customBrandData, adminUserId);
      expect(updated).toBeDefined();
      expect(updated.siteTitle).toBe("Doctor Plus");
      expect(updated.primaryColor).toBe("#059669");
      expect(updated.contactPhone).toBe("+91 98765 43210");
      expect(updated.whatsappNumber).toBe("+919876543210");
      expect(updated.logoUrl).toBe("/doctor-plus-icon.svg");
      expect(updated.mapEmbedUrl).toContain("maps/embed");

      // Verify that getSiteSettings returns the newly persisted configurations
      const currentSettings = await getSiteSettings(mainClinicId);
      expect(currentSettings).toBeDefined();
      expect(currentSettings?.siteTitle).toBe("Doctor Plus");
      expect(currentSettings?.socialInstagram).toBe("https://instagram.com/doctorplus");
      expect(currentSettings?.socialLinkedin).toBe("https://linkedin.com/company/doctorplus");
      expect((currentSettings?.headerConfig as any)?.showTopBanner).toBe(true);
      expect((currentSettings?.footerConfig as any)?.copyright).toContain("Doctor Plus");
    });
  });

  describe("2. Dynamic Media Upload & Immediate Website Reflection", () => {
    it("allows admin to upload media assets and use them for public website branding", async () => {
      const dummyBuffer = Buffer.from(
        "GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;",
        "binary"
      );

      const mediaAsset = await uploadMediaAsset(
        mainClinicId,
        dummyBuffer,
        "clinic-hero-autumn.png",
        "image/png",
        adminUserId,
        "hero"
      );

      expect(mediaAsset).toBeDefined();
      expect(mediaAsset.url).toContain("/uploads/");
      expect(mediaAsset.fileName).toBe("clinic-hero-autumn.png");

      // Replace homepage hero image with newly uploaded asset
      await updatePageSection(
        mainClinicId,
        "home",
        "HERO",
        {
          title: "Authentic Healing at AyurvedaCare",
          content: {
            paragraph: "Personalized medicine synthesized with ancient holistic wisdom.",
            imageUrl: mediaAsset.url,
            ctaText: "Book Your Slot",
            ctaLink: "/book",
          },
        },
        adminUserId
      );

      // Verify public homepage data immediately reflects the uploaded image URL
      const homeData = await getHomepageData(mainClinicId);
      const heroSec = homeData.sections.find((s) => s.sectionType === "HERO");
      expect((heroSec?.content as any)?.imageUrl).toBe(mediaAsset.url);
      expect((heroSec?.content as any)?.ctaText).toBe("Book Your Slot");
    });
  });

  describe("3. Dynamic Content Editing (About, Testimonials & FAQ)", () => {
    it("allows non-developer editing of About section and reflects on website", async () => {
      const updatedAbout = await updatePageSection(
        mainClinicId,
        "home",
        "ABOUT",
        {
          title: "Traditional Panchakarma & Constitutional Equilibrium",
          subtitle: "Our Heritage of 15+ Years in Bengaluru",
          isVisible: true,
          content: {
            paragraph:
              "We provide specialized diagnosis using classical Nadi Pariksha and customized herbal formulations.",
            imageUrl: "/uploads/clinic-interior.jpg",
            yearsExperience: "15+ Years",
          },
        },
        adminUserId
      );

      expect(updatedAbout.title).toBe("Traditional Panchakarma & Constitutional Equilibrium");

      const homeData = await getHomepageData(mainClinicId);
      const aboutSec = homeData.sections.find((s) => s.sectionType === "ABOUT");
      expect(aboutSec?.title).toBe("Traditional Panchakarma & Constitutional Equilibrium");
      expect((aboutSec?.content as any)?.yearsExperience).toBe("15+ Years");
    });

    it("allows non-developer editing of dynamic Testimonials list", async () => {
      const customTestimonials = [
        {
          name: "Siddharth Rao",
          treatment: "Chronic Joint Pain Therapy",
          quote: "The personalized herbal oil therapies and dietary protocol eliminated my morning stiffness.",
          rating: 5,
        },
        {
          name: "Kavita Menon",
          treatment: "Stress & Insomnia Care",
          quote: "Shirodhara sessions restored my deep sleep cycle completely. Highly recommended!",
          rating: 5,
        },
      ];

      await updatePageSection(
        mainClinicId,
        "home",
        "TESTIMONIALS",
        {
          title: "What Our Patients Say",
          isVisible: true,
          content: {
            items: customTestimonials,
          },
        },
        adminUserId
      );

      const homeData = await getHomepageData(mainClinicId);
      const testimonialsSec = homeData.sections.find((s) => s.sectionType === "TESTIMONIALS");
      const items = (testimonialsSec?.content as any)?.items;
      expect(items).toHaveLength(2);
      expect(items[0].name).toBe("Siddharth Rao");
      expect(items[1].treatment).toBe("Stress & Insomnia Care");
    });

    it("allows non-developer editing of dynamic FAQ list", async () => {
      const customFaqs = [
        {
          q: "Do I need to fast before Nadi Pariksha (Pulse Diagnosis)?",
          a: "Yes, it is recommended to arrive with at least 2.5 hours of fasting for accurate pulse readings.",
        },
        {
          q: "Are the herbal medicines authentic and heavy-metal tested?",
          a: "All our classical botanical formulations undergo standardized laboratory heavy metal and purity testing.",
        },
      ];

      await updatePageSection(
        mainClinicId,
        "home",
        "FAQ",
        {
          title: "Frequently Asked Questions",
          isVisible: true,
          content: {
            items: customFaqs,
          },
        },
        adminUserId
      );

      const homeData = await getHomepageData(mainClinicId);
      const faqSec = homeData.sections.find((s) => s.sectionType === "FAQ");
      const items = (faqSec?.content as any)?.items;
      expect(items).toHaveLength(2);
      expect(items[0].q).toContain("Nadi Pariksha");
    });
  });

  describe("4. Multi-Tenant Client & Data Isolation", () => {
    it("allows Clinic Admin A to access Clinic A data", () => {
      const sessionA = {
        userId: adminUserId,
        role: UserRole.CLINIC_ADMIN,
        clinicId: mainClinicId,
      };

      const resolvedClinic = assertTenantAccess(sessionA, mainClinicId);
      expect(resolvedClinic).toBe(mainClinicId);
    });

    it("strictly blocks Clinic Admin A from accessing or mutating Clinic B data", () => {
      const sessionA = {
        userId: adminUserId,
        role: UserRole.CLINIC_ADMIN,
        clinicId: mainClinicId,
      };

      expect(() => {
        assertTenantAccess(sessionA, testClinicBId);
      }).toThrowError(/Cross-clinic tenant access is strictly prohibited/);
    });

    it("strictly blocks Clinic Admin B from accessing Clinic A data", () => {
      const sessionB = {
        userId: clinicBAdminUserId,
        role: UserRole.CLINIC_ADMIN,
        clinicId: testClinicBId,
      };

      expect(() => {
        assertTenantAccess(sessionB, mainClinicId);
      }).toThrowError(/Cross-clinic tenant access is strictly prohibited/);
    });

    it("allows Super Admin to access any clinic tenant context", () => {
      const superAdminSession = {
        userId: adminUserId,
        role: UserRole.SUPER_ADMIN,
        clinicId: null,
      };

      const accessA = assertTenantAccess(superAdminSession, mainClinicId);
      const accessB = assertTenantAccess(superAdminSession, testClinicBId);

      expect(accessA).toBe(mainClinicId);
      expect(accessB).toBe(testClinicBId);
    });

    it("enforces tenant-scoped database query filters using withTenantScope", () => {
      const sessionB = {
        userId: clinicBAdminUserId,
        role: UserRole.CLINIC_ADMIN,
        clinicId: testClinicBId,
      };

      const queryScope = withTenantScope(sessionB, { status: "CONFIRMED" });
      expect(queryScope.clinicId).toBe(testClinicBId);
      expect(queryScope.status).toBe("CONFIRMED");
    });
  });

  describe("5. Operational Rules, Capacity & Consultation Fees", () => {
    it("configures operating hours, slot duration, capacity, and advance deposit requirements", async () => {
      const updatedSettings = await prisma.clinicSettings.upsert({
        where: { clinicId: testClinicBId },
        update: {
          openingTime: "08:30",
          closingTime: "20:30",
          defaultSlotDurationMinutes: 20,
          maxAdvanceBookingDays: 45,
          cancellationCutoffHours: 3,
          minAdvanceAmount: 150.0,
          enableOnlinePayment: true,
        },
        create: {
          clinicId: testClinicBId,
          openingTime: "08:30",
          closingTime: "20:30",
          defaultSlotDurationMinutes: 20,
          maxAdvanceBookingDays: 45,
          cancellationCutoffHours: 3,
          minAdvanceAmount: 150.0,
          enableOnlinePayment: true,
        },
      });

      expect(updatedSettings.openingTime).toBe("08:30");
      expect(updatedSettings.closingTime).toBe("20:30");
      expect(updatedSettings.defaultSlotDurationMinutes).toBe(20);
      expect(Number(updatedSettings.minAdvanceAmount)).toBe(150);
      expect(updatedSettings.maxAdvanceBookingDays).toBe(45);
    });

    it("updates doctor consultation fees and advance booking fees without code modifications", async () => {
      const doctor = await prisma.doctor.findFirst({
        where: { clinicId: mainClinicId, isActive: true },
      });

      if (doctor) {
        const origConsultationFee = doctor.consultationFee;
        const origAdvanceBookingFee = doctor.advanceBookingFee;
        const origDuration = doctor.appointmentDurationMinutes;

        const updatedDoc = await prisma.doctor.update({
          where: { id: doctor.id },
          data: {
            consultationFee: 750.0,
            advanceBookingFee: 150.0,
            appointmentDurationMinutes: 20,
          },
        });

        expect(Number(updatedDoc.consultationFee)).toBe(750);
        expect(Number(updatedDoc.advanceBookingFee)).toBe(150);

        // Verify public doctors list displays the updated fee
        const publicDocs = await getPublicDoctors(mainClinicId);
        const matched = publicDocs.find((d) => d.id === doctor.id);
        expect(Number(matched?.consultationFee)).toBe(750);

        // Restore doctor fees for other suites
        await prisma.doctor.update({
          where: { id: doctor.id },
          data: {
            consultationFee: origConsultationFee,
            advanceBookingFee: origAdvanceBookingFee,
            appointmentDurationMinutes: origDuration,
          },
        });
      }
    });
  });

  describe("6. Production Deployment Readiness (Health Check & Rate Limiting)", () => {
    it("verifies health check endpoint reports system diagnostics", async () => {
      const response = await healthCheckGet();
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.status).toBe("healthy");
      expect(json.checks.database.status).toBe("healthy");
      expect(typeof json.checks.database.latencyMs).toBe("number");
      expect(json.checks.storage.status).toBe("healthy");
      expect(json.checks.memory.rssMb).toBeGreaterThan(0);
      expect(json.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });

    it("verifies sliding window rate limiter protects endpoints and enforces limits", () => {
      resetRateLimits();
      const testKey = "client-ip-test-123";
      const options = { limit: 5, windowSeconds: 60, identifierPrefix: "test" };

      // First 5 requests should be allowed
      for (let i = 1; i <= 5; i++) {
        const res = checkRateLimit(testKey, options);
        expect(res.allowed).toBe(true);
        expect(res.remaining).toBe(5 - i);
      }

      // 6th request should be blocked
      const blockedRes = checkRateLimit(testKey, options);
      expect(blockedRes.allowed).toBe(false);
      expect(blockedRes.remaining).toBe(0);
      expect(blockedRes.resetSeconds).toBeGreaterThan(0);
    });
  });
});
