import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting development seed...");

  // 1. Seed or find default clinic
  const clinic = await prisma.clinic.upsert({
    where: { slug: "ayurvedacare" },
    update: {},
    create: {
      name: "Ayurveda Wellness & Healthcare Clinic",
      slug: "ayurvedacare",
      description: "Holistic healthcare, authentic treatments, and specialized doctor consultations.",
      email: "contact@ayurvedacare.example.com",
      phone: "+91 98765 43210",
      address: "123 Health Boulevard, Wellness Nagar",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560001",
      country: "India",
      isActive: true,
      settings: {
        create: {
          minAdvanceAmount: 100.0,
          defaultSlotDurationMinutes: 15,
          maxAdvanceBookingDays: 30,
          cancellationCutoffHours: 2,
          currency: "INR",
          timezone: "Asia/Kolkata",
          openingTime: "09:00",
          closingTime: "20:00",
          enableOnlinePayment: true,
        },
      },
      siteSettings: {
        create: {
          siteTitle: "AyurvedaCare — Holistic Health & Doctor Clinic",
          tagline: "Natural Healing, Modern Care",
          metaDescription: "Book consultations with experienced Ayurvedic doctors and specialists.",
          primaryColor: "#0D9488",
          secondaryColor: "#0F766E",
          accentColor: "#F59E0B",
          contactEmail: "care@ayurvedacare.example.com",
          contactPhone: "+91 98765 43210",
          whatsappNumber: "+91 98765 43210",
          address: "123 Health Boulevard, Wellness Nagar, Bengaluru, Karnataka 560001",
        },
      },
    },
  });

  console.log(`✅ Default Clinic initialized: ${clinic.name} (${clinic.id})`);

  // 2. Seed default CMS Pages
  const pages = [
    { title: "Home", slug: "home", metaTitle: "Home | AyurvedaCare" },
    { title: "About Us", slug: "about", metaTitle: "About Our Clinic | AyurvedaCare" },
    { title: "Services", slug: "services", metaTitle: "Healthcare Services | AyurvedaCare" },
    { title: "Doctors", slug: "doctors", metaTitle: "Our Medical Specialists | AyurvedaCare" },
    { title: "Contact", slug: "contact", metaTitle: "Contact Us | AyurvedaCare" },
    { title: "Privacy Policy", slug: "privacy-policy", metaTitle: "Privacy Policy | AyurvedaCare" },
    { title: "Terms & Conditions", slug: "terms", metaTitle: "Terms of Service | AyurvedaCare" },
  ];

  for (const pageData of pages) {
    await prisma.page.upsert({
      where: {
        clinicId_slug: {
          clinicId: clinic.id,
          slug: pageData.slug,
        },
      },
      update: {},
      create: {
        clinicId: clinic.id,
        title: pageData.title,
        slug: pageData.slug,
        metaTitle: pageData.metaTitle,
        isPublished: true,
      },
    });
  }

  console.log(`✅ Seeded ${pages.length} CMS placeholder pages.`);

  // 3. Seed initial primary service
  await prisma.service.upsert({
    where: {
      clinicId_slug: {
        clinicId: clinic.id,
        slug: "general-consultation",
      },
    },
    update: {},
    create: {
      clinicId: clinic.id,
      name: "General Doctor Consultation",
      slug: "general-consultation",
      shortDescription: "Comprehensive health diagnosis and personalized treatment plan.",
      description: "Thorough clinical examination, symptom analysis, and natural prescription.",
      durationMinutes: 20,
      fee: 500.0,
      isPopular: true,
      isActive: true,
      sortOrder: 1,
    },
  });

  console.log("✅ Seeded initial primary service.");

  // 4. Seed default notification templates
  const { DEFAULT_NOTIFICATION_TEMPLATES } = await import("../src/lib/notifications/templates/default-templates");
  for (const def of DEFAULT_NOTIFICATION_TEMPLATES) {
    await prisma.notificationTemplate.upsert({
      where: {
        clinicId_event_channel: {
          clinicId: clinic.id,
          event: def.event,
          channel: def.channel,
        },
      },
      update: {},
      create: {
        clinicId: clinic.id,
        event: def.event,
        channel: def.channel,
        name: def.name,
        subject: def.subject || null,
        body: def.body,
        isActive: true,
        variables: def.variables,
        description: def.description,
      },
    });
  }
  console.log(`✅ Seeded ${DEFAULT_NOTIFICATION_TEMPLATES.length} default notification templates.`);

  console.log("✅ Seed completed successfully. No hardcoded admin credentials were created.");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
