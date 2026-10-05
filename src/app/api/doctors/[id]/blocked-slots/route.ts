import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { addDoctorBlockedSlot } from "@/lib/services/schedule.service";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);

    const { id } = await params;
    const slots = await prisma.doctorBlockedSlot.findMany({
      where: { doctorId: id },
      orderBy: { date: "desc" },
    });

    return successResponse(slots);
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
    if (!body.date) {
      return errorResponse("Date is required.", "VALIDATION_ERROR", 400);
    }

    const blocked = await addDoctorBlockedSlot(
      id,
      {
        date: body.date,
        startTime: body.startTime,
        endTime: body.endTime,
        reason: body.reason,
      },
      session.userId
    );

    return successResponse(blocked, "Blocked slot created successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
