import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { recordAuditLog } from "@/lib/services/audit.service";
import { DayOfWeek, UserRole } from "@prisma/client";

export interface CreateDoctorInput {
  clinicId: string;
  fullName: string;
  email: string;
  phone?: string;
  password?: string;
  specialization: string;
  qualification: string;
  experienceYears?: number;
  registrationNumber?: string;
  languages?: string;
  appointmentDurationMinutes?: number;
  maxDailyAppointments?: number;
  roomNumber?: string;
  clinicLocation?: string;
  consultationFee?: number;
  advanceBookingFee?: number;
  bio?: string;
  profilePhotoUrl?: string;
  serviceIds?: string[];
  initialSchedules?: Array<{
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    slotDurationMinutes?: number;
    breakStartTime?: string;
    breakEndTime?: string;
    breakReason?: string;
    isAvailable?: boolean;
  }>;
}

export interface UpdateDoctorInput {
  fullName?: string;
  phone?: string;
  specialization?: string;
  qualification?: string;
  experienceYears?: number;
  registrationNumber?: string;
  languages?: string;
  appointmentDurationMinutes?: number;
  maxDailyAppointments?: number | null;
  roomNumber?: string;
  clinicLocation?: string;
  consultationFee?: number;
  advanceBookingFee?: number;
  bio?: string;
  profilePhotoUrl?: string;
  isActive?: boolean;
  isAvailableForBooking?: boolean;
  serviceIds?: string[];
}

/**
 * Creates a new Doctor in the specified Clinic, provisioning a DOCTOR User account.
 */
export async function createDoctor(data: CreateDoctorInput, actorUserId?: string) {
  const normalizedEmail = data.email.toLowerCase().trim();

  // 1. Check if user email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new Error(`A user with email ${normalizedEmail} already exists.`);
  }

  // 2. Hash password (use provided or secure default)
  const rawPassword = data.password || "DoctorPass#2026";
  const passwordHash = await hashPassword(rawPassword);

  // 3. Create user + doctor in transaction
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        fullName: data.fullName.trim(),
        phone: data.phone?.trim() || null,
        passwordHash,
        role: UserRole.DOCTOR,
        clinicId: data.clinicId,
        isActive: true,
      },
    });

    const doctor = await tx.doctor.create({
      data: {
        userId: user.id,
        clinicId: data.clinicId,
        specialization: data.specialization.trim(),
        qualification: data.qualification.trim(),
        experienceYears: data.experienceYears !== undefined ? Number(data.experienceYears) : 0,
        registrationNumber: data.registrationNumber?.trim() || null,
        languages: data.languages?.trim() || "English, Hindi",
        appointmentDurationMinutes: data.appointmentDurationMinutes ? Number(data.appointmentDurationMinutes) : 15,
        maxDailyAppointments: data.maxDailyAppointments !== undefined ? Number(data.maxDailyAppointments) : null,
        roomNumber: data.roomNumber?.trim() || null,
        clinicLocation: data.clinicLocation?.trim() || "Main Clinic",
        consultationFee: data.consultationFee !== undefined ? Number(data.consultationFee) : 500,
        advanceBookingFee: data.advanceBookingFee !== undefined ? Number(data.advanceBookingFee) : 100,
        bio: data.bio?.trim() || null,
        profilePhotoUrl: data.profilePhotoUrl?.trim() || null,
        isActive: true,
        isAvailableForBooking: true,
      },
    });

    // Link services if provided
    if (data.serviceIds && data.serviceIds.length > 0) {
      await tx.doctorService.createMany({
        data: data.serviceIds.map((serviceId) => ({
          doctorId: doctor.id,
          serviceId,
        })),
        skipDuplicates: true,
      });
    }

    // Default weekday schedules (Mon-Fri 09:00-17:00, 13:00-14:00 lunch break) if none provided
    const defaultSchedules = data.initialSchedules || [
      { dayOfWeek: DayOfWeek.MONDAY, startTime: "09:00", endTime: "17:00", breakStartTime: "13:00", breakEndTime: "14:00", breakReason: "Lunch Break" },
      { dayOfWeek: DayOfWeek.TUESDAY, startTime: "09:00", endTime: "17:00", breakStartTime: "13:00", breakEndTime: "14:00", breakReason: "Lunch Break" },
      { dayOfWeek: DayOfWeek.WEDNESDAY, startTime: "09:00", endTime: "17:00", breakStartTime: "13:00", breakEndTime: "14:00", breakReason: "Lunch Break" },
      { dayOfWeek: DayOfWeek.THURSDAY, startTime: "09:00", endTime: "17:00", breakStartTime: "13:00", breakEndTime: "14:00", breakReason: "Lunch Break" },
      { dayOfWeek: DayOfWeek.FRIDAY, startTime: "09:00", endTime: "17:00", breakStartTime: "13:00", breakEndTime: "14:00", breakReason: "Lunch Break" },
      { dayOfWeek: DayOfWeek.SATURDAY, startTime: "09:00", endTime: "13:00", isAvailable: true },
    ];

    await tx.doctorSchedule.createMany({
      data: defaultSchedules.map((s) => ({
        doctorId: doctor.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        slotDurationMinutes: s.slotDurationMinutes || doctor.appointmentDurationMinutes,
        maxPatientsPerSlot: 1,
        breakStartTime: s.breakStartTime || null,
        breakEndTime: s.breakEndTime || null,
        breakReason: s.breakReason || null,
        isAvailable: s.isAvailable !== false,
      })),
      skipDuplicates: true,
    });

    return { user, doctor };
  });

  await recordAuditLog({
    userId: actorUserId,
    clinicId: data.clinicId,
    action: "CREATE_DOCTOR",
    entity: "Doctor",
    entityId: result.doctor.id,
    metadata: {
      email: normalizedEmail,
      specialization: data.specialization,
      fee: data.consultationFee,
    },
  });

  return getDoctorById(result.doctor.id);
}

/**
 * Updates a Doctor profile and optionally the linked User details.
 */
export async function updateDoctor(
  doctorId: string,
  data: UpdateDoctorInput,
  actorUserId?: string
) {
  const current = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: { user: true },
  });

  if (!current) {
    throw new Error(`Doctor not found with ID ${doctorId}`);
  }

  await prisma.$transaction(async (tx) => {
    // 1. Update user info if provided
    if (data.fullName || data.phone !== undefined) {
      await tx.user.update({
        where: { id: current.userId },
        data: {
          ...(data.fullName ? { fullName: data.fullName.trim() } : {}),
          ...(data.phone !== undefined ? { phone: data.phone?.trim() || null } : {}),
        },
      });
    }

    // 2. Update doctor profile
    const doc = await tx.doctor.update({
      where: { id: doctorId },
      data: {
        ...(data.specialization ? { specialization: data.specialization.trim() } : {}),
        ...(data.qualification ? { qualification: data.qualification.trim() } : {}),
        ...(data.experienceYears !== undefined ? { experienceYears: Number(data.experienceYears) } : {}),
        ...(data.registrationNumber !== undefined ? { registrationNumber: data.registrationNumber?.trim() || null } : {}),
        ...(data.languages !== undefined ? { languages: data.languages?.trim() || null } : {}),
        ...(data.appointmentDurationMinutes !== undefined ? { appointmentDurationMinutes: Number(data.appointmentDurationMinutes) } : {}),
        ...(data.maxDailyAppointments !== undefined ? { maxDailyAppointments: data.maxDailyAppointments ? Number(data.maxDailyAppointments) : null } : {}),
        ...(data.roomNumber !== undefined ? { roomNumber: data.roomNumber?.trim() || null } : {}),
        ...(data.clinicLocation !== undefined ? { clinicLocation: data.clinicLocation?.trim() || null } : {}),
        ...(data.consultationFee !== undefined ? { consultationFee: Number(data.consultationFee) } : {}),
        ...(data.advanceBookingFee !== undefined ? { advanceBookingFee: Number(data.advanceBookingFee) } : {}),
        ...(data.bio !== undefined ? { bio: data.bio?.trim() || null } : {}),
        ...(data.profilePhotoUrl !== undefined ? { profilePhotoUrl: data.profilePhotoUrl?.trim() || null } : {}),
        ...(data.isActive !== undefined ? { isActive: !!data.isActive } : {}),
        ...(data.isAvailableForBooking !== undefined ? { isAvailableForBooking: !!data.isAvailableForBooking } : {}),
      },
    });

    // 3. Update services if provided
    if (data.serviceIds !== undefined) {
      await tx.doctorService.deleteMany({
        where: { doctorId },
      });

      if (data.serviceIds.length > 0) {
        await tx.doctorService.createMany({
          data: data.serviceIds.map((serviceId) => ({
            doctorId,
            serviceId,
          })),
          skipDuplicates: true,
        });
      }
    }

    return doc;
  });

  await recordAuditLog({
    userId: actorUserId,
    clinicId: current.clinicId,
    action: "UPDATE_DOCTOR",
    entity: "Doctor",
    entityId: doctorId,
    metadata: data as unknown as Record<string, unknown>,
  });

  return getDoctorById(doctorId);
}

/**
 * Toggles doctor active status (activation / deactivation).
 */
export async function toggleDoctorStatus(
  doctorId: string,
  isActive: boolean,
  actorUserId?: string
) {
  const current = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: { user: true },
  });

  if (!current) throw new Error("Doctor not found");

  await prisma.$transaction(async (tx) => {
    await tx.doctor.update({
      where: { id: doctorId },
      data: {
        isActive,
        isAvailableForBooking: isActive,
      },
    });

    await tx.user.update({
      where: { id: current.userId },
      data: { isActive },
    });
  });

  await recordAuditLog({
    userId: actorUserId,
    clinicId: current.clinicId,
    action: isActive ? "ACTIVATE_DOCTOR" : "DEACTIVATE_DOCTOR",
    entity: "Doctor",
    entityId: doctorId,
  });

  return getDoctorById(doctorId);
}

/**
 * Retrieves a doctor with full relations: User, Services, Schedules, Leaves, BlockedSlots.
 */
export async function getDoctorById(doctorId: string) {
  return prisma.doctor.findUnique({
    where: { id: doctorId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
        },
      },
      services: {
        include: {
          service: true,
        },
      },
      schedules: {
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
      leaves: {
        orderBy: { startDate: "desc" },
      },
      blockedSlots: {
        orderBy: { date: "desc" },
      },
    },
  });
}

/**
 * Lists doctors for a clinic with optional active filtering.
 */
export async function listDoctors(
  clinicId: string,
  options?: { isActive?: boolean; includeSchedules?: boolean }
) {
  return prisma.doctor.findMany({
    where: {
      clinicId,
      ...(options?.isActive !== undefined ? { isActive: options.isActive } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          isActive: true,
        },
      },
      services: {
        include: {
          service: {
            select: { id: true, name: true, durationMinutes: true, fee: true },
          },
        },
      },
      schedules: options?.includeSchedules ? true : false,
    },
    orderBy: { createdAt: "asc" },
  });
}
