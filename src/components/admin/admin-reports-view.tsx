"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DashboardMetrics {
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

interface DailyItem {
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

interface WeeklyItem {
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

interface MonthlyItem {
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

interface DoctorItem {
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

interface ServiceItem {
  serviceId: string;
  serviceName: string;
  standardFee: number;
  totalBookings: number;
  completed: number;
  cancelled: number;
  sharePercentage: string;
  totalRevenue: number;
}

interface PaymentWiseData {
  byMethod: Array<{
    method: string;
    status: string;
    transactionCount: number;
    totalAmount: number;
    currency: string;
  }>;
  byStatus: Array<{
    method: string;
    status: string;
    transactionCount: number;
    totalAmount: number;
    currency: string;
  }>;
  totalCollected: number;
  totalRefunded: number;
  netRevenue: number;
}

interface AuditLogItem {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user: {
    fullName: string;
    email: string;
    role: string;
  } | null;
}

interface FullReportPayload {
  dashboardMetrics: DashboardMetrics;
  dailyReport: DailyItem[];
  weeklyReport: WeeklyItem[];
  monthlyReport: MonthlyItem[];
  doctorWiseReport: DoctorItem[];
  serviceWiseReport: ServiceItem[];
  paymentWiseReport: PaymentWiseData;
}

type SubTab = "daily" | "weekly" | "monthly" | "doctor" | "service" | "payment" | "audit";

export function AdminReportsView() {
  const [data, setData] = useState<FullReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("daily");

  // Filters State
  const [preset, setPreset] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("ALL");
  const [selectedService, setSelectedService] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState("");

  const applyPreset = (key: string) => {
    setPreset(key);
    const now = new Date();
    const toYMD = (d: Date) => d.toISOString().slice(0, 10);

    if (key === "today") {
      const todayStr = toYMD(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (key === "this_week") {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      setStartDate(toYMD(monday));
      setEndDate(toYMD(now));
    } else if (key === "this_month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(toYMD(firstDay));
      setEndDate(toYMD(now));
    } else if (key === "last_30") {
      const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(toYMD(past));
      setEndDate(toYMD(now));
    } else if (key === "year_to_date") {
      const janFirst = new Date(now.getFullYear(), 0, 1);
      setStartDate(toYMD(janFirst));
      setEndDate(toYMD(now));
    } else {
      setStartDate("");
      setEndDate("");
    }
  };

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (selectedDoctor && selectedDoctor !== "ALL") params.set("doctorId", selectedDoctor);
      if (selectedService && selectedService !== "ALL") params.set("serviceId", selectedService);
      if (selectedStatus && selectedStatus !== "ALL") params.set("status", selectedStatus);

      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load clinic reports.");
      }
      setData(json.data);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedDoctor, selectedService, selectedStatus]);

  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams();
      if (auditSearch.trim()) params.set("search", auditSearch.trim());
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setAuditLogs(json.data.logs || []);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setAuditLoading(false);
    }
  }, [auditSearch, startDate, endDate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    if (activeSubTab === "audit") {
      fetchAuditLogs();
    }
  }, [activeSubTab, fetchAuditLogs]);

  const handleExportCsv = (type: string) => {
    const params = new URLSearchParams();
    params.set("type", type);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (selectedDoctor && selectedDoctor !== "ALL") params.set("doctorId", selectedDoctor);
    if (selectedService && selectedService !== "ALL") params.set("serviceId", selectedService);
    if (selectedStatus && selectedStatus !== "ALL") params.set("status", selectedStatus);

    window.open(`/api/admin/reports/export?${params.toString()}`, "_blank");
  };

  const metrics: DashboardMetrics = data?.dashboardMetrics || {
    todayAppointments: 0,
    upcomingAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    noShowAppointments: 0,
    totalPatients: 0,
    newPatients: 0,
    revenue: 0,
    pendingPayments: 0,
    advancePayments: 0,
  };

  const doctorsList = data?.doctorWiseReport || [];
  const servicesList = data?.serviceWiseReport || [];

  return (
    <div className="space-y-6">
      {/* HEADER & REFRESH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>📊</span> Clinic Management Reports & Business Intelligence
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real database queries, multi-channel payment reconciliation, and granular operational analytics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReports}
            disabled={loading}
            className="text-xs cursor-pointer"
          >
            {loading ? "Aggregating..." : "🔄 Refresh Reports"}
          </Button>

          {/* Master Export Trigger */}
          <div className="relative group">
            <Button
              size="sm"
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
            >
              📥 Export CSV ▾
            </Button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:block w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 py-1.5 text-xs">
              <button
                onClick={() => handleExportCsv("daily")}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
              >
                📊 Daily Operations Report
              </button>
              <button
                onClick={() => handleExportCsv("weekly")}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
              >
                📅 Weekly Aggregates
              </button>
              <button
                onClick={() => handleExportCsv("monthly")}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
              >
                🗓️ Monthly Performance
              </button>
              <button
                onClick={() => handleExportCsv("doctor")}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
              >
                👨‍⚕️ Doctor-wise Ledger
              </button>
              <button
                onClick={() => handleExportCsv("service")}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
              >
                🩺 Service Utilization
              </button>
              <button
                onClick={() => handleExportCsv("payment")}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
              >
                💳 Payment Ledger
              </button>
              <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>
              <button
                onClick={() => handleExportCsv("appointments")}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-teal-600 dark:text-teal-400 font-bold"
              >
                📑 Full Appointments Ledger
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <Card className="p-4 bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
        <div className="space-y-3">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-semibold mr-1">Date Presets:</span>
            {[
              { id: "all", label: "All Time" },
              { id: "today", label: "Today" },
              { id: "this_week", label: "This Week" },
              { id: "this_month", label: "This Month" },
              { id: "last_30", label: "Last 30 Days" },
              { id: "year_to_date", label: "YTD" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  preset === p.id
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Granular Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPreset("custom");
                }}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPreset("custom");
                }}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Filter by Doctor
              </label>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="ALL">All Attending Doctors</option>
                {doctorsList.map((d) => (
                  <option key={d.doctorId} value={d.doctorId}>
                    {d.doctorName} ({d.specialization})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Filter by Service
              </label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="ALL">All Clinical Services</option>
                {servicesList.map((s) => (
                  <option key={s.serviceId} value={s.serviceId}>
                    {s.serviceName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Appointment Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="NO_SHOW">No-Show</option>
                <option value="PENDING">Pending</option>
                <option value="CHECKED_IN">Checked-In</option>
                <option value="RESCHEDULED">Rescheduled</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* ERROR FEEDBACK */}
      {error && (
        <div className="p-4 rounded-xl text-xs bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
          <p className="font-bold">Failed to load reports: {error}</p>
        </div>
      )}

      {/* 10 CORE DASHBOARD KPI CARDS (Phase 9 Specification) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {/* 1. Today's Appointments */}
        <Card className="p-3.5 border-l-4 border-l-teal-500 bg-white dark:bg-slate-900">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Today's Appointments
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {metrics.todayAppointments}
            </span>
            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-950/50 px-1.5 py-0.5 rounded">
              Today
            </span>
          </div>
        </Card>

        {/* 2. Upcoming Appointments */}
        <Card className="p-3.5 border-l-4 border-l-blue-500 bg-white dark:bg-slate-900">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Upcoming
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {metrics.upcomingAppointments}
            </span>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded">
              Scheduled
            </span>
          </div>
        </Card>

        {/* 3. Completed Appointments */}
        <Card className="p-3.5 border-l-4 border-l-emerald-500 bg-white dark:bg-slate-900">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Completed
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {metrics.completedAppointments}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
              Finished
            </span>
          </div>
        </Card>

        {/* 4. Cancelled Appointments */}
        <Card className="p-3.5 border-l-4 border-l-rose-500 bg-white dark:bg-slate-900">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Cancelled
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {metrics.cancelledAppointments}
            </span>
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded">
              Dropped
            </span>
          </div>
        </Card>

        {/* 5. No-Show Appointments */}
        <Card className="p-3.5 border-l-4 border-l-amber-500 bg-white dark:bg-slate-900">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            No-Show
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {metrics.noShowAppointments}
            </span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded">
              Absent
            </span>
          </div>
        </Card>

        {/* 6. Total Patients */}
        <Card className="p-3.5 border-l-4 border-l-indigo-500 bg-white dark:bg-slate-900">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Patients
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {metrics.totalPatients}
            </span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded">
              Registered
            </span>
          </div>
        </Card>

        {/* 7. New Patients */}
        <Card className="p-3.5 border-l-4 border-l-cyan-500 bg-white dark:bg-slate-900">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            New Patients
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {metrics.newPatients}
            </span>
            <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold bg-cyan-50 dark:bg-cyan-950/50 px-1.5 py-0.5 rounded">
              New Cohort
            </span>
          </div>
        </Card>

        {/* 8. Revenue */}
        <Card className="p-3.5 border-l-4 border-l-emerald-600 bg-white dark:bg-slate-900">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Revenue
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 truncate">
              ₹{metrics.revenue.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
              Collected
            </span>
          </div>
        </Card>

        {/* 9. Pending Payments */}
        <Card className="p-3.5 border-l-4 border-l-orange-500 bg-white dark:bg-slate-900">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Pending Payments
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-orange-600 dark:text-orange-400 truncate">
              ₹{metrics.pendingPayments.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-950/50 px-1.5 py-0.5 rounded">
              Balance Due
            </span>
          </div>
        </Card>

        {/* 10. Advance Payments */}
        <Card className="p-3.5 border-l-4 border-l-purple-500 bg-white dark:bg-slate-900">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Advance Payments
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-purple-600 dark:text-purple-400 truncate">
              ₹{metrics.advancePayments.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/50 px-1.5 py-0.5 rounded">
              Bookings
            </span>
          </div>
        </Card>
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs">
        {[
          { key: "daily", label: "📈 Daily Report" },
          { key: "weekly", label: "📅 Weekly Summary" },
          { key: "monthly", label: "🗓️ Monthly Trends" },
          { key: "doctor", label: "👨‍⚕️ Doctor-wise" },
          { key: "service", label: "🩺 Service-wise" },
          { key: "payment", label: "💳 Payment-wise" },
          { key: "audit", label: "📜 Audit Logs" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key as SubTab)}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              activeSubTab === tab.key
                ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SUBTAB 1: DAILY REPORT */}
      {activeSubTab === "daily" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Daily Operations Ledger</CardTitle>
              <CardDescription className="text-xs">
                Detailed day-by-day record of patient bookings, consultation completions, and revenue.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportCsv("daily")}
              className="text-xs cursor-pointer"
            >
              📥 Export Daily CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Day</th>
                    <th className="py-2.5 px-3 text-center">Total</th>
                    <th className="py-2.5 px-3 text-center">Confirmed</th>
                    <th className="py-2.5 px-3 text-center">Completed</th>
                    <th className="py-2.5 px-3 text-center">Cancelled</th>
                    <th className="py-2.5 px-3 text-center">No-Show</th>
                    <th className="py-2.5 px-3 text-right">Advance (₹)</th>
                    <th className="py-2.5 px-3 text-right">Revenue (₹)</th>
                    <th className="py-2.5 px-3 text-right">Pending (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(data?.dailyReport || []).length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        No appointments found for the selected date range.
                      </td>
                    </tr>
                  ) : (
                    (data?.dailyReport || []).map((row) => (
                      <tr key={row.date} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                          {row.date}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{row.dayOfWeek}</td>
                        <td className="py-2.5 px-3 text-center font-bold">{row.totalAppointments}</td>
                        <td className="py-2.5 px-3 text-center text-blue-600">{row.confirmed}</td>
                        <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">
                          {row.completed}
                        </td>
                        <td className="py-2.5 px-3 text-center text-rose-600">{row.cancelled}</td>
                        <td className="py-2.5 px-3 text-center text-amber-600">{row.noShow}</td>
                        <td className="py-2.5 px-3 text-right text-purple-600">
                          ₹{row.advanceCollected.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">
                          ₹{row.totalRevenue.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 text-right text-orange-600">
                          ₹{row.pendingBalance.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SUBTAB 2: WEEKLY REPORT */}
      {activeSubTab === "weekly" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Weekly Aggregate Performance</CardTitle>
              <CardDescription className="text-xs">
                Weekly grouping with consultation completion rates and revenue run-rates.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportCsv("weekly")}
              className="text-xs cursor-pointer"
            >
              📥 Export Weekly CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Week</th>
                    <th className="py-2.5 px-3">Date Range</th>
                    <th className="py-2.5 px-3 text-center">Total Booked</th>
                    <th className="py-2.5 px-3 text-center">Completed</th>
                    <th className="py-2.5 px-3 text-center">Cancelled</th>
                    <th className="py-2.5 px-3 text-center">No-Show</th>
                    <th className="py-2.5 px-3 text-center">Completion Rate</th>
                    <th className="py-2.5 px-3 text-right">Revenue (₹)</th>
                    <th className="py-2.5 px-3 text-right">Pending (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(data?.weeklyReport || []).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No weekly records for the selected period.
                      </td>
                    </tr>
                  ) : (
                    (data?.weeklyReport || []).map((row) => (
                      <tr key={row.startDate} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                          {row.weekLabel}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {row.startDate} → {row.endDate}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold">{row.totalAppointments}</td>
                        <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">
                          {row.completed}
                        </td>
                        <td className="py-2.5 px-3 text-center text-rose-600">{row.cancelled}</td>
                        <td className="py-2.5 px-3 text-center text-amber-600">{row.noShow}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold rounded">
                            {row.completionRate}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">
                          ₹{row.totalRevenue.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 text-right text-orange-600">
                          ₹{row.pendingBalance.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SUBTAB 3: MONTHLY REPORT */}
      {activeSubTab === "monthly" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Monthly Executive Trends & Patient Cohorts</CardTitle>
              <CardDescription className="text-xs">
                Monthly patient acquisition, completed consultations, and cancellation benchmarks.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportCsv("monthly")}
              className="text-xs cursor-pointer"
            >
              📥 Export Monthly CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Month</th>
                    <th className="py-2.5 px-3 text-center">Total Bookings</th>
                    <th className="py-2.5 px-3 text-center">Completed</th>
                    <th className="py-2.5 px-3 text-center">Cancelled</th>
                    <th className="py-2.5 px-3 text-center">No-Show</th>
                    <th className="py-2.5 px-3 text-center">New Patients</th>
                    <th className="py-2.5 px-3 text-center">Completion %</th>
                    <th className="py-2.5 px-3 text-center">Cancellation %</th>
                    <th className="py-2.5 px-3 text-right">Revenue (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(data?.monthlyReport || []).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No monthly records found.
                      </td>
                    </tr>
                  ) : (
                    (data?.monthlyReport || []).map((row) => (
                      <tr key={row.month} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                          {row.monthName}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold">{row.totalAppointments}</td>
                        <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">
                          {row.completed}
                        </td>
                        <td className="py-2.5 px-3 text-center text-rose-600">{row.cancelled}</td>
                        <td className="py-2.5 px-3 text-center text-amber-600">{row.noShow}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-indigo-600">
                          +{row.newPatients}
                        </td>
                        <td className="py-2.5 px-3 text-center text-emerald-600 font-semibold">
                          {row.completionRate}
                        </td>
                        <td className="py-2.5 px-3 text-center text-rose-600 font-semibold">
                          {row.cancellationRate}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">
                          ₹{row.totalRevenue.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SUBTAB 4: DOCTOR-WISE REPORT */}
      {activeSubTab === "doctor" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Doctor Workload & Revenue Performance</CardTitle>
              <CardDescription className="text-xs">
                Clinical volume, completed consultations, cancellation rates, and fee generation by physician.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportCsv("doctor")}
              className="text-xs cursor-pointer"
            >
              📥 Export Doctor CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Attending Physician</th>
                    <th className="py-2.5 px-3">Specialization</th>
                    <th className="py-2.5 px-3 text-center">Total Assigned</th>
                    <th className="py-2.5 px-3 text-center">Completed</th>
                    <th className="py-2.5 px-3 text-center">Cancelled</th>
                    <th className="py-2.5 px-3 text-center">No-Show</th>
                    <th className="py-2.5 px-3 text-center">Completion Rate</th>
                    <th className="py-2.5 px-3 text-right">Revenue Generated (₹)</th>
                    <th className="py-2.5 px-3 text-right">Pending Receivables (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(data?.doctorWiseReport || []).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No doctors registered or found with appointments.
                      </td>
                    </tr>
                  ) : (
                    (data?.doctorWiseReport || []).map((row) => (
                      <tr key={row.doctorId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                          {row.doctorName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{row.specialization}</td>
                        <td className="py-2.5 px-3 text-center font-bold">{row.totalAppointments}</td>
                        <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">
                          {row.completed}
                        </td>
                        <td className="py-2.5 px-3 text-center text-rose-600">{row.cancelled}</td>
                        <td className="py-2.5 px-3 text-center text-amber-600">{row.noShow}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold rounded">
                            {row.completionRate}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">
                          ₹{row.totalRevenue.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 text-right text-orange-600">
                          ₹{row.pendingBalance.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SUBTAB 5: SERVICE-WISE REPORT */}
      {activeSubTab === "service" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Service-wise Demand & Fee Analysis</CardTitle>
              <CardDescription className="text-xs">
                Popularity share, booking velocity, and total revenue realization per clinical treatment.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportCsv("service")}
              className="text-xs cursor-pointer"
            >
              📥 Export Service CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Service Name</th>
                    <th className="py-2.5 px-3 text-right">Standard Fee (₹)</th>
                    <th className="py-2.5 px-3 text-center">Total Bookings</th>
                    <th className="py-2.5 px-3 text-center">Completed</th>
                    <th className="py-2.5 px-3 text-center">Cancelled</th>
                    <th className="py-2.5 px-3 text-center">Share of Bookings</th>
                    <th className="py-2.5 px-3 text-right">Total Revenue (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(data?.serviceWiseReport || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No service bookings recorded for the period.
                      </td>
                    </tr>
                  ) : (
                    (data?.serviceWiseReport || []).map((row) => (
                      <tr key={row.serviceId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                          {row.serviceName}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400 font-mono">
                          ₹{row.standardFee.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold">{row.totalBookings}</td>
                        <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">
                          {row.completed}
                        </td>
                        <td className="py-2.5 px-3 text-center text-rose-600">{row.cancelled}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold rounded">
                            {row.sharePercentage}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">
                          ₹{row.totalRevenue.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SUBTAB 6: PAYMENT-WISE REPORT */}
      {activeSubTab === "payment" && (
        <div className="space-y-6">
          {/* Payment Overview Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800">
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase">
                Total Collections
              </p>
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                ₹{(data?.paymentWiseReport?.totalCollected || 0).toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400/80 mt-1">
                Gross collections from online, cash, UPI, and cards.
              </p>
            </Card>

            <Card className="p-4 bg-rose-50/60 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800">
              <p className="text-xs font-semibold text-rose-800 dark:text-rose-300 uppercase">
                Total Refunds
              </p>
              <p className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-1">
                ₹{(data?.paymentWiseReport?.totalRefunded || 0).toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-rose-600 dark:text-rose-400/80 mt-1">
                Refunded to patients due to doctor leave or cancellation.
              </p>
            </Card>

            <Card className="p-4 bg-teal-50/60 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800">
              <p className="text-xs font-semibold text-teal-800 dark:text-teal-300 uppercase">
                Net Realized Revenue
              </p>
              <p className="text-2xl font-black text-teal-700 dark:text-teal-400 mt-1">
                ₹{(data?.paymentWiseReport?.netRevenue || 0).toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-teal-600 dark:text-teal-400/80 mt-1">
                Net operational cash inflow into clinic accounts.
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By Payment Method */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base">Breakdown by Payment Method</CardTitle>
                  <CardDescription className="text-xs">
                    Distribution of patient payments across channels.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportCsv("payment")}
                  className="text-xs cursor-pointer"
                >
                  📥 Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="py-2 px-3">Method</th>
                      <th className="py-2 px-3 text-center">Txns</th>
                      <th className="py-2 px-3 text-right">Volume (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(data?.paymentWiseReport?.byMethod || []).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-slate-400">
                          No payment transactions recorded.
                        </td>
                      </tr>
                    ) : (
                      (data?.paymentWiseReport?.byMethod || []).map((m) => (
                        <tr key={m.method} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                            {m.method}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold">{m.transactionCount}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                            ₹{m.totalAmount.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* By Payment Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base">Breakdown by Payment Status</CardTitle>
                  <CardDescription className="text-xs">
                    Verification, failure, and settlement status distribution.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3 text-center">Txns</th>
                      <th className="py-2 px-3 text-right">Volume (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(data?.paymentWiseReport?.byStatus || []).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-slate-400">
                          No payment transactions found.
                        </td>
                      </tr>
                    ) : (
                      (data?.paymentWiseReport?.byStatus || []).map((s) => (
                        <tr key={s.status} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-semibold">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                s.status === "PAID"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                  : s.status === "REFUNDED"
                                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                  : s.status === "FAILED"
                                  ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                                  : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                              }`}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold">{s.transactionCount}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                            ₹{s.totalAmount.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* SUBTAB 7: AUDIT LOGS */}
      {activeSubTab === "audit" && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <span>📜</span> System Audit Logs & Governance Trail
              </CardTitle>
              <CardDescription className="text-xs">
                Immutable records of administrative operations, report generations, and status transitions.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search action or entity..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchAuditLogs()}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white w-48"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAuditLogs}
                disabled={auditLoading}
                className="text-xs cursor-pointer"
              >
                {auditLoading ? "Searching..." : "🔍 Search"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Actor / User</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Entity</th>
                    <th className="py-2.5 px-3">Target ID</th>
                    <th className="py-2.5 px-3">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        {auditLoading ? "Loading audit records..." : "No audit records found."}
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "medium",
                          })}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                          {log.user ? (
                            <div>
                              <div>{log.user.fullName}</div>
                              <div className="text-[10px] text-slate-400">{log.user.email}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">System / Anonymous</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-medium">
                          {log.entity}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 truncate max-w-[120px]">
                          {log.entityId || "—"}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500 max-w-[200px] truncate">
                          {log.metadata ? JSON.stringify(log.metadata) : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
