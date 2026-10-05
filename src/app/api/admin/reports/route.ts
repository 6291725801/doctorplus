import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";
import {
  getDashboardMetrics,
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getDoctorWiseReport,
  getServiceWiseReport,
  getPaymentWiseReport,
  ReportFilterParams,
} from "@/lib/services/reports.service";
import { recordAuditLog } from "@/lib/services/audit.service";
import { AppointmentStatus, PaymentStatus } from "@prisma/client";

/**
 * GET /api/admin/reports
 * Strict RBAC: Accessible only by SUPER_ADMIN and CLINIC_ADMIN.
 * Computes live operational, clinical, and financial intelligence for the clinic.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["SUPER_ADMIN", "CLINIC_ADMIN"].includes(session.role)) {
      return errorResponse(
        "Forbidden: Reports and business intelligence are restricted to Clinic Administrators",
        "FORBIDDEN",
        403
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const doctorId = searchParams.get("doctorId") || undefined;
    const serviceId = searchParams.get("serviceId") || undefined;
    const statusParam = searchParams.get("status") || undefined;
    const paymentStatusParam = searchParams.get("paymentStatus") || undefined;
    const tab = searchParams.get("tab") || "all";

    const filters: ReportFilterParams = {
      startDate,
      endDate,
      doctorId: doctorId === "ALL" ? undefined : doctorId,
      serviceId: serviceId === "ALL" ? undefined : serviceId,
      status: statusParam && statusParam !== "ALL" ? (statusParam as AppointmentStatus) : undefined,
      paymentStatus:
        paymentStatusParam && paymentStatusParam !== "ALL"
          ? (paymentStatusParam as PaymentStatus)
          : undefined,
    };

    // Parallel execution of all requested reports
    const [
      dashboardMetrics,
      dailyReport,
      weeklyReport,
      monthlyReport,
      doctorWiseReport,
      serviceWiseReport,
      paymentWiseReport,
    ] = await Promise.all([
      getDashboardMetrics(filters),
      tab === "all" || tab === "daily" ? getDailyReport(filters) : Promise.resolve([]),
      tab === "all" || tab === "weekly" ? getWeeklyReport(filters) : Promise.resolve([]),
      tab === "all" || tab === "monthly" ? getMonthlyReport(filters) : Promise.resolve([]),
      tab === "all" || tab === "doctor" ? getDoctorWiseReport(filters) : Promise.resolve([]),
      tab === "all" || tab === "service" ? getServiceWiseReport(filters) : Promise.resolve([]),
      tab === "all" || tab === "payment" ? getPaymentWiseReport(filters) : Promise.resolve({
        byMethod: [],
        byStatus: [],
        totalCollected: 0,
        totalRefunded: 0,
        netRevenue: 0,
      }),
    ]);

    // Record audit trail for report access
    await recordAuditLog({
      userId: session.userId,
      action: "REPORT_VIEWED",
      entity: "Report",
      metadata: {
        tab,
        startDate: startDate || null,
        endDate: endDate || null,
        doctorId: doctorId || null,
        serviceId: serviceId || null,
      },
    });

    return successResponse({
      // 10 Core Dashboard KPIs
      dashboardMetrics,

      // Specific Reports
      dailyReport,
      weeklyReport,
      monthlyReport,
      doctorWiseReport,
      serviceWiseReport,
      paymentWiseReport,

      // Backwards compatibility for existing views
      summary: {
        totalAppointments: dashboardMetrics.completedAppointments + dashboardMetrics.upcomingAppointments + dashboardMetrics.cancelledAppointments + dashboardMetrics.noShowAppointments,
        totalPatients: dashboardMetrics.totalPatients,
        activeDoctors: doctorWiseReport.length,
        totalBilled: dashboardMetrics.revenue + dashboardMetrics.pendingPayments,
        advanceCollected: dashboardMetrics.advancePayments,
        balanceReceivable: dashboardMetrics.pendingPayments,
        completedRevenue: dashboardMetrics.revenue,
      },
      statusBreakdown: {
        COMPLETED: dashboardMetrics.completedAppointments,
        CANCELLED: dashboardMetrics.cancelledAppointments,
        NO_SHOW: dashboardMetrics.noShowAppointments,
      },
      filtersApplied: {
        startDate: startDate || null,
        endDate: endDate || null,
        doctorId: doctorId || "ALL",
        serviceId: serviceId || "ALL",
        status: statusParam || "ALL",
        paymentStatus: paymentStatusParam || "ALL",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
