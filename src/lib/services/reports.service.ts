import { prisma } from "@/lib/db";
import { AppointmentStatus, PaymentStatus, PaymentMethod } from "@prisma/client";

export interface ReportFilterParams {
  clinicId?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  doctorId?: string;
  serviceId?: string;
  status?: AppointmentStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
}

export interface DashboardMetrics {
  todayAppointments: number;
  upcomingAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  totalPatients: number;
  newPatients: number;
  revenue: number;
  pendingPayments: number;
  advancePayments: number;
}

export interface DailyReportItem {
  date: string;
  dayOfWeek: string;
  totalAppointments: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  noShow: number;
  rescheduled: number;
  advanceCollected: number;
  balanceCollected: number;
  totalRevenue: number;
  pendingBalance: number;
}

export interface WeeklyReportItem {
  weekLabel: string;
  startDate: string;
  endDate: string;
  totalAppointments: number;
  completed: number;
  cancelled: number;
  noShow: number;
  completionRate: string;
  totalRevenue: number;
  advanceCollected: number;
  pendingBalance: number;
}

export interface MonthlyReportItem {
  month: string;
  monthName: string;
  totalAppointments: number;
  completed: number;
  cancelled: number;
  noShow: number;
  newPatients: number;
  completionRate: string;
  cancellationRate: string;
  totalRevenue: number;
  pendingBalance: number;
}

export interface DoctorWiseReportItem {
  doctorId: string;
  doctorName: string;
  specialization: string;
  totalAppointments: number;
  completed: number;
  cancelled: number;
  noShow: number;
  completionRate: string;
  totalRevenue: number;
  pendingBalance: number;
}

export interface ServiceWiseReportItem {
  serviceId: string;
  serviceName: string;
  standardFee: number;
  totalBookings: number;
  completed: number;
  cancelled: number;
  sharePercentage: string;
  totalRevenue: number;
}

export interface PaymentWiseReportItem {
  method: string;
  status: string;
  transactionCount: number;
  totalAmount: number;
  currency: string;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStartAndEndOfDay(d: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Builds Prisma `where` clause for appointments matching multi-dimensional filters.
 */
function buildAppointmentWhere(filters: ReportFilterParams = {}) {
  const where: Record<string, unknown> = {};

  if (filters.clinicId) {
    where.clinicId = filters.clinicId;
  }
  if (filters.doctorId && filters.doctorId !== "ALL") {
    where.doctorId = filters.doctorId;
  }
  if (filters.serviceId && filters.serviceId !== "ALL") {
    where.serviceId = filters.serviceId;
  }
  if (filters.status && (filters.status as string) !== "ALL") {
    where.status = filters.status;
  }
  if (filters.paymentStatus && (filters.paymentStatus as string) !== "ALL") {
    where.paymentStatus = filters.paymentStatus;
  }

  if (filters.startDate || filters.endDate) {
    const dateRange: Record<string, Date> = {};
    if (filters.startDate) {
      const s = new Date(filters.startDate);
      s.setHours(0, 0, 0, 0);
      dateRange.gte = s;
    }
    if (filters.endDate) {
      const e = new Date(filters.endDate);
      e.setHours(23, 59, 59, 999);
      dateRange.lte = e;
    }
    where.appointmentDate = dateRange;
  }

  return where;
}

/**
 * 1. REAL-TIME CLINIC DASHBOARD METRICS
 * Computes 10 critical operational, volume, and financial KPIs strictly from database records.
 */
export async function getDashboardMetrics(filters: ReportFilterParams = {}): Promise<DashboardMetrics> {
  const now = new Date();
  const { start: todayStart, end: todayEnd } = getStartAndEndOfDay(now);

  const baseClinicWhere = filters.clinicId ? { clinicId: filters.clinicId } : {};
  const apptWhere = buildAppointmentWhere(filters);

  // Parallel database execution
  const [
    todayAppointments,
    upcomingAppointments,
    completedAppointments,
    cancelledAppointments,
    noShowAppointments,
    totalPatients,
    newPatients,
    paidPaymentsAggregate,
    filteredAppointmentsForFinance,
  ] = await Promise.all([
    // 1. Today's appointments (scheduled for today)
    prisma.appointment.count({
      where: {
        ...baseClinicWhere,
        ...(filters.status && (filters.status as string) !== "ALL" ? { status: filters.status } : {}),
        appointmentDate: { gte: todayStart, lte: todayEnd },
      },
    }),

    // 2. Upcoming appointments (today or future, active status)
    prisma.appointment.count({
      where: {
        ...baseClinicWhere,
        appointmentDate: { gte: todayStart },
        status:
          filters.status && (filters.status as string) !== "ALL"
            ? filters.status
            : {
                in: [
                  AppointmentStatus.PENDING,
                  AppointmentStatus.CONFIRMED,
                  AppointmentStatus.CHECKED_IN,
                  AppointmentStatus.IN_CONSULTATION,
                  AppointmentStatus.RESCHEDULED,
                ],
              },
      },
    }),

    // 3. Completed appointments
    filters.status && filters.status !== AppointmentStatus.COMPLETED
      ? Promise.resolve(0)
      : prisma.appointment.count({
          where: {
            ...apptWhere,
            status: AppointmentStatus.COMPLETED,
          },
        }),

    // 4. Cancelled appointments
    filters.status && filters.status !== AppointmentStatus.CANCELLED
      ? Promise.resolve(0)
      : prisma.appointment.count({
          where: {
            ...apptWhere,
            status: AppointmentStatus.CANCELLED,
          },
        }),

    // 5. No-show appointments
    filters.status && filters.status !== AppointmentStatus.NO_SHOW
      ? Promise.resolve(0)
      : prisma.appointment.count({
          where: {
            ...apptWhere,
            status: AppointmentStatus.NO_SHOW,
          },
        }),

    // 6. Total unique registered patients
    prisma.user.count({
      where: { role: "PATIENT" },
    }),

    // 7. New patients registered (within date range, or within last 30 days by default)
    prisma.user.count({
      where: {
        role: "PATIENT",
        createdAt: {
          gte: filters.startDate
            ? new Date(filters.startDate)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          lte: filters.endDate ? new Date(filters.endDate) : undefined,
        },
      },
    }),

    // 8. Total Paid Payments (Real cash + online collection)
    prisma.payment.aggregate({
      where: {
        status: PaymentStatus.PAID,
        appointment: baseClinicWhere,
        ...(filters.startDate || filters.endDate
          ? {
              createdAt: {
                gte: filters.startDate ? new Date(filters.startDate) : undefined,
                lte: filters.endDate ? new Date(filters.endDate) : undefined,
              },
            }
          : {}),
      },
      _sum: { amount: true },
    }),

    // 9 & 10. Financial ledger aggregation for pending & advances
    prisma.appointment.findMany({
      where: apptWhere,
      select: {
        consultationFee: true,
        advanceAmount: true,
        balanceAmount: true,
        paymentStatus: true,
        status: true,
      },
    }),
  ]);

  let advancePayments = 0;
  let pendingPayments = 0;
  let consultationRevenue = 0;

  for (const appt of filteredAppointmentsForFinance) {
    const fee = Number(appt.consultationFee || 0);
    const adv = Number(appt.advanceAmount || 0);
    const bal = Number(appt.balanceAmount || 0);

    // Advance collected for valid bookings
    if (appt.status !== AppointmentStatus.CANCELLED) {
      advancePayments += adv;
    }

    // Pending receivable balances
    if (
      appt.status !== AppointmentStatus.CANCELLED &&
      appt.paymentStatus !== PaymentStatus.PAID
    ) {
      pendingPayments += bal;
    }

    // Completed consultation revenue
    if (appt.status === AppointmentStatus.COMPLETED) {
      consultationRevenue += fee;
    }
  }

  const paymentTableRevenue = Number(paidPaymentsAggregate._sum.amount || 0);
  // Revenue is the actual collected payments or completed consultation fee ledger
  const revenue = paymentTableRevenue > 0 ? paymentTableRevenue : consultationRevenue;

  return {
    todayAppointments,
    upcomingAppointments,
    completedAppointments,
    cancelledAppointments,
    noShowAppointments,
    totalPatients,
    newPatients,
    revenue,
    pendingPayments,
    advancePayments,
  };
}

/**
 * 2. DAILY REPORT
 * Detailed day-by-day operational and financial ledger.
 */
export async function getDailyReport(filters: ReportFilterParams = {}): Promise<DailyReportItem[]> {
  const apptWhere = buildAppointmentWhere(filters);

  const appointments = await prisma.appointment.findMany({
    where: apptWhere,
    select: {
      appointmentDate: true,
      status: true,
      consultationFee: true,
      advanceAmount: true,
      balanceAmount: true,
      paymentStatus: true,
      payments: {
        where: { status: PaymentStatus.PAID },
        select: { amount: true },
      },
    },
    orderBy: { appointmentDate: "asc" },
  });

  const dayMap = new Map<string, DailyReportItem>();

  for (const appt of appointments) {
    const dateObj = new Date(appt.appointmentDate);
    const dateKey = formatDateKey(dateObj);
    const dayOfWeek = DAYS[dateObj.getDay()];

    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, {
        date: dateKey,
        dayOfWeek,
        totalAppointments: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
        rescheduled: 0,
        advanceCollected: 0,
        balanceCollected: 0,
        totalRevenue: 0,
        pendingBalance: 0,
      });
    }

    const row = dayMap.get(dateKey)!;
    row.totalAppointments += 1;

    if (appt.status === AppointmentStatus.CONFIRMED) row.confirmed += 1;
    else if (appt.status === AppointmentStatus.COMPLETED) row.completed += 1;
    else if (appt.status === AppointmentStatus.CANCELLED) row.cancelled += 1;
    else if (appt.status === AppointmentStatus.NO_SHOW) row.noShow += 1;
    else if (appt.status === AppointmentStatus.RESCHEDULED) row.rescheduled += 1;

    const adv = Number(appt.advanceAmount || 0);
    const bal = Number(appt.balanceAmount || 0);
    const fee = Number(appt.consultationFee || 0);

    if (appt.status !== AppointmentStatus.CANCELLED) {
      row.advanceCollected += adv;
      if (appt.paymentStatus === PaymentStatus.PAID) {
        row.balanceCollected += bal;
        row.totalRevenue += fee;
      } else {
        row.totalRevenue += adv;
        row.pendingBalance += bal;
      }
    }
  }

  return Array.from(dayMap.values()).sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * 3. WEEKLY REPORT
 * Groups data by ISO calendar week.
 */
export async function getWeeklyReport(filters: ReportFilterParams = {}): Promise<WeeklyReportItem[]> {
  const daily = await getDailyReport(filters);

  const weekMap = new Map<
    string,
    {
      weekLabel: string;
      startDate: string;
      endDate: string;
      totalAppointments: number;
      completed: number;
      cancelled: number;
      noShow: number;
      totalRevenue: number;
      advanceCollected: number;
      pendingBalance: number;
    }
  >();

  for (const day of daily) {
    const d = new Date(day.date);
    // Find Monday of the current week
    const dayOfWeek = d.getDay();
    const diffToMonday = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const weekKey = formatDateKey(monday);
    const weekLabel = `Week of ${formatDateKey(monday)}`;

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, {
        weekLabel,
        startDate: formatDateKey(monday),
        endDate: formatDateKey(sunday),
        totalAppointments: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
        totalRevenue: 0,
        advanceCollected: 0,
        pendingBalance: 0,
      });
    }

    const w = weekMap.get(weekKey)!;
    w.totalAppointments += day.totalAppointments;
    w.completed += day.completed;
    w.cancelled += day.cancelled;
    w.noShow += day.noShow;
    w.totalRevenue += day.totalRevenue;
    w.advanceCollected += day.advanceCollected;
    w.pendingBalance += day.pendingBalance;
  }

  return Array.from(weekMap.values())
    .map((w) => ({
      ...w,
      completionRate:
        w.totalAppointments > 0
          ? `${((w.completed / w.totalAppointments) * 100).toFixed(1)}%`
          : "0.0%",
    }))
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
}

/**
 * 4. MONTHLY REPORT
 * High-level executive monthly performance with new patient cohorts.
 */
export async function getMonthlyReport(filters: ReportFilterParams = {}): Promise<MonthlyReportItem[]> {
  const apptWhere = buildAppointmentWhere(filters);

  const [appointments, monthlyPatients] = await Promise.all([
    prisma.appointment.findMany({
      where: apptWhere,
      select: {
        appointmentDate: true,
        status: true,
        consultationFee: true,
        advanceAmount: true,
        balanceAmount: true,
        paymentStatus: true,
      },
      orderBy: { appointmentDate: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "PATIENT" },
      select: { createdAt: true },
    }),
  ]);

  const patientMap = new Map<string, number>();
  for (const p of monthlyPatients) {
    const k = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, "0")}`;
    patientMap.set(k, (patientMap.get(k) || 0) + 1);
  }

  const monthMap = new Map<
    string,
    {
      month: string;
      monthName: string;
      totalAppointments: number;
      completed: number;
      cancelled: number;
      noShow: number;
      newPatients: number;
      totalRevenue: number;
      pendingBalance: number;
    }
  >();

  for (const appt of appointments) {
    const d = new Date(appt.appointmentDate);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthName = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        month: monthKey,
        monthName,
        totalAppointments: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
        newPatients: patientMap.get(monthKey) || 0,
        totalRevenue: 0,
        pendingBalance: 0,
      });
    }

    const m = monthMap.get(monthKey)!;
    m.totalAppointments += 1;

    if (appt.status === AppointmentStatus.COMPLETED) m.completed += 1;
    else if (appt.status === AppointmentStatus.CANCELLED) m.cancelled += 1;
    else if (appt.status === AppointmentStatus.NO_SHOW) m.noShow += 1;

    const adv = Number(appt.advanceAmount || 0);
    const bal = Number(appt.balanceAmount || 0);
    const fee = Number(appt.consultationFee || 0);

    if (appt.status !== AppointmentStatus.CANCELLED) {
      if (appt.paymentStatus === PaymentStatus.PAID) {
        m.totalRevenue += fee;
      } else {
        m.totalRevenue += adv;
        m.pendingBalance += bal;
      }
    }
  }

  for (const [monthKey, count] of patientMap.entries()) {
    if (!monthMap.has(monthKey)) {
      const [y, m] = monthKey.split("-").map(Number);
      const monthName = `${MONTH_NAMES[m - 1]} ${y}`;
      monthMap.set(monthKey, {
        month: monthKey,
        monthName,
        totalAppointments: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
        newPatients: count,
        totalRevenue: 0,
        pendingBalance: 0,
      });
    }
  }

  return Array.from(monthMap.values())
    .map((m) => ({
      ...m,
      completionRate:
        m.totalAppointments > 0
          ? `${((m.completed / m.totalAppointments) * 100).toFixed(1)}%`
          : "0.0%",
      cancellationRate:
        m.totalAppointments > 0
          ? `${((m.cancelled / m.totalAppointments) * 100).toFixed(1)}%`
          : "0.0%",
    }))
    .sort((a, b) => b.month.localeCompare(a.month));
}

/**
 * 5. DOCTOR-WISE REPORT
 * Granular clinical workload, completion rate, and revenue contribution per doctor.
 */
export async function getDoctorWiseReport(filters: ReportFilterParams = {}): Promise<DoctorWiseReportItem[]> {
  const apptWhere = buildAppointmentWhere(filters);

  const [doctors, appointments] = await Promise.all([
    prisma.doctor.findMany({
      where: filters.clinicId ? { clinicId: filters.clinicId } : undefined,
      select: {
        id: true,
        specialization: true,
        user: { select: { fullName: true } },
      },
    }),
    prisma.appointment.findMany({
      where: apptWhere,
      select: {
        doctorId: true,
        status: true,
        consultationFee: true,
        advanceAmount: true,
        balanceAmount: true,
        paymentStatus: true,
      },
    }),
  ]);

  const docStats = new Map<
    string,
    {
      doctorId: string;
      doctorName: string;
      specialization: string;
      totalAppointments: number;
      completed: number;
      cancelled: number;
      noShow: number;
      totalRevenue: number;
      pendingBalance: number;
    }
  >();

  for (const d of doctors) {
    docStats.set(d.id, {
      doctorId: d.id,
      doctorName: `Dr. ${d.user?.fullName || "Doctor"}`,
      specialization: d.specialization || "General Consultation",
      totalAppointments: 0,
      completed: 0,
      cancelled: 0,
      noShow: 0,
      totalRevenue: 0,
      pendingBalance: 0,
    });
  }

  for (const appt of appointments) {
    let stat = docStats.get(appt.doctorId);
    if (!stat) {
      stat = {
        doctorId: appt.doctorId,
        doctorName: "Attending Doctor",
        specialization: "Clinical",
        totalAppointments: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
        totalRevenue: 0,
        pendingBalance: 0,
      };
      docStats.set(appt.doctorId, stat);
    }

    stat.totalAppointments += 1;
    if (appt.status === AppointmentStatus.COMPLETED) stat.completed += 1;
    else if (appt.status === AppointmentStatus.CANCELLED) stat.cancelled += 1;
    else if (appt.status === AppointmentStatus.NO_SHOW) stat.noShow += 1;

    const adv = Number(appt.advanceAmount || 0);
    const bal = Number(appt.balanceAmount || 0);
    const fee = Number(appt.consultationFee || 0);

    if (appt.status !== AppointmentStatus.CANCELLED) {
      if (appt.paymentStatus === PaymentStatus.PAID) {
        stat.totalRevenue += fee;
      } else {
        stat.totalRevenue += adv;
        stat.pendingBalance += bal;
      }
    }
  }

  return Array.from(docStats.values())
    .map((s) => ({
      ...s,
      completionRate:
        s.totalAppointments > 0
          ? `${((s.completed / s.totalAppointments) * 100).toFixed(1)}%`
          : "0.0%",
    }))
    .sort((a, b) => b.totalAppointments - a.totalAppointments);
}

/**
 * 6. SERVICE-WISE REPORT
 * Popularity, booking share, and revenue performance per clinic treatment/service.
 */
export async function getServiceWiseReport(filters: ReportFilterParams = {}): Promise<ServiceWiseReportItem[]> {
  const apptWhere = buildAppointmentWhere(filters);

  const [services, appointments] = await Promise.all([
    prisma.service.findMany({
      where: filters.clinicId ? { clinicId: filters.clinicId } : undefined,
      select: { id: true, name: true, fee: true },
    }),
    prisma.appointment.findMany({
      where: apptWhere,
      select: {
        serviceId: true,
        status: true,
        consultationFee: true,
        advanceAmount: true,
        balanceAmount: true,
        paymentStatus: true,
      },
    }),
  ]);

  const totalApptsCount = appointments.length;
  const sMap = new Map<
    string,
    {
      serviceId: string;
      serviceName: string;
      standardFee: number;
      totalBookings: number;
      completed: number;
      cancelled: number;
      totalRevenue: number;
    }
  >();

  for (const s of services) {
    sMap.set(s.id, {
      serviceId: s.id,
      serviceName: s.name,
      standardFee: Number(s.fee || 0),
      totalBookings: 0,
      completed: 0,
      cancelled: 0,
      totalRevenue: 0,
    });
  }

  for (const appt of appointments) {
    const sid = appt.serviceId || "unassigned";
    let entry = sMap.get(sid);
    if (!entry) {
      entry = {
        serviceId: sid,
        serviceName: sid === "unassigned" ? "General Consultation" : "Custom Service",
        standardFee: Number(appt.consultationFee || 0),
        totalBookings: 0,
        completed: 0,
        cancelled: 0,
        totalRevenue: 0,
      };
      sMap.set(sid, entry);
    }

    entry.totalBookings += 1;
    if (appt.status === AppointmentStatus.COMPLETED) entry.completed += 1;
    else if (appt.status === AppointmentStatus.CANCELLED) entry.cancelled += 1;

    const adv = Number(appt.advanceAmount || 0);
    const fee = Number(appt.consultationFee || 0);

    if (appt.status !== AppointmentStatus.CANCELLED) {
      entry.totalRevenue += appt.paymentStatus === PaymentStatus.PAID ? fee : adv;
    }
  }

  return Array.from(sMap.values())
    .map((e) => ({
      ...e,
      sharePercentage:
        totalApptsCount > 0
          ? `${((e.totalBookings / totalApptsCount) * 100).toFixed(1)}%`
          : "0.0%",
    }))
    .sort((a, b) => b.totalBookings - a.totalBookings);
}

/**
 * 7. PAYMENT-WISE REPORT
 * Multi-channel payment method breakdown and status distributions.
 */
export async function getPaymentWiseReport(filters: ReportFilterParams = {}): Promise<{
  byMethod: PaymentWiseReportItem[];
  byStatus: PaymentWiseReportItem[];
  totalCollected: number;
  totalRefunded: number;
  netRevenue: number;
}> {
  const baseClinicWhere = filters.clinicId ? { appointment: { clinicId: filters.clinicId } } : {};

  const dateFilter: Record<string, Date> = {};
  if (filters.startDate) dateFilter.gte = new Date(filters.startDate);
  if (filters.endDate) {
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    dateFilter.lte = end;
  }

  const paymentWhere: Record<string, unknown> = {
    ...baseClinicWhere,
    ...(filters.startDate || filters.endDate ? { createdAt: dateFilter } : {}),
  };

  const [methodGroups, statusGroups, refundsAggregate] = await Promise.all([
    prisma.payment.groupBy({
      by: ["method"],
      where: paymentWhere,
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.payment.groupBy({
      by: ["status"],
      where: paymentWhere,
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.refund.aggregate({
      where: {
        payment: paymentWhere,
        status: PaymentStatus.PAID,
      },
      _sum: { amount: true },
    }),
  ]);

  const byMethod: PaymentWiseReportItem[] = methodGroups.map((g) => ({
    method: g.method,
    status: "AGGREGATE",
    transactionCount: g._count._all,
    totalAmount: Number(g._sum.amount || 0),
    currency: "INR",
  }));

  const byStatus: PaymentWiseReportItem[] = statusGroups.map((g) => ({
    method: "ALL_METHODS",
    status: g.status,
    transactionCount: g._count._all,
    totalAmount: Number(g._sum.amount || 0),
    currency: "INR",
  }));

  let totalCollected = 0;
  for (const s of byStatus) {
    if (s.status === PaymentStatus.PAID) {
      totalCollected += s.totalAmount;
    }
  }

  const totalRefunded = Number(refundsAggregate._sum.amount || 0);
  const netRevenue = Math.max(0, totalCollected - totalRefunded);

  return {
    byMethod,
    byStatus,
    totalCollected,
    totalRefunded,
    netRevenue,
  };
}

/**
 * 8. APPOINTMENTS MASTER LEDGER FOR EXPORT
 */
export async function getAppointmentsLedgerForExport(filters: ReportFilterParams = {}) {
  const apptWhere = buildAppointmentWhere(filters);

  const appointments = await prisma.appointment.findMany({
    where: apptWhere,
    include: {
      doctor: { include: { user: { select: { fullName: true } } } },
      patientProfile: { include: { user: { select: { fullName: true, phone: true } } } },
      service: { select: { name: true } },
      payments: { select: { method: true }, take: 1 },
    },
    orderBy: [{ appointmentDate: "desc" }, { appointmentTime: "asc" }],
  });

  return appointments.map((a) => ({
    appointmentNumber: a.appointmentNumber,
    appointmentDate: formatDateKey(new Date(a.appointmentDate)),
    appointmentTime: a.appointmentTime,
    patientName: a.patientProfile?.user?.fullName || "Anonymous",
    patientPhone: a.patientProfile?.user?.phone || "N/A",
    doctorName: `Dr. ${a.doctor?.user?.fullName || "Specialist"}`,
    serviceName: a.service?.name || "General Consultation",
    appointmentType: a.appointmentType,
    status: a.status,
    consultationFee: Number(a.consultationFee),
    advanceAmount: Number(a.advanceAmount),
    balanceAmount: Number(a.balanceAmount),
    paymentStatus: a.paymentStatus,
    paymentMethod: a.payments[0]?.method || "ONLINE",
    createdAt: a.createdAt.toISOString(),
  }));
}
