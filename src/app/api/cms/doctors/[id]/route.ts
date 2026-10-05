import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDoctorById, updateDoctor, toggleDoctorStatus } from "@/lib/services/doctor.service";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const { id } = await params;
    const doctor = await getDoctorById(id);
    if (!doctor) {
      return errorResponse("Doctor not found", "NOT_FOUND", 404);
    }

    return successResponse(doctor);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const { id } = await params;
    const current = await getDoctorById(id);
    if (!current) {
      return errorResponse("Doctor not found", "NOT_FOUND", 404);
    }

    const isSelfDoctor = session.role === "DOCTOR" && current.userId === session.userId;
    const isAdmin = ["SUPER_ADMIN", "CLINIC_ADMIN"].includes(session.role);

    if (!isSelfDoctor && !isAdmin) {
      return errorResponse("Forbidden: Insufficient privileges to update this doctor", "FORBIDDEN", 403);
    }

    const body = await request.json();

    const updated = await updateDoctor(
      id,
      {
        fullName: body.fullName,
        phone: body.phone,
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
        isActive: isAdmin ? body.isActive : undefined,
        isAvailableForBooking: body.isAvailableForBooking,
        serviceIds: body.serviceIds,
      },
      session.userId
    );

    return successResponse(updated, "Doctor profile updated successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session || !["SUPER_ADMIN", "CLINIC_ADMIN"].includes(session.role)) {
      return errorResponse("Forbidden: Admin privileges required", "FORBIDDEN", 403);
    }

    const { id } = await params;
    const deactivated = await toggleDoctorStatus(id, false, session.userId);

    return successResponse(deactivated, "Doctor successfully deactivated");
  } catch (error) {
    return handleApiError(error);
  }
}
