import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import {
  getDashboardMetrics,
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getDoctorWiseReport,
  getServiceWiseReport,
  getPaymentWiseReport,
  getAppointmentsLedgerForExport,
} from "@/lib/services/reports.service";
import {
  buildCsv,
  escapeCsvValue,
  exportDailyReportCsv,
  exportWeeklyReportCsv,
  exportMonthlyReportCsv,
  exportDoctorWiseReportCsv,
  exportServiceWiseReportCsv,
  exportPaymentWiseReportCsv,
  exportAppointmentsLedgerCsv,
} from "@/lib/services/csv-export.service";
import { recordAuditLog, getAuditLogs } from "@/lib/services/audit.service";
import { AppointmentStatus, PaymentStatus, PaymentMethod, UserRole } from "@prisma/client";

describe("Phase 9: Clinic Management Reports, KPIs, CSV Export & Audit Logging", () => {
  let clinicId: string;
  let testDoctor: any;
  let testDoctor2: any;
  let testService: any;
  let testPatientUser: any;
  let testPatientProfile: any;
  const createdAppointmentIds: string[] = [];
  const createdPaymentIds: string[] = [];

  beforeAll(async () => {
    // 1. Fetch clinic
    const clinic = await prisma.clinic.findFirst();
    if (!clinic) throw new Error("No clinic found. Please seed database.");
    clinicId = clinic.id;

    // 2. Fetch or create test doctor 1
    testDoctor = await prisma.doctor.findFirst({
      where: { clinicId, isActive: true },
      include: { user: true },
    });
    if (!testDoctor) {
      const docUser = await prisma.user.create({
        data: {
          email: `doc.report1.${Date.now()}@ayurveda.test`,
          fullName: "Dr. Report Alpha",
          passwordHash: "dummyhash",
          role: UserRole.DOCTOR,
        },
      });
      testDoctor = await prisma.doctor.create({
        data: {
          userId: docUser.id,
          clinicId,
          specialization: "Panchakarma",
          qualification: "BAMS, MD",
          consultationFee: 750.0,
          isActive: true,
        },
        include: { user: true },
      });
    }

    // 3. Create test doctor 2 to test doctor-wise reports
    const docUser2 = await prisma.user.create({
      data: {
        email: `doc.report2.${Date.now()}@ayurveda.test`,
        fullName: "Dr. Report Beta",
        passwordHash: "dummyhash",
        role: UserRole.DOCTOR,
      },
    });
    testDoctor2 = await prisma.doctor.create({
      data: {
        userId: docUser2.id,
        clinicId,
        specialization: "Nadi Pariksha",
        qualification: "BAMS, MD",
        consultationFee: 1000.0,
        isActive: true,
      },
      include: { user: true },
    });

    // 4. Fetch or create service
    testService = await prisma.service.findFirst({
      where: { clinicId, isActive: true },
    });
    if (!testService) {
      testService = await prisma.service.create({
        data: {
          clinicId,
          name: "Ayurvedic Detox Consultation",
          slug: `detox-${Date.now()}`,
          fee: 800.0,
          isActive: true,
        },
      });
    }

    // 5. Create test patient
    testPatientUser = await prisma.user.create({
      data: {
        email: `patient.report.${Date.now()}@patient.test`,
        fullName: "Meera Reports",
        passwordHash: "dummyhash",
        role: UserRole.PATIENT,
      },
    });

    testPatientProfile = await prisma.patientProfile.create({
      data: {
        userId: testPatientUser.id,
        bloodGroup: "B+",
      },
    });

    // 6. Seed diverse appointments across dates and statuses
    const today = new Date();
    today.setHours(10, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 3);

    // Appt 1: TODAY - CONFIRMED
    const aptToday = await prisma.appointment.create({
      data: {
        appointmentNumber: `APT-REP-TODAY-${Date.now()}`,
        clinicId,
        doctorId: testDoctor.id,
        patientProfileId: testPatientProfile.id,
        serviceId: testService.id,
        appointmentDate: today,
        appointmentTime: "10:00",
        status: AppointmentStatus.CONFIRMED,
        consultationFee: 800.0,
        advanceAmount: 150.0,
        balanceAmount: 650.0,
        paymentStatus: PaymentStatus.PARTIALLY_PAID,
      },
    });
    createdAppointmentIds.push(aptToday.id);

    // Appt 2: UPCOMING (FUTURE) - PENDING
    const aptUpcoming = await prisma.appointment.create({
      data: {
        appointmentNumber: `APT-REP-UPCOMING-${Date.now()}`,
        clinicId,
        doctorId: testDoctor.id,
        patientProfileId: testPatientProfile.id,
        serviceId: testService.id,
        appointmentDate: futureDate,
        appointmentTime: "11:30",
        status: AppointmentStatus.PENDING,
        consultationFee: 800.0,
        advanceAmount: 150.0,
        balanceAmount: 650.0,
        paymentStatus: PaymentStatus.PENDING,
      },
    });
    createdAppointmentIds.push(aptUpcoming.id);

    // Appt 3: YESTERDAY - COMPLETED
    const aptCompleted = await prisma.appointment.create({
      data: {
        appointmentNumber: `APT-REP-COMPLETED-${Date.now()}`,
        clinicId,
        doctorId: testDoctor2.id,
        patientProfileId: testPatientProfile.id,
        serviceId: testService.id,
        appointmentDate: yesterday,
        appointmentTime: "14:00",
        status: AppointmentStatus.COMPLETED,
        consultationFee: 1000.0,
        advanceAmount: 200.0,
        balanceAmount: 0.0,
        paymentStatus: PaymentStatus.PAID,
        completedAt: yesterday,
      },
    });
    createdAppointmentIds.push(aptCompleted.id);

    // Payment for completed appointment
    const payCompleted = await prisma.payment.create({
      data: {
        paymentReference: `PAY-REP-COMP-${Date.now()}`,
        appointmentId: aptCompleted.id,
        amount: 1000.0,
        currency: "INR",
        status: PaymentStatus.PAID,
        method: PaymentMethod.ONLINE,
        paidAt: yesterday,
      },
    });
    createdPaymentIds.push(payCompleted.id);

    // Appt 4: CANCELLED
    const aptCancelled = await prisma.appointment.create({
      data: {
        appointmentNumber: `APT-REP-CANCELLED-${Date.now()}`,
        clinicId,
        doctorId: testDoctor.id,
        patientProfileId: testPatientProfile.id,
        serviceId: testService.id,
        appointmentDate: yesterday,
        appointmentTime: "15:00",
        status: AppointmentStatus.CANCELLED,
        consultationFee: 800.0,
        advanceAmount: 150.0,
        balanceAmount: 650.0,
        paymentStatus: PaymentStatus.PENDING,
        cancellationReason: "Patient fever",
      },
    });
    createdAppointmentIds.push(aptCancelled.id);

    // Appt 5: NO-SHOW
    const aptNoShow = await prisma.appointment.create({
      data: {
        appointmentNumber: `APT-REP-NOSHOW-${Date.now()}`,
        clinicId,
        doctorId: testDoctor2.id,
        patientProfileId: testPatientProfile.id,
        serviceId: testService.id,
        appointmentDate: yesterday,
        appointmentTime: "16:00",
        status: AppointmentStatus.NO_SHOW,
        consultationFee: 1000.0,
        advanceAmount: 200.0,
        balanceAmount: 800.0,
        paymentStatus: PaymentStatus.PARTIALLY_PAID,
      },
    });
    createdAppointmentIds.push(aptNoShow.id);
  });

  afterAll(async () => {
    // Cleanup created test records
    if (createdPaymentIds.length > 0) {
      await prisma.payment.deleteMany({
        where: { id: { in: createdPaymentIds } },
      });
    }
    if (createdAppointmentIds.length > 0) {
      await prisma.appointment.deleteMany({
        where: { id: { in: createdAppointmentIds } },
      });
    }
    if (testPatientProfile) {
      await prisma.patientProfile.deleteMany({
        where: { id: testPatientProfile.id },
      });
    }
    if (testPatientUser) {
      await prisma.user.deleteMany({
        where: { id: testPatientUser.id },
      });
    }
    if (testDoctor2) {
      await prisma.doctor.deleteMany({ where: { id: testDoctor2.id } });
      await prisma.user.deleteMany({ where: { id: testDoctor2.userId } });
    }
  });

  // =========================================================================
  // 1. DASHBOARD METRICS (10 REQUIRED KPIS)
  // =========================================================================
  describe("1. Real-time Clinic Dashboard Metrics (10 Core KPIs)", () => {
    it("computes all 10 dashboard KPIs from real database records without fake numbers", async () => {
      const metrics = await getDashboardMetrics({ clinicId });

      // 1. Today's appointments
      expect(metrics.todayAppointments).toBeGreaterThanOrEqual(1);

      // 2. Upcoming appointments (today or future)
      expect(metrics.upcomingAppointments).toBeGreaterThanOrEqual(2);

      // 3. Completed appointments
      expect(metrics.completedAppointments).toBeGreaterThanOrEqual(1);

      // 4. Cancelled appointments
      expect(metrics.cancelledAppointments).toBeGreaterThanOrEqual(1);

      // 5. No-show appointments
      expect(metrics.noShowAppointments).toBeGreaterThanOrEqual(1);

      // 6. Total registered patients
      expect(metrics.totalPatients).toBeGreaterThanOrEqual(1);

      // 7. New patients registered
      expect(metrics.newPatients).toBeGreaterThanOrEqual(1);

      // 8. Realized revenue (from payments / completed consultations)
      expect(metrics.revenue).toBeGreaterThanOrEqual(1000.0);

      // 9. Pending receivables
      expect(metrics.pendingPayments).toBeGreaterThanOrEqual(650.0);

      // 10. Advance payments collected
      expect(metrics.advancePayments).toBeGreaterThanOrEqual(350.0);
    });
  });

  // =========================================================================
  // 2. DAILY, WEEKLY, MONTHLY REPORTS
  // =========================================================================
  describe("2. Periodic Reports (Daily, Weekly, Monthly)", () => {
    it("aggregates daily report with day-by-day status breakdown and financial totals", async () => {
      const daily = await getDailyReport({ clinicId });
      expect(daily.length).toBeGreaterThanOrEqual(2);

      const todayEntry = daily.find((d) => {
        const now = new Date().toISOString().slice(0, 10);
        return d.date === now;
      });

      expect(todayEntry).toBeDefined();
      if (todayEntry) {
        expect(todayEntry.totalAppointments).toBeGreaterThanOrEqual(1);
        expect(todayEntry.confirmed).toBeGreaterThanOrEqual(1);
        expect(todayEntry.advanceCollected).toBeGreaterThanOrEqual(150.0);
      }
    });

    it("aggregates weekly report with ISO week groupings and completion rate calculations", async () => {
      const weekly = await getWeeklyReport({ clinicId });
      expect(weekly.length).toBeGreaterThanOrEqual(1);

      const currentWeek = weekly[0];
      expect(currentWeek).toHaveProperty("weekLabel");
      expect(currentWeek).toHaveProperty("startDate");
      expect(currentWeek).toHaveProperty("endDate");
      expect(currentWeek.totalAppointments).toBeGreaterThanOrEqual(1);
      expect(currentWeek.completionRate).toMatch(/\d+(\.\d+)?%/);
    });

    it("aggregates monthly report with patient cohort growth and cancellation rates", async () => {
      const monthly = await getMonthlyReport({ clinicId });
      expect(monthly.length).toBeGreaterThanOrEqual(1);

      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const currentMonth = monthly.find((m) => m.month === currentMonthKey) || monthly[0];

      expect(currentMonth).toHaveProperty("month");
      expect(currentMonth).toHaveProperty("monthName");
      expect(currentMonth.totalAppointments).toBeGreaterThanOrEqual(1);
      expect(currentMonth.newPatients).toBeGreaterThanOrEqual(1);
      expect(currentMonth.completionRate).toMatch(/\d+(\.\d+)?%/);
      expect(currentMonth.cancellationRate).toMatch(/\d+(\.\d+)?%/);
    });
  });

  // =========================================================================
  // 3. DOCTOR-WISE, SERVICE-WISE, AND PAYMENT-WISE REPORTS
  // =========================================================================
  describe("3. Granular Dimensional Reports (Doctor-wise, Service-wise, Payment-wise)", () => {
    it("computes doctor-wise performance with completion rates and fee revenue", async () => {
      const doctorReport = await getDoctorWiseReport({ clinicId });
      expect(doctorReport.length).toBeGreaterThanOrEqual(2);

      const doc1 = doctorReport.find((d) => d.doctorId === testDoctor.id);
      expect(doc1).toBeDefined();
      expect(doc1?.totalAppointments).toBeGreaterThanOrEqual(2);

      const doc2 = doctorReport.find((d) => d.doctorId === testDoctor2.id);
      expect(doc2).toBeDefined();
      expect(doc2?.completed).toBeGreaterThanOrEqual(1);
      expect(doc2?.noShow).toBeGreaterThanOrEqual(1);
      expect(doc2?.totalRevenue).toBeGreaterThanOrEqual(1000.0);
    });

    it("computes service-wise demand, booking share, and revenue realization", async () => {
      const serviceReport = await getServiceWiseReport({ clinicId });
      expect(serviceReport.length).toBeGreaterThanOrEqual(1);

      const detoxService = serviceReport.find((s) => s.serviceId === testService.id);
      expect(detoxService).toBeDefined();
      expect(detoxService?.totalBookings).toBeGreaterThanOrEqual(3);
      expect(detoxService?.sharePercentage).toMatch(/\d+(\.\d+)?%/);
      expect(detoxService?.standardFee).toBe(Number(testService.fee));
    });

    it("computes payment-wise multi-channel methods and status distributions", async () => {
      const paymentReport = await getPaymentWiseReport({ clinicId });

      expect(paymentReport).toHaveProperty("byMethod");
      expect(paymentReport).toHaveProperty("byStatus");
      expect(paymentReport.totalCollected).toBeGreaterThanOrEqual(1000.0);
      expect(paymentReport.netRevenue).toBeGreaterThanOrEqual(1000.0);

      const onlineMethod = paymentReport.byMethod.find((m) => m.method === "ONLINE");
      expect(onlineMethod).toBeDefined();
      expect(onlineMethod?.totalAmount).toBeGreaterThanOrEqual(1000.0);

      const paidStatus = paymentReport.byStatus.find((s) => s.status === "PAID");
      expect(paidStatus).toBeDefined();
      expect(paidStatus?.totalAmount).toBeGreaterThanOrEqual(1000.0);
    });
  });

  // =========================================================================
  // 4. MULTI-DIMENSIONAL FILTERING
  // =========================================================================
  describe("4. Multi-Dimensional Query Filtering", () => {
    it("filters reports strictly by doctorId", async () => {
      const filteredByDoctor = await getDailyReport({
        clinicId,
        doctorId: testDoctor2.id,
      });

      // Total appointments in this daily slice should only reflect doctor 2's appointments
      const total = filteredByDoctor.reduce((acc, d) => acc + d.totalAppointments, 0);
      expect(total).toBe(2); // Only Completed & No-Show
    });

    it("filters dashboard metrics by status", async () => {
      const completedMetrics = await getDashboardMetrics({
        clinicId,
        status: AppointmentStatus.COMPLETED,
      });

      expect(completedMetrics.completedAppointments).toBeGreaterThanOrEqual(1);
      // Cancelled and No-Show should be 0 because status is strictly COMPLETED
      expect(completedMetrics.cancelledAppointments).toBe(0);
      expect(completedMetrics.noShowAppointments).toBe(0);
    });
  });

  // =========================================================================
  // 5. CSV EXPORT & RFC 4180 COMPLIANCE
  // =========================================================================
  describe("5. RFC-4180 Compliant CSV Export Engine", () => {
    it("escapes quotes, commas, and special characters properly", () => {
      expect(escapeCsvValue('Simple Text')).toBe('Simple Text');
      expect(escapeCsvValue('Hello, World')).toBe('"Hello, World"');
      expect(escapeCsvValue('Say "Hello"')).toBe('"Say ""Hello"""');
      expect(escapeCsvValue('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
      expect(escapeCsvValue(null)).toBe('');
      expect(escapeCsvValue(undefined)).toBe('');
    });

    it("prepends UTF-8 BOM so Excel opens files with perfect UTF-8 formatting", () => {
      const csv = buildCsv(["Col1", "Col2"], [["Val1", "Val2"]]);
      expect(csv.startsWith("\uFEFF")).toBe(true);
      expect(csv).toContain("Col1,Col2");
      expect(csv).toContain("Val1,Val2");
    });

    it("generates valid daily, weekly, monthly, doctor, service, and ledger CSVs", async () => {
      const dailyRows = await getDailyReport({ clinicId });
      const dailyCsv = exportDailyReportCsv(dailyRows);
      expect(dailyCsv).toContain("Date,Day of Week,Total Booked");
      expect(dailyCsv.startsWith("\uFEFF")).toBe(true);

      const weeklyRows = await getWeeklyReport({ clinicId });
      const weeklyCsv = exportWeeklyReportCsv(weeklyRows);
      expect(weeklyCsv).toContain("Week,Week Start,Week End,Total Appointments");

      const monthlyRows = await getMonthlyReport({ clinicId });
      const monthlyCsv = exportMonthlyReportCsv(monthlyRows);
      expect(monthlyCsv).toContain("Month Identifier,Month Name,Total Booked");

      const doctorRows = await getDoctorWiseReport({ clinicId });
      const doctorCsv = exportDoctorWiseReportCsv(doctorRows);
      expect(doctorCsv).toContain("Doctor ID,Doctor Name,Specialization");

      const serviceRows = await getServiceWiseReport({ clinicId });
      const serviceCsv = exportServiceWiseReportCsv(serviceRows);
      expect(serviceCsv).toContain("Service ID,Service Name,Standard Fee (INR)");

      const paymentData = await getPaymentWiseReport({ clinicId });
      const paymentCsv = exportPaymentWiseReportCsv(paymentData.byMethod);
      expect(paymentCsv).toContain("Payment Method,Payment Status,Transaction Count");

      const ledgerRows = await getAppointmentsLedgerForExport({ clinicId });
      const ledgerCsv = exportAppointmentsLedgerCsv(ledgerRows);
      expect(ledgerCsv).toContain("Appointment #,Date,Time,Patient Name");
      expect(ledgerRows.length).toBeGreaterThanOrEqual(4);
    });
  });

  // =========================================================================
  // 6. AUDIT LOGGING & GOVERNANCE TRAIL
  // =========================================================================
  describe("6. System Audit Logging & Governance Trail", () => {
    it("records immutable audit log events into database", async () => {
      const testAction = `TEST_AUDIT_ACTION_${Date.now()}`;
      await recordAuditLog({
        clinicId,
        action: testAction,
        entity: "Report",
        entityId: "rep-001",
        metadata: { format: "CSV", exportedBy: "Admin" },
        ipAddress: "127.0.0.1",
        userAgent: "Vitest Agent",
      });

      const logsResult = await getAuditLogs({
        clinicId,
        action: testAction,
      });

      expect(logsResult.logs.length).toBe(1);
      const log = logsResult.logs[0];
      expect(log.action).toBe(testAction);
      expect(log.entity).toBe("Report");
      expect(log.entityId).toBe("rep-001");
      expect((log.metadata as any)?.format).toBe("CSV");
      expect(log.ipAddress).toBe("127.0.0.1");
    });

    it("supports search and pagination in audit log retrieval", async () => {
      const searchLogs = await getAuditLogs({
        clinicId,
        limit: 5,
        search: "TEST_AUDIT_ACTION",
      });

      expect(searchLogs.pagination.page).toBe(1);
      expect(searchLogs.pagination.limit).toBe(5);
      expect(searchLogs.pagination.total).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // 7. QUERY PERFORMANCE & SLA BENCHMARK
  // =========================================================================
  describe("7. Query Optimization & Performance SLA", () => {
    it("executes dashboard metrics and multi-report aggregations in under 500ms", async () => {
      const startTime = performance.now();

      await Promise.all([
        getDashboardMetrics({ clinicId }),
        getDailyReport({ clinicId }),
        getWeeklyReport({ clinicId }),
        getMonthlyReport({ clinicId }),
        getDoctorWiseReport({ clinicId }),
        getServiceWiseReport({ clinicId }),
        getPaymentWiseReport({ clinicId }),
      ]);

      const elapsed = performance.now() - startTime;
      // Database query optimization ensures fast sub-500ms execution
      expect(elapsed).toBeLessThan(500);
    });
  });
});
