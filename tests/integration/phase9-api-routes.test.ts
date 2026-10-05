import { describe, it, expect, vi, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { GET as getReportsRoute } from "@/app/api/admin/reports/route";
import { GET as getExportRoute } from "@/app/api/admin/reports/export/route";
import { GET as getAuditLogsRoute } from "@/app/api/admin/audit-logs/route";
import * as sessionModule from "@/lib/auth/session";

import { prisma } from "@/lib/db";

describe("Phase 9: API Route Integration Tests (Reports, Export & Audit Logs)", () => {
  beforeAll(async () => {
    const admin = await prisma.user.findFirst({
      where: { role: "CLINIC_ADMIN" },
    });

    // Mock getSession to return a valid CLINIC_ADMIN session by default
    vi.spyOn(sessionModule, "getSession").mockResolvedValue({
      userId: admin ? admin.id : null,
      clinicId: admin ? admin.clinicId : null,
      email: admin ? admin.email : "admin@ayurvedacare.test",
      role: "CLINIC_ADMIN",
    } as any);
  });

  describe("1. GET /api/admin/reports", () => {
    it("returns 403 FORBIDDEN when user session is missing or unauthorized", async () => {
      vi.spyOn(sessionModule, "getSession").mockResolvedValueOnce(null);

      const req = new NextRequest("http://localhost:3000/api/admin/reports");
      const res = await getReportsRoute(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("FORBIDDEN");
    });

    it("returns 200 OK with dashboard metrics and reports when authenticated as admin", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/reports?tab=all");
      const res = await getReportsRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toHaveProperty("dashboardMetrics");
      expect(json.data).toHaveProperty("dailyReport");
      expect(json.data).toHaveProperty("weeklyReport");
      expect(json.data).toHaveProperty("monthlyReport");
      expect(json.data).toHaveProperty("doctorWiseReport");
      expect(json.data).toHaveProperty("serviceWiseReport");
      expect(json.data).toHaveProperty("paymentWiseReport");

      const dm = json.data.dashboardMetrics;
      expect(dm).toHaveProperty("todayAppointments");
      expect(dm).toHaveProperty("upcomingAppointments");
      expect(dm).toHaveProperty("completedAppointments");
      expect(dm).toHaveProperty("cancelledAppointments");
      expect(dm).toHaveProperty("noShowAppointments");
      expect(dm).toHaveProperty("totalPatients");
      expect(dm).toHaveProperty("newPatients");
      expect(dm).toHaveProperty("revenue");
      expect(dm).toHaveProperty("pendingPayments");
      expect(dm).toHaveProperty("advancePayments");
    });

    it("filters reports by date and doctor query params", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/admin/reports?startDate=2026-10-01&endDate=2026-10-31&status=COMPLETED"
      );
      const res = await getReportsRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.filtersApplied.startDate).toBe("2026-10-01");
      expect(json.data.filtersApplied.endDate).toBe("2026-10-31");
      expect(json.data.filtersApplied.status).toBe("COMPLETED");
    });
  });

  describe("2. GET /api/admin/reports/export", () => {
    it("returns 403 when session is missing", async () => {
      vi.spyOn(sessionModule, "getSession").mockResolvedValueOnce(null);

      const req = new NextRequest("http://localhost:3000/api/admin/reports/export?type=daily");
      const res = await getExportRoute(req);
      expect(res.status).toBe(403);
    });

    it("returns 400 when invalid export type is requested", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/reports/export?type=unknown_format");
      const res = await getExportRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error.code).toBe("INVALID_EXPORT_TYPE");
    });

    it("exports daily report as CSV with proper headers and UTF-8 BOM", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/reports/export?type=daily");
      const res = await getExportRoute(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("text/csv");
      expect(res.headers.get("Content-Disposition")).toContain("attachment; filename=");
      expect(res.headers.get("Content-Disposition")).toContain("daily-operations");

      const arrayBuf = await res.clone().arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);
      expect(bytes[0]).toBe(0xef);
      expect(bytes[1]).toBe(0xbb);
      expect(bytes[2]).toBe(0xbf);

      const text = await res.text();
      expect(text).toContain("Date,Day of Week,Total Booked");
    });

    it("exports weekly report as CSV", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/reports/export?type=weekly");
      const res = await getExportRoute(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Disposition")).toContain("weekly-summary");
      const text = await res.text();
      expect(text).toContain("Week,Week Start,Week End");
    });

    it("exports doctor-wise performance report as CSV", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/reports/export?type=doctor");
      const res = await getExportRoute(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Disposition")).toContain("doctor-wise-performance");
      const text = await res.text();
      expect(text).toContain("Doctor ID,Doctor Name,Specialization");
    });

    it("exports service-wise breakdown report as CSV", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/reports/export?type=service");
      const res = await getExportRoute(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Disposition")).toContain("service-wise-breakdown");
      const text = await res.text();
      expect(text).toContain("Service ID,Service Name,Standard Fee (INR)");
    });

    it("exports payment-wise ledger report as CSV", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/reports/export?type=payment");
      const res = await getExportRoute(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Disposition")).toContain("payment-wise-ledger");
      const text = await res.text();
      expect(text).toContain("Payment Method,Payment Status,Transaction Count");
    });

    it("exports appointments audit ledger as CSV", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/reports/export?type=appointments");
      const res = await getExportRoute(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Disposition")).toContain("appointments-audit-ledger");
      const text = await res.text();
      expect(text).toContain("Appointment #,Date,Time,Patient Name");
    });
  });

  describe("3. GET /api/admin/audit-logs", () => {
    it("returns 403 when session is missing", async () => {
      vi.spyOn(sessionModule, "getSession").mockResolvedValueOnce(null);

      const req = new NextRequest("http://localhost:3000/api/admin/audit-logs");
      const res = await getAuditLogsRoute(req);
      expect(res.status).toBe(403);
    });

    it("returns paginated audit logs with search filter", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/audit-logs?page=1&limit=10&search=REPORT");
      const res = await getAuditLogsRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data.logs)).toBe(true);
      expect(json.data.pagination).toHaveProperty("total");
      expect(json.data.pagination).toHaveProperty("page");
      expect(json.data.pagination).toHaveProperty("limit");
    });
  });
});
