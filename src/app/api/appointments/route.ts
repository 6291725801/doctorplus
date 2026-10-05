import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  bookAppointment,
  listAppointments,
  getPatientAppointments,
  getDoctorAppointments,
} from "@/lib/services/appointment.service";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";
import { AppointmentStatus, AppointmentType } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    const { searchParams } = new URL(request.url);

    // If PATIENT, only return patient's own appointments
    if (session.role === "PATIENT") {
      const appointments = await getPatientAppointments(session.userId);
      return successResponse({ appointments, total: appointments.length });
    }

    // If DOCTOR, return doctor's appointments
    if (session.role === "DOCTOR") {
      const doctor = await prisma.doctor.findUnique({
        where: { userId: session.userId },
      });
      if (!doctor) {
        return errorResponse("Doctor profile not found", "NOT_FOUND", 404);
      }
      const date = searchParams.get("date") || undefined;
      const appointments = await getDoctorAppointments(doctor.id, date);
      return successResponse({ appointments, total: appointments.length });
    }

    // ADMIN or RECEPTIONIST: full list with filters
    if (["SUPER_ADMIN", "CLINIC_ADMIN", "RECEPTIONIST"].includes(session.role)) {
      const clinicId = searchParams.get("clinicId") || undefined;
      const doctorId = searchParams.get("doctorId") || undefined;
      const status = (searchParams.get("status") as AppointmentStatus) || undefined;
      const date = searchParams.get("date") || undefined;
      const startDate = searchParams.get("startDate") || undefined;
      const endDate = searchParams.get("endDate") || undefined;
      const search = searchParams.get("search") || undefined;
      const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
      const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

      const result = await listAppointments({
        clinicId,
        doctorId,
        status,
        date,
        startDate,
        endDate,
        search,
        page,
        limit,
      });

      return successResponse(result);
    }

    return errorResponse("Forbidden", "FORBIDDEN", 403);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const body = await request.json();

    const {
      doctorId,
      appointmentDate,
      appointmentTime,
      appointmentType,
      serviceId,
      patientProfileId,
      patientDetails,
      symptoms,
      patientNotes,
      paymentMethod,
      upiTransactionId,
    } = body;

    if (!doctorId || !appointmentDate || !appointmentTime) {
      return errorResponse(
        "Missing required booking fields: doctorId, appointmentDate, appointmentTime",
        "VALIDATION_ERROR",
        400
      );
    }

    // Determine patient identifier
    let patientUserId: string | undefined = undefined;
    const targetProfileId: string | undefined = patientProfileId;

    if (session && session.role === "PATIENT") {
      patientUserId = session.userId;
    } else if (!targetProfileId && !patientDetails && !session) {
      return errorResponse(
        "Patient information required. Please provide patientDetails (fullName, email, phone) or log in.",
        "VALIDATION_ERROR",
        400
      );
    }

    const appointment = await bookAppointment(
      {
        doctorId,
        appointmentDate,
        appointmentTime,
        appointmentType: (appointmentType as AppointmentType) || AppointmentType.IN_PERSON,
        serviceId: serviceId || undefined,
        patientProfileId: targetProfileId || undefined,
        patientUserId,
        patientDetails,
        symptoms,
        patientNotes,
        paymentMethod: paymentMethod || (upiTransactionId ? "UPI" : undefined),
        upiTransactionId,
      },
      session?.userId
    );

    return successResponse(appointment, "Appointment booked successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
