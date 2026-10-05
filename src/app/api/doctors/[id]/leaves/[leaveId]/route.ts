import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { deleteDoctorLeave } from "@/lib/services/schedule.service";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";

interface RouteParams {
  params: Promise<{ id: string; leaveId: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);

    const { id, leaveId } = await params;
    const leave = await prisma.doctorLeave.findUnique({
      where: { id: leaveId },
      include: { doctor: { select: { userId: true } } },
    });

    if (!leave || leave.doctorId !== id) {
      return errorResponse("Leave not found", "NOT_FOUND", 404);
    }

    const isSelfDoctor = session.role === "DOCTOR" && leave.doctor.userId === session.userId;
    const isAdmin = ["SUPER_ADMIN", "CLINIC_ADMIN"].includes(session.role);

    if (!isSelfDoctor && !isAdmin) {
      return errorResponse("Forbidden", "FORBIDDEN", 403);
    }

    await deleteDoctorLeave(leaveId, session.userId);
    return successResponse({ deleted: true }, "Leave deleted successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
