import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";
import { assertTenantAccess } from "@/lib/auth/tenant";
import { recordAuditLog } from "@/lib/services/audit.service";
import { getActiveClinic } from "@/lib/services/cms.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["SUPER_ADMIN", "CLINIC_ADMIN", "RECEPTIONIST"].includes(session.role)) {
      return errorResponse("Unauthorized: Admin or staff access required", "FORBIDDEN", 403);
    }

    const { searchParams } = new URL(request.url);
    const targetClinicId = searchParams.get("clinicId");
    const activeClinic = await getActiveClinic();
    const effectiveClinicId = assertTenantAccess(
      session,
      targetClinicId || session.clinicId || activeClinic.id
    );

    const clinic = await prisma.clinic.findUnique({
      where: { id: effectiveClinicId },
      include: {
        settings: true,
        siteSettings: true,
      },
    });

    if (!clinic) {
      return errorResponse("Clinic not found", "NOT_FOUND", 404);
    }

    return successResponse(clinic, "Clinic settings retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["SUPER_ADMIN", "CLINIC_ADMIN"].includes(session.role)) {
      return errorResponse("Unauthorized: Admin access required", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const activeClinic = await getActiveClinic();
    const effectiveClinicId = assertTenantAccess(
      session,
      body.clinicId || session.clinicId || activeClinic.id
    );

    const {
      name,
      phone,
      email,
      address,
      city,
      state,
      postalCode,
      country,
      description,
      // Clinic appointment & operational rules
      openingTime,
      closingTime,
      defaultSlotDurationMinutes,
      maxAdvanceBookingDays,
      cancellationCutoffHours,
      minAdvanceAmount,
      enableOnlinePayment,
      currency,
      timezone,
    } = body;

    // Update clinic core info
    const updatedClinic = await prisma.clinic.update({
      where: { id: effectiveClinicId },
      data: {
        name: name !== undefined ? name : undefined,
        phone: phone !== undefined ? phone : undefined,
        email: email !== undefined ? email : undefined,
        address: address !== undefined ? address : undefined,
        city: city !== undefined ? city : undefined,
        state: state !== undefined ? state : undefined,
        postalCode: postalCode !== undefined ? postalCode : undefined,
        country: country !== undefined ? country : undefined,
        description: description !== undefined ? description : undefined,
      },
    });

    // Update or upsert operational settings
    const updatedSettings = await prisma.clinicSettings.upsert({
      where: { clinicId: effectiveClinicId },
      update: {
        openingTime: openingTime !== undefined ? openingTime : undefined,
        closingTime: closingTime !== undefined ? closingTime : undefined,
        defaultSlotDurationMinutes:
          defaultSlotDurationMinutes !== undefined ? Number(defaultSlotDurationMinutes) : undefined,
        maxAdvanceBookingDays:
          maxAdvanceBookingDays !== undefined ? Number(maxAdvanceBookingDays) : undefined,
        cancellationCutoffHours:
          cancellationCutoffHours !== undefined ? Number(cancellationCutoffHours) : undefined,
        minAdvanceAmount:
          minAdvanceAmount !== undefined ? Number(minAdvanceAmount) : undefined,
        enableOnlinePayment:
          enableOnlinePayment !== undefined ? Boolean(enableOnlinePayment) : undefined,
        currency: currency !== undefined ? currency : undefined,
        timezone: timezone !== undefined ? timezone : undefined,
      },
      create: {
        clinicId: effectiveClinicId,
        openingTime: openingTime || "09:00",
        closingTime: closingTime || "20:00",
        defaultSlotDurationMinutes: defaultSlotDurationMinutes ? Number(defaultSlotDurationMinutes) : 15,
        maxAdvanceBookingDays: maxAdvanceBookingDays ? Number(maxAdvanceBookingDays) : 30,
        cancellationCutoffHours: cancellationCutoffHours ? Number(cancellationCutoffHours) : 2,
        minAdvanceAmount: minAdvanceAmount ? Number(minAdvanceAmount) : 100.0,
        enableOnlinePayment: enableOnlinePayment !== undefined ? Boolean(enableOnlinePayment) : true,
        currency: currency || "INR",
        timezone: timezone || "Asia/Kolkata",
      },
    });

    await recordAuditLog({
      userId: session.userId,
      clinicId: effectiveClinicId,
      action: "CLINIC_SETTINGS_UPDATE",
      entity: "ClinicSettings",
      entityId: updatedSettings.id,
      metadata: {
        updatedFields: Object.keys(body),
      },
    });

    return successResponse(
      { clinic: updatedClinic, settings: updatedSettings },
      "Clinic profile and operational rules updated successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
