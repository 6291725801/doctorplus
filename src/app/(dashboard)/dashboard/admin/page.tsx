import React from "react";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getHomepageData } from "@/lib/services/cms.service";
import { AdminDashboardView } from "@/components/cms/admin-dashboard-view";
import { prisma } from "@/lib/db";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session || !["SUPER_ADMIN", "CLINIC_ADMIN", "CONTENT_MANAGER"].includes(session.role)) {
    redirect("/login");
  }

  const [homepageData, clinicHolidays, allClinicDoctors, allPatients, allAppointments] = await Promise.all([
    getHomepageData(),
    prisma.clinicHoliday.findMany({
      where: { clinic: { isActive: true } },
      orderBy: { date: "asc" },
    }),
    prisma.doctor.findMany({
      where: { clinic: { isActive: true } },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true, isActive: true } },
        services: { include: { service: { select: { id: true, name: true } } } },
        schedules: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
        leaves: { orderBy: { startDate: "desc" } },
        blockedSlots: { orderBy: { date: "desc" } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "PATIENT" },
      include: {
        patientProfile: {
          include: {
            appointments: {
              select: { id: true, status: true, appointmentDate: true },
              orderBy: { appointmentDate: "desc" },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.appointment.findMany({
      include: {
        doctor: {
          include: {
            user: { select: { fullName: true, phone: true } },
          },
        },
        patientProfile: {
          include: {
            user: { select: { fullName: true, email: true, phone: true } },
          },
        },
        service: { select: { name: true } },
      },
      orderBy: [{ appointmentDate: "desc" }, { appointmentTime: "asc" }],
      take: 100,
    }),
  ]);

  const serializedPatients = allPatients.map((u) => {
    const p = u.patientProfile;
    const appts = p?.appointments || [];
    return {
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString().slice(0, 10),
      gender: p?.gender || null,
      dateOfBirth: p?.dateOfBirth ? p.dateOfBirth.toISOString().slice(0, 10) : null,
      bloodGroup: p?.bloodGroup || null,
      city: p?.city || null,
      emergencyContactName: p?.emergencyContactName || null,
      emergencyContactPhone: p?.emergencyContactPhone || null,
      medicalNotes: p?.medicalNotes || null,
      totalAppointments: appts.length,
      lastAppointmentDate: appts.length > 0 ? appts[0].appointmentDate.toISOString().slice(0, 10) : null,
    };
  });

  const serializedAppointments = allAppointments.map((a) => ({
    id: a.id,
    appointmentNumber: a.appointmentNumber,
    appointmentDate: a.appointmentDate.toISOString().slice(0, 10),
    appointmentTime: a.appointmentTime,
    appointmentType: a.appointmentType,
    status: a.status,
    consultationFee: Number(a.consultationFee),
    advanceAmount: Number(a.advanceAmount),
    balanceAmount: Number(a.balanceAmount),
    paymentStatus: a.paymentStatus,
    symptoms: a.symptoms,
    patientNotes: a.patientNotes,
    doctorNotes: a.doctorNotes,
    cancellationReason: a.cancellationReason,
    doctor: {
      id: a.doctor.id,
      specialization: a.doctor.specialization,
      roomNumber: a.doctor.roomNumber,
      clinicLocation: a.doctor.clinicLocation,
      user: {
        fullName: a.doctor.user.fullName,
        phone: a.doctor.user.phone,
      },
    },
    patientProfile: {
      user: {
        fullName: a.patientProfile.user.fullName,
        email: a.patientProfile.user.email,
        phone: a.patientProfile.user.phone,
      },
    },
    service: a.service ? { name: a.service.name } : null,
  }));

  const serializedData = {
    clinic: homepageData.clinic,
    siteSettings: homepageData.siteSettings,
    clinicSettings: homepageData.clinicSettings
      ? {
          ...homepageData.clinicSettings,
          minAdvanceAmount: Number(homepageData.clinicSettings.minAdvanceAmount),
        }
      : null,
    sections: homepageData.sections,
    services: homepageData.services.map((s) => ({
      ...s,
      fee: Number(s.fee),
    })),
    doctors: allClinicDoctors.map((d) => ({
      ...d,
      consultationFee: Number(d.consultationFee),
      advanceBookingFee: Number(d.advanceBookingFee),
    })),
    holidays: clinicHolidays.map((h) => ({
      ...h,
      date: h.date.toISOString().split("T")[0],
    })),
    patients: serializedPatients,
    appointments: serializedAppointments,
  };

  return <AdminDashboardView initialData={serializedData} userRole={session.role} />;
}
