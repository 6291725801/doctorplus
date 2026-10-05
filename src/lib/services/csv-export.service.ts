/**
 * RFC 4180 Compliant CSV Export Engine
 * Generates properly escaped, quoted, and BOM-prefixed CSV documents
 * for Microsoft Excel, Apple Numbers, Google Sheets, and standard BI tools.
 */

export function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) {
    return "";
  }
  let str = String(val);
  // If string contains quotes, commas, carriage returns or newlines, quote it and escape quotes
  if (/[",\r\n]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const headerLine = headers.map(escapeCsvValue).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvValue).join(","));
  // Prepend UTF-8 BOM (\uFEFF) so Excel correctly parses UTF-8 without garbled characters
  return "\uFEFF" + [headerLine, ...dataLines].join("\r\n");
}

export interface DailyReportRow {
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

export function exportDailyReportCsv(rows: DailyReportRow[]): string {
  const headers = [
    "Date",
    "Day of Week",
    "Total Booked",
    "Confirmed",
    "Completed",
    "Cancelled",
    "No-Show",
    "Rescheduled",
    "Advance Collected (INR)",
    "Balance Collected (INR)",
    "Total Revenue (INR)",
    "Pending Balance (INR)",
  ];

  const data = rows.map((r) => [
    r.date,
    r.dayOfWeek,
    r.totalAppointments,
    r.confirmed,
    r.completed,
    r.cancelled,
    r.noShow,
    r.rescheduled,
    r.advanceCollected.toFixed(2),
    r.balanceCollected.toFixed(2),
    r.totalRevenue.toFixed(2),
    r.pendingBalance.toFixed(2),
  ]);

  return buildCsv(headers, data);
}

export interface WeeklyReportRow {
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

export function exportWeeklyReportCsv(rows: WeeklyReportRow[]): string {
  const headers = [
    "Week",
    "Week Start",
    "Week End",
    "Total Appointments",
    "Completed",
    "Cancelled",
    "No-Show",
    "Completion Rate",
    "Total Revenue (INR)",
    "Advance Collected (INR)",
    "Pending Balance (INR)",
  ];

  const data = rows.map((r) => [
    r.weekLabel,
    r.startDate,
    r.endDate,
    r.totalAppointments,
    r.completed,
    r.cancelled,
    r.noShow,
    r.completionRate,
    r.totalRevenue.toFixed(2),
    r.advanceCollected.toFixed(2),
    r.pendingBalance.toFixed(2),
  ]);

  return buildCsv(headers, data);
}

export interface MonthlyReportRow {
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

export function exportMonthlyReportCsv(rows: MonthlyReportRow[]): string {
  const headers = [
    "Month Identifier",
    "Month Name",
    "Total Booked",
    "Completed",
    "Cancelled",
    "No-Show",
    "New Patients Registered",
    "Completion Rate",
    "Cancellation Rate",
    "Total Revenue (INR)",
    "Pending Balance (INR)",
  ];

  const data = rows.map((r) => [
    r.month,
    r.monthName,
    r.totalAppointments,
    r.completed,
    r.cancelled,
    r.noShow,
    r.newPatients,
    r.completionRate,
    r.cancellationRate,
    r.totalRevenue.toFixed(2),
    r.pendingBalance.toFixed(2),
  ]);

  return buildCsv(headers, data);
}

export interface DoctorWiseReportRow {
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

export function exportDoctorWiseReportCsv(rows: DoctorWiseReportRow[]): string {
  const headers = [
    "Doctor ID",
    "Doctor Name",
    "Specialization",
    "Total Appointments",
    "Completed Consultations",
    "Cancelled",
    "No-Show",
    "Completion Rate",
    "Total Revenue Generated (INR)",
    "Pending Receivables (INR)",
  ];

  const data = rows.map((r) => [
    r.doctorId,
    r.doctorName,
    r.specialization,
    r.totalAppointments,
    r.completed,
    r.cancelled,
    r.noShow,
    r.completionRate,
    r.totalRevenue.toFixed(2),
    r.pendingBalance.toFixed(2),
  ]);

  return buildCsv(headers, data);
}

export interface ServiceWiseReportRow {
  serviceId: string;
  serviceName: string;
  standardFee: number;
  totalBookings: number;
  completed: number;
  cancelled: number;
  sharePercentage: string;
  totalRevenue: number;
}

export function exportServiceWiseReportCsv(rows: ServiceWiseReportRow[]): string {
  const headers = [
    "Service ID",
    "Service Name",
    "Standard Fee (INR)",
    "Total Bookings",
    "Completed Consultations",
    "Cancelled",
    "Booking Share",
    "Total Revenue Generated (INR)",
  ];

  const data = rows.map((r) => [
    r.serviceId,
    r.serviceName,
    r.standardFee.toFixed(2),
    r.totalBookings,
    r.completed,
    r.cancelled,
    r.sharePercentage,
    r.totalRevenue.toFixed(2),
  ]);

  return buildCsv(headers, data);
}

export interface PaymentWiseReportRow {
  method: string;
  status: string;
  transactionCount: number;
  totalAmount: number;
  currency: string;
}

export function exportPaymentWiseReportCsv(rows: PaymentWiseReportRow[]): string {
  const headers = [
    "Payment Method",
    "Payment Status",
    "Transaction Count",
    "Total Volume (INR)",
    "Currency",
  ];

  const data = rows.map((r) => [
    r.method,
    r.status,
    r.transactionCount,
    r.totalAmount.toFixed(2),
    r.currency,
  ]);

  return buildCsv(headers, data);
}

export interface AppointmentLedgerRow {
  appointmentNumber: string;
  appointmentDate: string;
  appointmentTime: string;
  patientName: string;
  patientPhone: string;
  doctorName: string;
  serviceName: string;
  appointmentType: string;
  status: string;
  consultationFee: number;
  advanceAmount: number;
  balanceAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
}

export function exportAppointmentsLedgerCsv(rows: AppointmentLedgerRow[]): string {
  const headers = [
    "Appointment #",
    "Date",
    "Time",
    "Patient Name",
    "Patient Phone",
    "Attending Doctor",
    "Service Name",
    "Type",
    "Status",
    "Consultation Fee (INR)",
    "Advance Amount (INR)",
    "Balance Amount (INR)",
    "Payment Status",
    "Payment Method",
    "Booked On",
  ];

  const data = rows.map((r) => [
    r.appointmentNumber,
    r.appointmentDate,
    r.appointmentTime,
    r.patientName,
    r.patientPhone,
    r.doctorName,
    r.serviceName,
    r.appointmentType,
    r.status,
    r.consultationFee.toFixed(2),
    r.advanceAmount.toFixed(2),
    r.balanceAmount.toFixed(2),
    r.paymentStatus,
    r.paymentMethod,
    r.createdAt,
  ]);

  return buildCsv(headers, data);
}
