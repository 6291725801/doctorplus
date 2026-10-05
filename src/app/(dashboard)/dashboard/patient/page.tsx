import React from "react";
import { getSession } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/services/auth.service";
import { getPatientAppointments } from "@/lib/services/appointment.service";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PatientAppointmentsView } from "@/components/patient/patient-appointments-view";
import Link from "next/link";

export default async function PatientDashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [user, appointments] = await Promise.all([
    getUserProfile(session.userId),
    getPatientAppointments(session.userId),
  ]);

  const serializedAppointments = appointments.map((a) => ({
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
      user: {
        fullName: a.doctor.user.fullName,
        phone: a.doctor.user.phone,
      },
    },
    service: a.service ? { name: a.service.name } : null,
  }));

  const upcomingCount = appointments.filter(
    (a) => a.status === "CONFIRMED" || a.status === "CHECKED_IN"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Patient Portal
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Welcome back, {user?.fullName || session.fullName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/patient/profile"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
          >
            My Profile
          </Link>
          <Link
            href="/dashboard/patient/payments"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
          >
            Payment History
          </Link>
          <Link
            href="/book"
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition cursor-pointer"
          >
            + Book Appointment
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Upcoming Consultations</CardTitle>
            <CardDescription className="text-xs">Active bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold text-teal-600 dark:text-teal-400">
              {upcomingCount}
            </p>
            <p className="text-xs text-slate-500 mt-1">Confirmed appointments scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Payment Status</CardTitle>
            <CardDescription className="text-xs">Consultation deposits</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Advance booking fee paid securely online. Remaining balance is settled at clinic reception upon arrival.
            </p>
            <Link
              href="/dashboard/patient/payments"
              className="inline-block mt-3 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
            >
              View Payment History →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Patient Profile</CardTitle>
            <CardDescription className="text-xs">Registered health details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
              <p>
                <strong>Name:</strong> {user?.fullName}
              </p>
              <p>
                <strong>Email:</strong> {user?.email}
              </p>
              <p>
                <strong>Phone:</strong> {user?.phone || "Not specified"}
              </p>
            </div>
            <Link
              href="/dashboard/patient/profile"
              className="inline-block mt-3 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
            >
              Edit Health Profile →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* APPOINTMENTS LIST */}
      <PatientAppointmentsView initialAppointments={serializedAppointments} />
    </div>
  );
}
