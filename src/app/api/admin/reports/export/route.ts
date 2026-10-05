import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { errorResponse, handleApiError } from "@/lib/utils/api-response";
import {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getDoctorWiseReport,
  getServiceWiseReport,
  getPaymentWiseReport,
  getAppointmentsLedgerForExport,
  ReportFilterParams,
} from "@/lib/services/reports.service";
import {
  exportDailyReportCsv,
  exportWeeklyReportCsv,
  exportMonthlyReportCsv,
  exportDoctorWiseReportCsv,
  exportServiceWiseReportCsv,
  exportPaymentWiseReportCsv,
  exportAppointmentsLedgerCsv,
} from "@/lib/services/csv-export.service";
import { recordAuditLog } from "@/lib/services/audit.service";
import { AppointmentStatus, PaymentStatus } from "@prisma/client";

/**
 * GET /api/admin/reports/export
 * Downloads high-performance, RFC-4180 compliant CSV reports for administrative analysis.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["SUPER_ADMIN", "CLINIC_ADMIN"].includes(session.role)) {
      return errorResponse(
        "Forbidden: Report exports are restricted to Clinic Administrators",
        "FORBIDDEN",
        403
      );
    }

    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") || "daily").toLowerCase();
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const doctorId = searchParams.get("doctorId") || undefined;
    const serviceId = searchParams.get("serviceId") || undefined;
    const statusParam = searchParams.get("status") || undefined;
    const paymentStatusParam = searchParams.get("paymentStatus") || undefined;

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

    let csvContent = "";
    let filenamePrefix = "clinic-report";

    switch (type) {
      case "daily": {
        const rows = await getDailyReport(filters);
        csvContent = exportDailyReportCsv(rows);
        filenamePrefix = "daily-operations";
        break;
      }
      case "weekly": {
        const rows = await getWeeklyReport(filters);
        csvContent = exportWeeklyReportCsv(rows);
        filenamePrefix = "weekly-summary";
        break;
      }
      case "monthly": {
        const rows = await getMonthlyReport(filters);
        csvContent = exportMonthlyReportCsv(rows);
        filenamePrefix = "monthly-performance";
        break;
      }
      case "doctor":
      case "doctor-wise": {
        const rows = await getDoctorWiseReport(filters);
        csvContent = exportDoctorWiseReportCsv(rows);
        filenamePrefix = "doctor-wise-performance";
        break;
      }
      case "service":
      case "service-wise": {
        const rows = await getServiceWiseReport(filters);
        csvContent = exportServiceWiseReportCsv(rows);
        filenamePrefix = "service-wise-breakdown";
        break;
      }
      case "payment":
      case "payment-wise": {
        const res = await getPaymentWiseReport(filters);
        // Combine payment methods and statuses for a comprehensive export
        const rows = [...res.byMethod, ...res.byStatus];
        csvContent = exportPaymentWiseReportCsv(rows);
        filenamePrefix = "payment-wise-ledger";
        break;
      }
      case "appointments":
      case "ledger": {
        const rows = await getAppointmentsLedgerForExport(filters);
        csvContent = exportAppointmentsLedgerCsv(rows);
        filenamePrefix = "appointments-audit-ledger";
        break;
      }
      default: {
        return errorResponse(
          `Invalid export type '${type}'. Supported types: daily, weekly, monthly, doctor-wise, service-wise, payment-wise, appointments`,
          "INVALID_EXPORT_TYPE",
          400
        );
      }
    }

    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `${filenamePrefix}-${dateStamp}.csv`;

    // Audit log
    await recordAuditLog({
      userId: session.userId,
      action: "REPORT_EXPORTED",
      entity: "Report",
      metadata: {
        type,
        filename,
        startDate: startDate || null,
        endDate: endDate || null,
        doctorId: doctorId || null,
      },
    });

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
