import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { sendAppointmentReminderNotification } from "@/lib/services/notification.service";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";

/**
 * Dispatches appointment reminders for appointments happening in the upcoming window.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    // Allow cron with internal token or authorized admins
    const authHeader = request.headers.get("authorization");
    const isCron = authHeader && process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!isCron && (!session || !["SUPER_ADMIN", "CLINIC_ADMIN"].includes(session.role))) {
      return errorResponse("Forbidden: Insufficient privileges", "FORBIDDEN", 403);
    }

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dayAfterTomorrow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Find confirmed appointments scheduled within upcoming 48 hours
    const upcoming = await prisma.appointment.findMany({
      where: {
        status: "CONFIRMED",
        appointmentDate: {
          gte: tomorrow,
          lte: dayAfterTomorrow,
        },
      },
      select: { id: true, appointmentNumber: true, appointmentDate: true },
      take: 50,
    });

    const results = [];
    for (const appt of upcoming) {
      const res = await sendAppointmentReminderNotification(appt.id);
      results.push({ appointmentId: appt.id, appointmentNumber: appt.appointmentNumber, results: res });
    }

    return successResponse({
      count: results.length,
      dispatched: results,
    }, `Dispatched ${results.length} appointment reminders`);
  } catch (error) {
    return handleApiError(error);
  }
}
