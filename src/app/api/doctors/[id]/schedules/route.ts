import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { saveDoctorWeeklySchedules } from "@/lib/services/schedule.service";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);

    const { id } = await params;
    const schedules = await prisma.doctorSchedule.findMany({
      where: { doctorId: id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    return successResponse(schedules);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);

    const { id } = await params;
    const doctor = await prisma.doctor.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!doctor) return errorResponse("Doctor not found", "NOT_FOUND", 404);

    const isSelfDoctor = session.role === "DOCTOR" && doctor.userId === session.userId;
    const isAdmin = ["SUPER_ADMIN", "CLINIC_ADMIN"].includes(session.role);

    if (!isSelfDoctor && !isAdmin) {
      return errorResponse("Forbidden", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const schedules = Array.isArray(body) ? body : body.schedules;

    if (!Array.isArray(schedules)) {
      return errorResponse("Invalid schedules payload: expected an array", "VALIDATION_ERROR", 400);
    }

    const updated = await saveDoctorWeeklySchedules(id, schedules, session.userId);
    return successResponse(updated, "Doctor schedules updated successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
