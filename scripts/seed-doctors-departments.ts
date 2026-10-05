import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { DayOfWeek, UserRole } from "@prisma/client";

async function main() {
  console.log("🏥 Adding 3 Doctors and 3 Medical Departments to Doctor Plus...");

  // 1. Fetch primary clinic
  const clinic = await prisma.clinic.findFirst({
    where: { isActive: true, slug: { not: "test-clinic-tenant-b" } },
    orderBy: { createdAt: "asc" },
  });

  if (!clinic) {
    throw new Error("No active primary clinic found!");
  }

  console.log(`Target Clinic: ${clinic.name} (${clinic.id})`);

  // 2. Define 3 Medical Departments / Services
  const departmentsData = [
    {
      name: "Cardiology & Cardiovascular Care",
      slug: "cardiology-cardiovascular-care",
      description:
        "Comprehensive cardiac diagnostic evaluations, ECG analysis, preventive cardiovascular screening, blood pressure regulation, and lifestyle heart wellness protocols.",
      shortDescription:
        "Specialized heart wellness, cardiovascular diagnosis & blood pressure management.",
      durationMinutes: 30,
      fee: 900,
      isPopular: true,
      sortOrder: 1,
    },
    {
      name: "Pediatrics & Child Health",
      slug: "pediatrics-child-health",
      description:
        "Dedicated pediatric healthcare covering neonatal well-being, childhood immunization guidance, developmental milestone assessments, and gentle restorative treatments.",
      shortDescription:
        "Compassionate child healthcare, growth monitoring & pediatric wellness.",
      durationMinutes: 30,
      fee: 700,
      isPopular: true,
      sortOrder: 2,
    },
    {
      name: "Orthopedics & Joint Care",
      slug: "orthopedics-joint-care",
      description:
        "Advanced diagnostic and clinical protocols for musculoskeletal disorders, arthritis management, joint mobility restoration, spine health, and specialized physiotherapy.",
      shortDescription:
        "Targeted joint rehabilitation, back & spine pain relief & mobility therapy.",
      durationMinutes: 30,
      fee: 850,
      isPopular: true,
      sortOrder: 3,
    },
  ];

  const createdServices: Record<string, string> = {};

  for (const dept of departmentsData) {
    const service = await prisma.service.upsert({
      where: {
        clinicId_slug: {
          clinicId: clinic.id,
          slug: dept.slug,
        },
      },
      create: {
        clinicId: clinic.id,
        name: dept.name,
        slug: dept.slug,
        description: dept.description,
        shortDescription: dept.shortDescription,
        durationMinutes: dept.durationMinutes,
        fee: dept.fee,
        isPopular: dept.isPopular,
        isActive: true,
        sortOrder: dept.sortOrder,
      },
      update: {
        name: dept.name,
        description: dept.description,
        shortDescription: dept.shortDescription,
        durationMinutes: dept.durationMinutes,
        fee: dept.fee,
        isPopular: dept.isPopular,
        isActive: true,
        sortOrder: dept.sortOrder,
      },
    });

    createdServices[dept.slug] = service.id;
    console.log(`✅ Department/Service Created: ${service.name} (${service.id})`);
  }

  // 3. Define 3 Doctors with complete profiles
  const defaultPasswordHash = await hashPassword("DoctorPass#2026");

  const doctorsData = [
    {
      email: "dr.ananya.roy@doctorplus.com",
      fullName: "Dr. Ananya Roy",
      phone: "+91 98301 23456",
      specialization: "Cardiology & Cardiovascular Medicine",
      qualification: "MBBS, MD (Cardiology)",
      experienceYears: 14,
      consultationFee: 900,
      advanceBookingFee: 150,
      bio: "Dr. Ananya Roy is a senior clinical cardiologist with 14+ years of medical excellence specializing in non-invasive cardiology, preventive heart healthcare, and lifestyle cardiovascular rehabilitation.",
      languages: "English, Bengali, Hindi",
      roomNumber: "Cardiology Suite 101",
      profilePhotoUrl:
        "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=600",
      serviceSlug: "cardiology-cardiovascular-care",
      startTime: "09:00",
      endTime: "17:00",
    },
    {
      email: "dr.subhashish.mukherjee@doctorplus.com",
      fullName: "Dr. Subhashish Mukherjee",
      phone: "+91 98302 34567",
      specialization: "Pediatrics & Neonatal Care",
      qualification: "MBBS, MD (Pediatrics), DCH",
      experienceYears: 11,
      consultationFee: 700,
      advanceBookingFee: 100,
      bio: "Dr. Subhashish Mukherjee is a compassionate pediatrician with 11+ years of experience dedicated to child growth milestones, respiratory infections, childhood immunity, and neonatal well-being.",
      languages: "English, Bengali, Hindi",
      roomNumber: "Pediatric Care Wing 202",
      profilePhotoUrl:
        "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=600",
      serviceSlug: "pediatrics-child-health",
      startTime: "10:00",
      endTime: "18:00",
    },
    {
      email: "dr.priya.sengupta@doctorplus.com",
      fullName: "Dr. Priya Sengupta",
      phone: "+91 98303 45678",
      specialization: "Orthopedics & Joint Care",
      qualification: "MBBS, MS (Orthopedics), M.Ch Ortho",
      experienceYears: 16,
      consultationFee: 850,
      advanceBookingFee: 150,
      bio: "Dr. Priya Sengupta is an accomplished orthopedic specialist with 16 years of clinical excellence in musculoskeletal rehabilitation, joint preservation, back pain relief, and arthritis therapies.",
      languages: "English, Bengali, Hindi",
      roomNumber: "Orthopedics Suite 303",
      profilePhotoUrl:
        "https://images.unsplash.com/photo-1594824813511-53693e506979?auto=format&fit=crop&q=80&w=600",
      serviceSlug: "orthopedics-joint-care",
      startTime: "09:00",
      endTime: "17:00",
    },
  ];

  const weekDays = [
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
  ];

  for (const docData of doctorsData) {
    // 3a. Upsert User
    const user = await prisma.user.upsert({
      where: { email: docData.email },
      create: {
        email: docData.email,
        fullName: docData.fullName,
        phone: docData.phone,
        passwordHash: defaultPasswordHash,
        role: UserRole.DOCTOR,
        clinicId: clinic.id,
        isActive: true,
      },
      update: {
        fullName: docData.fullName,
        phone: docData.phone,
        role: UserRole.DOCTOR,
        clinicId: clinic.id,
        isActive: true,
      },
    });

    // 3b. Upsert Doctor Profile
    const doctor = await prisma.doctor.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        clinicId: clinic.id,
        specialization: docData.specialization,
        qualification: docData.qualification,
        experienceYears: docData.experienceYears,
        consultationFee: docData.consultationFee,
        advanceBookingFee: docData.advanceBookingFee,
        appointmentDurationMinutes: 30,
        languages: docData.languages,
        roomNumber: docData.roomNumber,
        clinicLocation: "Doctor Plus - Keutia, Bhatpara",
        bio: docData.bio,
        profilePhotoUrl: docData.profilePhotoUrl,
        isActive: true,
        isAvailableForBooking: true,
      },
      update: {
        specialization: docData.specialization,
        qualification: docData.qualification,
        experienceYears: docData.experienceYears,
        consultationFee: docData.consultationFee,
        advanceBookingFee: docData.advanceBookingFee,
        appointmentDurationMinutes: 30,
        languages: docData.languages,
        roomNumber: docData.roomNumber,
        bio: docData.bio,
        profilePhotoUrl: docData.profilePhotoUrl,
        isActive: true,
        isAvailableForBooking: true,
      },
    });

    // 3c. Link to Service
    const serviceId = createdServices[docData.serviceSlug];
    if (serviceId) {
      await prisma.doctorService.upsert({
        where: {
          doctorId_serviceId: {
            doctorId: doctor.id,
            serviceId,
          },
        },
        create: {
          doctorId: doctor.id,
          serviceId,
        },
        update: {},
      });
    }

    // 3d. Create / Update Schedules for Mon-Sat
    for (const dayOfWeek of weekDays) {
      await prisma.doctorSchedule.deleteMany({
        where: {
          doctorId: doctor.id,
          dayOfWeek,
        },
      });

      await prisma.doctorSchedule.create({
        data: {
          doctorId: doctor.id,
          dayOfWeek,
          startTime: docData.startTime,
          endTime: docData.endTime,
          slotDurationMinutes: 30,
          maxPatientsPerSlot: 1,
          breakStartTime: "13:00",
          breakEndTime: "14:00",
          breakReason: "Lunch & Clinical Sterilization",
          isAvailable: true,
        },
      });
    }

    console.log(`✅ Doctor Profile & Schedule Ready: ${docData.fullName} (${docData.specialization})`);
  }

  console.log("🎉 Successfully added 3 Doctors and 3 Medical Departments to Doctor Plus!");
}

main()
  .catch((e) => {
    console.error("Error adding doctors & departments:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
