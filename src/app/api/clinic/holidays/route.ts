import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getActiveClinic } from "@/lib/services/cms.service";
import { addClinicHoliday, getClinicHolidays } from "@/lib/services/schedule.service";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);

    const activeClinic = await getActiveClinic();
    const clinicId = session.clinicId || activeClinic.id;
    const holidays = await getClinicHolidays(clinicId);

    return successResponse(holidays);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["SUPER_ADMIN", "CLINIC_ADMIN"].includes(session.role)) {
      return errorResponse("Forbidden: Admin privileges required", "FORBIDDEN", 403);
    }

    const activeClinic = await getActiveClinic();
    const clinicId = session.clinicId || activeClinic.id;
    const body = await request.json();

    if (!body.date || !body.title) {
      return errorResponse("Holiday date and title are required.", "VALIDATION_ERROR", 400);
    }

    const holiday = await addClinicHoliday(
      clinicId,
      {
        date: body.date,
        title: body.title,
        description: body.description,
      },
      session.userId
    );

    return successResponse(holiday, "Clinic holiday added successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
