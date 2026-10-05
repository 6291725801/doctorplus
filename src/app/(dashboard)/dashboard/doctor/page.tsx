import React from "react";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DoctorWorkspaceView } from "@/components/doctor/doctor-workspace-view";

export default async function DoctorDashboardPage() {
  const session = await getSession();
  if (!session || !["DOCTOR", "SUPER_ADMIN", "CLINIC_ADMIN"].includes(session.role)) {
    redirect("/login");
  }

  // Find the doctor record corresponding to the logged in user or first clinic doctor
  const doctor = await prisma.doctor.findFirst({
    where: session.role === "DOCTOR" ? { userId: session.userId } : { clinic: { isActive: true } },
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
      clinic: { select: { id: true, name: true } },
      services: {
        include: {
          service: {
            select: { id: true, name: true, durationMinutes: true, fee: true },
          },
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
      appointments: {
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
          service: true,
        },
        orderBy: [{ appointmentDate: "desc" }, { appointmentTime: "asc" }],
      },
    },
  });

  if (!doctor) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Doctor Profile Not Found</h2>
        <p className="text-sm text-slate-500 mt-2">
          Your account is not linked to an active doctor clinical profile. Please contact your clinic administrator.
        </p>
      </div>
    );
  }

  const serializedDoctor = {
    ...doctor,
    consultationFee: Number(doctor.consultationFee),
    advanceBookingFee: Number(doctor.advanceBookingFee),
    services: doctor.services.map((s) => ({
      ...s,
      service: {
        ...s.service,
        fee: Number(s.service.fee),
      },
    })),
  };

  const serializedAppointments = doctor.appointments.map((a) => ({
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
      id: doctor.id,
      specialization: doctor.specialization,
      user: {
        fullName: doctor.user.fullName,
        phone: doctor.user.phone,
      },
    },
    patientProfile: {
      id: a.patientProfile.id,
      gender: a.patientProfile.gender,
      dateOfBirth: a.patientProfile.dateOfBirth ? a.patientProfile.dateOfBirth.toISOString().slice(0, 10) : null,
      bloodGroup: a.patientProfile.bloodGroup,
      emergencyContactName: a.patientProfile.emergencyContactName,
      emergencyContactPhone: a.patientProfile.emergencyContactPhone,
      medicalNotes: a.patientProfile.medicalNotes,
      user: {
        fullName: a.patientProfile.user.fullName,
        email: a.patientProfile.user.email,
        phone: a.patientProfile.user.phone,
      },
    },
    service: a.service ? { name: a.service.name } : null,
  }));

  return <DoctorWorkspaceView doctor={serializedDoctor} appointments={serializedAppointments} />;
}
