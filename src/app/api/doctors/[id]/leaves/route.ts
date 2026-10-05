import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { addDoctorLeave } from "@/lib/services/schedule.service";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);

    const { id } = await params;
    const leaves = await prisma.doctorLeave.findMany({
      where: { doctorId: id },
      orderBy: { startDate: "desc" },
    });

    return successResponse(leaves);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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
    if (!body.startDate || !body.endDate) {
      return errorResponse("Start date and end date are required.", "VALIDATION_ERROR", 400);
    }

    const leave = await addDoctorLeave(
      id,
      {
        startDate: body.startDate,
        endDate: body.endDate,
        reason: body.reason,
        isApproved: isAdmin ? body.isApproved ?? true : true,
      },
      session.userId
    );

    return successResponse(leave, "Doctor leave added successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
