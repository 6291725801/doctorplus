import React from "react";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { listAppointments } from "@/lib/services/appointment.service";
import { AppointmentDeskView } from "@/components/appointments/appointment-desk-view";

export default async function ReceptionistDashboardPage() {
  const session = await getSession();
  if (!session || !["RECEPTIONIST", "SUPER_ADMIN", "CLINIC_ADMIN"].includes(session.role)) {
    redirect("/login");
  }

  const [appointmentsData, doctors] = await Promise.all([
    listAppointments({ limit: 100 }),
    prisma.doctor.findMany({
      where: { clinic: { isActive: true } },
      include: { user: { select: { fullName: true } } },
    }),
  ]);

  const serializedAppointments = appointmentsData.appointments.map((a) => ({
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

  const doctorOptions = doctors.map((d) => ({
    id: d.id,
    name: `${d.user.fullName} (${d.specialization})`,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Reception Desk Portal
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time patient intake, check-ins, appointment scheduling, and slot capacity monitoring.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="blue">Reception Role: {session.fullName}</Badge>
          <a href="/book" target="_blank">
            <button className="px-3 py-1.5 text-xs font-bold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition cursor-pointer">
              + New Booking
            </button>
          </a>
        </div>
      </div>

      <AppointmentDeskView
        initialAppointments={serializedAppointments}
        doctors={doctorOptions}
        role={session.role as "RECEPTIONIST" | "SUPER_ADMIN" | "CLINIC_ADMIN"}
      />
    </div>
  );
}
