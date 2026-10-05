import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { deleteDoctorBlockedSlot } from "@/lib/services/schedule.service";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";

interface RouteParams {
  params: Promise<{ id: string; slotId: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);

    const { id, slotId } = await params;
    const slot = await prisma.doctorBlockedSlot.findUnique({
      where: { id: slotId },
      include: { doctor: { select: { userId: true } } },
    });

    if (!slot || slot.doctorId !== id) {
      return errorResponse("Blocked slot not found", "NOT_FOUND", 404);
    }

    const isSelfDoctor = session.role === "DOCTOR" && slot.doctor.userId === session.userId;
    const isAdmin = ["SUPER_ADMIN", "CLINIC_ADMIN"].includes(session.role);

    if (!isSelfDoctor && !isAdmin) {
      return errorResponse("Forbidden", "FORBIDDEN", 403);
    }

    await deleteDoctorBlockedSlot(slotId, session.userId);
    return successResponse({ deleted: true }, "Blocked slot deleted successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
