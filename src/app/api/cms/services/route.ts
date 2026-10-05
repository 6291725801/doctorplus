import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getActiveClinic } from "@/lib/services/cms.service";
import { recordAuditLog } from "@/lib/services/audit.service";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";

export async function GET() {
  try {
    const activeClinic = await getActiveClinic();
    const services = await prisma.service.findMany({
      where: { clinicId: activeClinic.id },
      orderBy: { sortOrder: "asc" },
    });
    return successResponse(services);
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
      return errorResponse("Forbidden: Insufficient privileges", "FORBIDDEN", 403);
    }

    const activeClinic = await getActiveClinic();
    const clinicId = session.clinicId || activeClinic.id;
    const body = await request.json();

    const { name, slug, description, shortDescription, durationMinutes, fee, iconUrl, imageUrl, isPopular, isActive } = body;

    if (!name || !slug) {
      return errorResponse("Service name and slug are required", "VALIDATION_ERROR", 422);
    }

    const service = await prisma.service.create({
      data: {
        clinicId,
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        description,
        shortDescription,
        durationMinutes: durationMinutes ? Number(durationMinutes) : 30,
        fee: fee ? Number(fee) : 500.0,
        iconUrl,
        imageUrl,
        isPopular: !!isPopular,
        isActive: isActive !== undefined ? !!isActive : true,
      },
    });

    await recordAuditLog({
      userId: session.userId,
      clinicId,
      action: "CREATE_SERVICE",
      entity: "Service",
      entityId: service.id,
      metadata: { name: service.name, fee: service.fee },
    });

    return successResponse(service, "Service created successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
