import { PrismaClient, DayOfWeek, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Doctor Plus seed...");

  // 1. Seed or find default clinic "Doctor Plus"
  let clinic = await prisma.clinic.findFirst({
    where: {
      OR: [{ slug: "doctorplus" }, { slug: "ayurvedacare" }],
    },
    include: { settings: true, siteSettings: true },
  });

  const clinicData = {
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
  };

  if (!clinic) {
    clinic = await prisma.clinic.create({
      data: {
        ...clinicData,
        settings: {
          create: {
            minAdvanceAmount: 100.0,
            defaultSlotDurationMinutes: 20,
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
            siteTitle: "Doctor Plus",
            tagline: "Doctor & Specialized Medical Clinic",
            metaDescription: "Book appointments with experienced doctors and medical specialists.",
            primaryColor: "#0D9488",
            secondaryColor: "#0F766E",
            accentColor: "#F59E0B",
            contactEmail: "care@doctorplus.com",
            contactPhone: "+91 98765 43210",
            whatsappNumber: "+919876543210",
            address: "123 Health Boulevard, Medical Enclave, Kolkata 700001",
          },
        },
      },
      include: { settings: true, siteSettings: true },
    });
  } else {
    clinic = await prisma.clinic.update({
      where: { id: clinic.id },
      data: {
        ...clinicData,
      },
      include: { settings: true, siteSettings: true },
    });

    if (clinic.siteSettings) {
      await prisma.siteSettings.update({
        where: { id: clinic.siteSettings.id },
        data: {
          siteTitle: "Doctor Plus",
          tagline: "Doctor & Specialized Medical Clinic",
          metaDescription: "Book appointments with experienced doctors and medical specialists.",
        },
      });
    }
  }

  console.log(`✅ Default Clinic initialized: ${clinic.name} (${clinic.id})`);

  // 2. Seed default CMS Pages
  const pages = [
    { title: "Home", slug: "home", metaTitle: "Home | Doctor Plus" },
    { title: "About Us", slug: "about", metaTitle: "About Our Clinic | Doctor Plus" },
    { title: "Services", slug: "services", metaTitle: "Healthcare Services | Doctor Plus" },
    { title: "Doctors", slug: "doctors", metaTitle: "Our Medical Specialists | Doctor Plus" },
    { title: "Contact", slug: "contact", metaTitle: "Contact Us | Doctor Plus" },
    { title: "Privacy Policy", slug: "privacy-policy", metaTitle: "Privacy Policy | Doctor Plus" },
    { title: "Terms & Conditions", slug: "terms", metaTitle: "Terms of Service | Doctor Plus" },
  ];

  for (const pageData of pages) {
    await prisma.page.upsert({
      where: {
        clinicId_slug: {
          clinicId: clinic.id,
          slug: pageData.slug,
        },
      },
      update: {
        metaTitle: pageData.metaTitle,
      },
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

  // 3. Seed Clinical Services
  const servicesList = [
    {
      name: "General Medical Consultation",
      slug: "general-consultation",
      shortDescription: "Comprehensive health diagnosis, physical examination, vitals assessment, and prescription.",
      description: "Thorough clinical examination, symptom analysis, treatment protocol, and personalized medical prescription.",
      durationMinutes: 20,
      fee: 500.0,
      isPopular: true,
      sortOrder: 1,
    },
    {
      name: "Cardiology & ECG Consultation",
      slug: "cardiology-consultation",
      shortDescription: "Complete heart assessment, blood pressure monitoring, ECG interpretation, and cardiovascular advice.",
      description: "Specialized cardiac evaluation including 12-lead ECG analysis, hypertension management, and heart health counseling.",
      durationMinutes: 30,
      fee: 800.0,
      isPopular: true,
      sortOrder: 2,
    },
    {
      name: "Orthopedic & Joint Care",
      slug: "orthopedic-consultation",
      shortDescription: "Bone density evaluation, arthritis relief, joint mobility therapy, and fracture care.",
      description: "Expert orthopedic consultation for chronic back pain, knee arthritis, posture correction, and rehabilitation.",
      durationMinutes: 25,
      fee: 600.0,
      isPopular: false,
      sortOrder: 3,
    },
    {
      name: "Dermatology & Skin Therapy",
      slug: "dermatology-consultation",
      shortDescription: "Clinical skin diagnosis, acne management, allergy testing, and chronic dermatosis treatment.",
      description: "Specialized dermatological evaluation and advanced therapeutic protocols for healthy skin and hair care.",
      durationMinutes: 20,
      fee: 500.0,
      isPopular: false,
      sortOrder: 4,
    },
    {
      name: "Complete Preventive Health Checkup",
      slug: "full-body-health-checkup",
      shortDescription: "Full metabolic screening, organ profile consultation, lipid review, and lifestyle optimization.",
      description: "In-depth annual executive health screening covering liver, kidney, blood sugar, lipid parameters, and lifestyle recommendations.",
      durationMinutes: 45,
      fee: 1200.0,
      isPopular: true,
      sortOrder: 5,
    },
    {
      name: "Pediatric & Child Wellness",
      slug: "pediatric-consultation",
      shortDescription: "Infant and child growth monitoring, vaccinations, common pediatric infections, and dietary guidance.",
      description: "Dedicated child healthcare consultations providing compassionate care, growth tracking, and developmental assessments.",
      durationMinutes: 20,
      fee: 500.0,
      isPopular: false,
      sortOrder: 6,
    },
  ];

  const seededServices: Record<string, string> = {};
  for (const s of servicesList) {
    const service = await prisma.service.upsert({
      where: {
        clinicId_slug: {
          clinicId: clinic.id,
          slug: s.slug,
        },
      },
      update: {
        name: s.name,
        shortDescription: s.shortDescription,
        description: s.description,
        durationMinutes: s.durationMinutes,
        fee: s.fee,
        isPopular: s.isPopular,
        isActive: true,
        sortOrder: s.sortOrder,
      },
      create: {
        clinicId: clinic.id,
        name: s.name,
        slug: s.slug,
        shortDescription: s.shortDescription,
        description: s.description,
        durationMinutes: s.durationMinutes,
        fee: s.fee,
        isPopular: s.isPopular,
        isActive: true,
        sortOrder: s.sortOrder,
      },
    });
    seededServices[s.slug] = service.id;
  }
  console.log(`✅ Seeded ${servicesList.length} Clinical Services.`);

  // 4. Seed Medical Specialist Doctors with Schedules
  const defaultPasswordHash = await bcrypt.hash("DoctorPlus@2026", 10);

  const doctorsList = [
    {
      email: "dr.rohit@doctorplus.com",
      fullName: "Dr. Rohit Kumar",
      phone: "+91 98765 43210",
      specialization: "General Physician & Chief Consultant",
      qualification: "MBBS, MD (Medicine)",
      experienceYears: 10,
      bio: "Senior medical practitioner with over 10 years of clinical experience in comprehensive diagnostics, chronic disease management, and primary care.",
      consultationFee: 500.0,
      advanceBookingFee: 100.0,
      appointmentDurationMinutes: 20,
      roomNumber: "Room 101",
      profilePhotoUrl: "/images/doctors/dr-rohit-kumar.jpg",
      services: ["general-consultation", "full-body-health-checkup"],
      days: [
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
        DayOfWeek.SATURDAY,
      ],
      startTime: "09:00",
      endTime: "18:00",
    },
    {
      email: "dr.ananya@doctorplus.com",
      fullName: "Dr. Ananya Sharma",
      phone: "+91 98765 43211",
      specialization: "Cardiologist & Heart Specialist",
      qualification: "MBBS, MD, DM (Cardiology)",
      experienceYears: 12,
      bio: "Renowned cardiologist dedicated to cardiovascular health, preventive cardiology, ECG diagnosis, and heart care.",
      consultationFee: 800.0,
      advanceBookingFee: 150.0,
      appointmentDurationMinutes: 30,
      roomNumber: "Room 102",
      profilePhotoUrl: "/images/doctors/dr-ananya-sharma.jpg",
      services: ["cardiology-consultation", "pediatric-consultation"],
      days: [
        DayOfWeek.MONDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.FRIDAY,
        DayOfWeek.SATURDAY,
      ],
      startTime: "10:00",
      endTime: "16:00",
    },
    {
      email: "dr.rajesh@doctorplus.com",
      fullName: "Dr. Rajesh Verma",
      phone: "+91 98765 43212",
      specialization: "Orthopedic & Joint Care Specialist",
      qualification: "MBBS, MS (Orthopedics)",
      experienceYears: 8,
      bio: "Specialized in musculoskeletal disorders, sports injuries, joint preservation therapy, and post-fracture physical rehabilitation.",
      consultationFee: 600.0,
      advanceBookingFee: 100.0,
      appointmentDurationMinutes: 25,
      roomNumber: "Room 103",
      profilePhotoUrl: "/images/doctors/dr-rajesh-verma.jpg",
      services: ["orthopedic-consultation"],
      days: [
        DayOfWeek.TUESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.SATURDAY,
      ],
      startTime: "11:00",
      endTime: "19:00",
    },
    {
      email: "dr.priya@doctorplus.com",
      fullName: "Dr. Priya Patel",
      phone: "+91 98765 43213",
      specialization: "Dermatologist & Skin Specialist",
      qualification: "MBBS, MD (Dermatology)",
      experienceYears: 7,
      bio: "Expert dermatologist providing clinical treatment for persistent acne, hair fall, allergies, psoriasis, and medical skincare.",
      consultationFee: 500.0,
      advanceBookingFee: 100.0,
      appointmentDurationMinutes: 20,
      roomNumber: "Room 104",
      profilePhotoUrl: "/images/doctors/dr-priya-patel.jpg",
      services: ["dermatology-consultation"],
      days: [
        DayOfWeek.MONDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.FRIDAY,
      ],
      startTime: "09:30",
      endTime: "17:30",
    },
  ];

  for (const doc of doctorsList) {
    const user = await prisma.user.upsert({
      where: { email: doc.email },
      update: {
        fullName: doc.fullName,
        phone: doc.phone,
        role: UserRole.DOCTOR,
        clinicId: clinic.id,
      },
      create: {
        email: doc.email,
        passwordHash: defaultPasswordHash,
        fullName: doc.fullName,
        phone: doc.phone,
        role: UserRole.DOCTOR,
        clinicId: clinic.id,
      },
    });

    const doctor = await prisma.doctor.upsert({
      where: { userId: user.id },
      update: {
        clinicId: clinic.id,
        specialization: doc.specialization,
        qualification: doc.qualification,
        experienceYears: doc.experienceYears,
        bio: doc.bio,
        consultationFee: doc.consultationFee,
        advanceBookingFee: doc.advanceBookingFee,
        appointmentDurationMinutes: doc.appointmentDurationMinutes,
        roomNumber: doc.roomNumber,
        profilePhotoUrl: doc.profilePhotoUrl,
        isActive: true,
        isAvailableForBooking: true,
      },
      create: {
        userId: user.id,
        clinicId: clinic.id,
        specialization: doc.specialization,
        qualification: doc.qualification,
        experienceYears: doc.experienceYears,
        bio: doc.bio,
        consultationFee: doc.consultationFee,
        advanceBookingFee: doc.advanceBookingFee,
        appointmentDurationMinutes: doc.appointmentDurationMinutes,
        roomNumber: doc.roomNumber,
        profilePhotoUrl: doc.profilePhotoUrl,
        isActive: true,
        isAvailableForBooking: true,
      },
    });

    // Link doctor to services
    for (const serviceSlug of doc.services) {
      const serviceId = seededServices[serviceSlug];
      if (serviceId) {
        await prisma.doctorService.upsert({
          where: {
            doctorId_serviceId: {
              doctorId: doctor.id,
              serviceId,
            },
          },
          update: {},
          create: {
            doctorId: doctor.id,
            serviceId,
          },
        });
      }
    }

    // Seed weekly schedules
    for (const day of doc.days) {
      await prisma.doctorSchedule.upsert({
        where: {
          doctorId_dayOfWeek_startTime: {
            doctorId: doctor.id,
            dayOfWeek: day,
            startTime: doc.startTime,
          },
        },
        update: {
          endTime: doc.endTime,
          slotDurationMinutes: doc.appointmentDurationMinutes,
          isAvailable: true,
        },
        create: {
          doctorId: doctor.id,
          dayOfWeek: day,
          startTime: doc.startTime,
          endTime: doc.endTime,
          slotDurationMinutes: doc.appointmentDurationMinutes,
          isAvailable: true,
        },
      });
    }
  }

  console.log(`✅ Seeded ${doctorsList.length} Medical Specialist Doctors with Schedules & Service links.`);

  // 5. Seed default notification templates
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

  console.log("==================================================");
  console.log("🎉 Seed completed successfully!");
  console.log("Doctor credentials created for local testing:");
  console.log("Email: dr.rohit@doctorplus.com | Password: DoctorPlus@2026");
  console.log("==================================================");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
