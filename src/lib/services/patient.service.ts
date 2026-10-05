import { prisma } from "@/lib/db";
import { recordAuditLog } from "@/lib/services/audit.service";
import { Gender } from "@prisma/client";

export interface UpdatePatientProfileInput {
  fullName?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: Gender;
  bloodGroup?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalNotes?: string;
}

/**
 * Retrieves a patient's full medical and account profile.
 */
export async function getPatientProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      role: true,
      createdAt: true,
      patientProfile: true,
    },
  });

  if (!user) {
    throw new Error("Patient user not found");
  }

  // Ensure patientProfile exists
  let profile = user.patientProfile;
  if (!profile) {
    profile = await prisma.patientProfile.create({
      data: { userId },
    });
  }

  return {
    ...user,
    profile,
  };
}

/**
 * Updates a patient's personal, emergency, and clinical details.
 */
export async function updatePatientProfile(userId: string, input: UpdatePatientProfileInput) {
  const profile = await prisma.$transaction(async (tx) => {
    // 1. Update user record (name and phone)
    if (input.fullName !== undefined || input.phone !== undefined) {
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(input.fullName ? { fullName: input.fullName.trim() } : {}),
          ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
        },
      });
    }

    // 2. Upsert patient profile
    return tx.patientProfile.upsert({
      where: { userId },
      create: {
        userId,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        gender: input.gender || null,
        bloodGroup: input.bloodGroup?.trim() || null,
        address: input.address?.trim() || null,
        city: input.city?.trim() || null,
        state: input.state?.trim() || null,
        postalCode: input.postalCode?.trim() || null,
        emergencyContactName: input.emergencyContactName?.trim() || null,
        emergencyContactPhone: input.emergencyContactPhone?.trim() || null,
        medicalNotes: input.medicalNotes?.trim() || null,
      },
      update: {
        ...(input.dateOfBirth !== undefined ? { dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null } : {}),
        ...(input.gender !== undefined ? { gender: input.gender } : {}),
        ...(input.bloodGroup !== undefined ? { bloodGroup: input.bloodGroup?.trim() || null } : {}),
        ...(input.address !== undefined ? { address: input.address?.trim() || null } : {}),
        ...(input.city !== undefined ? { city: input.city?.trim() || null } : {}),
        ...(input.state !== undefined ? { state: input.state?.trim() || null } : {}),
        ...(input.postalCode !== undefined ? { postalCode: input.postalCode?.trim() || null } : {}),
        ...(input.emergencyContactName !== undefined ? { emergencyContactName: input.emergencyContactName?.trim() || null } : {}),
        ...(input.emergencyContactPhone !== undefined ? { emergencyContactPhone: input.emergencyContactPhone?.trim() || null } : {}),
        ...(input.medicalNotes !== undefined ? { medicalNotes: input.medicalNotes?.trim() || null } : {}),
      },
    });
  });

  // Record audit log outside interactive transaction to avoid lock contention
  const clinic = await prisma.clinic.findFirst({ select: { id: true } });
  await recordAuditLog({
    userId,
    clinicId: clinic?.id,
    action: "UPDATE_PATIENT_PROFILE",
    entity: "PatientProfile",
    entityId: profile.id,
    metadata: { fieldsUpdated: Object.keys(input) },
  });

  return profile;
}

/**
 * Retrieves payment history and financial ledger for a patient.
 */
export async function getPatientPaymentHistory(userId: string) {
  const profile = await prisma.patientProfile.findUnique({
    where: { userId },
  });

  if (!profile) return [];

  const appointments = await prisma.appointment.findMany({
    where: { patientProfileId: profile.id },
    include: {
      doctor: {
        include: {
          user: { select: { fullName: true } },
        },
      },
      service: { select: { name: true } },
      payments: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { appointmentDate: "desc" },
  });

  return appointments.map((appt) => ({
    id: appt.id,
    appointmentNumber: appt.appointmentNumber,
    appointmentDate: appt.appointmentDate.toISOString().slice(0, 10),
    appointmentTime: appt.appointmentTime,
    appointmentType: appt.appointmentType,
    status: appt.status,
    paymentStatus: appt.paymentStatus,
    consultationFee: Number(appt.consultationFee),
    advanceAmount: Number(appt.advanceAmount),
    balanceAmount: Number(appt.balanceAmount),
    doctorName: appt.doctor.user.fullName,
    serviceName: appt.service?.name || "Ayurvedic Consultation",
    payments: appt.payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      status: p.status,
      paymentMethod: p.method,
      transactionId: p.paymentReference,
      createdAt: p.createdAt.toISOString(),
    })),
  }));
}

/**
 * Generates an official, verifiable receipt for a patient appointment.
 */
export async function getAppointmentReceipt(appointmentId: string, userId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      clinic: {
        include: { siteSettings: true },
      },
      doctor: {
        include: {
          user: { select: { fullName: true, email: true, phone: true } },
        },
      },
      patientProfile: {
        include: {
          user: { select: { fullName: true, email: true, phone: true } },
        },
      },
      service: true,
      payments: true,
    },
  });

  if (!appointment) {
    throw new Error("Appointment not found");
  }

  // Security check: verify this appointment belongs to the requesting patient (or clinic admin/receptionist)
  const isOwner = appointment.patientProfile.userId === userId;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const isStaff = user?.role === "CLINIC_ADMIN" || user?.role === "SUPER_ADMIN" || user?.role === "RECEPTIONIST";

  if (!isOwner && !isStaff) {
    throw new Error("Unauthorized to access this receipt.");
  }

  const clinic = appointment.clinic;
  const siteSettings = clinic.siteSettings;

  return {
    receiptNumber: `REC-${appointment.appointmentNumber.replace("APT-", "")}`,
    invoiceDate: appointment.createdAt.toISOString().slice(0, 10),
    appointmentNumber: appointment.appointmentNumber,
    appointmentDate: appointment.appointmentDate.toISOString().slice(0, 10),
    appointmentTime: appointment.appointmentTime,
    appointmentType: appointment.appointmentType,
    status: appointment.status,
    clinic: {
      name: clinic.name,
      address: siteSettings?.address || clinic.address || "123 Health Boulevard, Healthcare District",
      phone: siteSettings?.contactPhone || clinic.phone || "+91 98765 43210",
      email: siteSettings?.contactEmail || clinic.email || "care@ayurvedacare.com",
      logoUrl: siteSettings?.logoUrl,
    },
    patient: {
      fullName: appointment.patientProfile.user.fullName,
      email: appointment.patientProfile.user.email,
      phone: appointment.patientProfile.user.phone,
      address: appointment.patientProfile.address,
      city: appointment.patientProfile.city,
    },
    doctor: {
      fullName: appointment.doctor.user.fullName,
      specialization: appointment.doctor.specialization,
      qualification: appointment.doctor.qualification,
      registrationNumber: appointment.doctor.registrationNumber,
    },
    service: {
      name: appointment.service?.name || "Doctor Consultation",
      durationMinutes: appointment.service?.durationMinutes || appointment.doctor.appointmentDurationMinutes,
    },
    financials: {
      consultationFee: Number(appointment.consultationFee),
      advancePaid: Number(appointment.advanceAmount),
      balanceDue: Number(appointment.balanceAmount),
      paymentStatus: appointment.paymentStatus,
      currency: "INR",
    },
  };
}
