import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";

/**
 * GET /api/doctor/patients/[id]/history
 * Strict RBAC: Accessible by DOCTOR, SUPER_ADMIN, and CLINIC_ADMIN.
 * Retrieves previous appointment history and clinical notes for patient continuity of care.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !["DOCTOR", "SUPER_ADMIN", "CLINIC_ADMIN"].includes(session.role)) {
      return errorResponse("Forbidden: Access restricted to medical practitioners", "FORBIDDEN", 403);
    }

    const { id: patientProfileId } = await params;

    // Fetch patient profile
    const profile = await prisma.patientProfile.findUnique({
      where: { id: patientProfileId },
      include: {
        user: { select: { fullName: true, email: true, phone: true } },
      },
    });

    if (!profile) {
      return errorResponse("Patient profile not found", "NOT_FOUND", 404);
    }

    // If DOCTOR, verify that this doctor has a legitimate treatment relationship with this patient
    if (session.role === "DOCTOR") {
      const doctor = await prisma.doctor.findUnique({ where: { userId: session.userId } });
      if (!doctor) {
        return errorResponse("Doctor profile not found", "FORBIDDEN", 403);
      }

      const hasAppointment = await prisma.appointment.findFirst({
        where: {
          patientProfileId,
          doctorId: doctor.id,
        },
      });

      if (!hasAppointment) {
        return errorResponse("Forbidden: You do not have a patient care relationship with this patient", "FORBIDDEN", 403);
      }
    }

    // Fetch past appointments
    const appointments = await prisma.appointment.findMany({
      where: { patientProfileId },
      include: {
        doctor: {
          include: {
            user: { select: { fullName: true } },
          },
        },
        service: { select: { name: true } },
      },
      orderBy: { appointmentDate: "desc" },
    });

    const history = appointments.map((a) => {
      let parsedNotes = null;
      if (a.doctorNotes) {
        try {
          parsedNotes = JSON.parse(a.doctorNotes);
        } catch {
          parsedNotes = { notes: a.doctorNotes };
        }
      }

      return {
        id: a.id,
        appointmentNumber: a.appointmentNumber,
        date: a.appointmentDate.toISOString().slice(0, 10),
        time: a.appointmentTime,
        status: a.status,
        service: a.service?.name || "Consultation",
        doctorName: a.doctor.user.fullName,
        symptoms: a.symptoms,
        doctorNotes: parsedNotes?.notes || a.doctorNotes || null,
        followUpDate: parsedNotes?.followUpDate || null,
        prescription: parsedNotes?.prescription || [],
        lifestyleAdvice: parsedNotes?.lifestyleAdvice || null,
      };
    });

    return successResponse({
      patient: {
        id: profile.id,
        fullName: profile.user.fullName,
        phone: profile.user.phone,
        email: profile.user.email,
        gender: profile.gender,
        dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.toISOString().slice(0, 10) : null,
        bloodGroup: profile.bloodGroup,
        emergencyContactName: profile.emergencyContactName,
        emergencyContactPhone: profile.emergencyContactPhone,
        medicalNotes: profile.medicalNotes,
      },
      history,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
