import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getActiveClinic } from "@/lib/services/cms.service";
import { recordAuditLog } from "@/lib/services/audit.service";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const allowedRoles = ["SUPER_ADMIN", "CLINIC_ADMIN"];
    if (!allowedRoles.includes(session.role)) {
      return errorResponse("Forbidden: Insufficient privileges", "FORBIDDEN", 403);
    }

    const { id } = await params;
    const activeClinic = await getActiveClinic();
    const clinicId = session.clinicId || activeClinic.id;
    const body = await request.json();

    const service = await prisma.service.update({
      where: { id, clinicId },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.slug ? { slug: body.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-") } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.shortDescription !== undefined ? { shortDescription: body.shortDescription } : {}),
        ...(body.durationMinutes !== undefined ? { durationMinutes: Number(body.durationMinutes) } : {}),
        ...(body.fee !== undefined ? { fee: Number(body.fee) } : {}),
        ...(body.iconUrl !== undefined ? { iconUrl: body.iconUrl } : {}),
        ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
        ...(body.isPopular !== undefined ? { isPopular: !!body.isPopular } : {}),
        ...(body.isActive !== undefined ? { isActive: !!body.isActive } : {}),
      },
    });

    await recordAuditLog({
      userId: session.userId,
      clinicId,
      action: "UPDATE_SERVICE",
      entity: "Service",
      entityId: service.id,
      metadata: body,
    });

    return successResponse(service, "Service updated successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const allowedRoles = ["SUPER_ADMIN", "CLINIC_ADMIN"];
    if (!allowedRoles.includes(session.role)) {
      return errorResponse("Forbidden: Insufficient privileges", "FORBIDDEN", 403);
    }

    const { id } = await params;
    const activeClinic = await getActiveClinic();
    const clinicId = session.clinicId || activeClinic.id;

    await prisma.service.delete({
      where: { id, clinicId },
    });

    await recordAuditLog({
      userId: session.userId,
      clinicId,
      action: "DELETE_SERVICE",
      entity: "Service",
      entityId: id,
    });

    return successResponse({ deleted: true }, "Service deleted successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
