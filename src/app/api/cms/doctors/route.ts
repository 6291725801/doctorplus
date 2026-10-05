import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getActiveClinic } from "@/lib/services/cms.service";
import { createDoctor, listDoctors } from "@/lib/services/doctor.service";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const activeClinic = await getActiveClinic();
    const clinicId = session.clinicId || activeClinic.id;
    const doctors = await listDoctors(clinicId, { includeSchedules: true });

    return successResponse(doctors);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const allowedRoles = ["SUPER_ADMIN", "CLINIC_ADMIN"];
    if (!allowedRoles.includes(session.role)) {
      return errorResponse("Forbidden: Admin privileges required to add a doctor", "FORBIDDEN", 403);
    }

    const activeClinic = await getActiveClinic();
    const clinicId = session.clinicId || activeClinic.id;
    const body = await request.json();

    if (!body.fullName || !body.email || !body.specialization || !body.qualification) {
      return errorResponse(
        "Missing required fields: fullName, email, specialization, and qualification are mandatory.",
        "VALIDATION_ERROR",
        420
      );
    }

    const doctor = await createDoctor(
      {
        clinicId,
        fullName: body.fullName,
        email: body.email,
        phone: body.phone,
        password: body.password,
        specialization: body.specialization,
        qualification: body.qualification,
        experienceYears: body.experienceYears,
        registrationNumber: body.registrationNumber,
        languages: body.languages,
        appointmentDurationMinutes: body.appointmentDurationMinutes,
        roomNumber: body.roomNumber,
        clinicLocation: body.clinicLocation,
        consultationFee: body.consultationFee,
        advanceBookingFee: body.advanceBookingFee,
        bio: body.bio,
        profilePhotoUrl: body.profilePhotoUrl,
        serviceIds: body.serviceIds,
        initialSchedules: body.initialSchedules,
      },
      session.userId
    );

    return successResponse(doctor, "Doctor created successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
