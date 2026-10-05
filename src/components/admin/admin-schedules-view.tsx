"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DoctorScheduleManager,
  ScheduleItem,
  LeaveItem,
  BlockedSlotItem,
} from "@/components/doctor/doctor-schedule-manager";
import { AdminDashboardDoctor, AdminDashboardHoliday } from "@/components/cms/admin-dashboard-view";

interface AdminSchedulesViewProps {
  doctors: AdminDashboardDoctor[];
  initialHolidays?: AdminDashboardHoliday[];
}

export function AdminSchedulesView({ doctors, initialHolidays = [] }: AdminSchedulesViewProps) {
  const [selectedDoctor, setSelectedDoctor] = useState<AdminDashboardDoctor | null>(null);
  const [holidays, setHolidays] = useState<AdminDashboardHoliday[]>(initialHolidays);
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayTitle, setHolidayTitle] = useState("");
  const [holidayDesc, setHolidayDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayDate || !holidayTitle) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/clinic/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: holidayDate,
          title: holidayTitle.trim(),
          description: holidayDesc.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to add clinic holiday.");
      }

      setHolidays([data.data, ...holidays]);
      setHolidayDate("");
      setHolidayTitle("");
      setHolidayDesc("");
      setMessage({ type: "success", text: `Clinic holiday '${data.data.title}' scheduled successfully.` });
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: "error", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    setMessage(null);
    try {
      const res = await fetch(`/api/clinic/holidays/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete holiday");
      setHolidays((prev) => prev.filter((h) => h.id !== id));
      setMessage({ type: "success", text: "Holiday removed." });
    } catch {
      setMessage({ type: "error", text: "Failed to delete clinic holiday." });
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="underline ml-2 cursor-pointer font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* MODAL: DOCTOR SCHEDULE MANAGER */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Schedule & Shift Manager: Dr. {selectedDoctor.user?.fullName}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedDoctor.specialization} • Slot Duration: {selectedDoctor.appointmentDurationMinutes || 15} mins
                </p>
              </div>
              <button
                onClick={() => setSelectedDoctor(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <DoctorScheduleManager
              doctorId={selectedDoctor.id}
              doctorName={selectedDoctor.user?.fullName || "Doctor"}
              initialSchedules={(selectedDoctor.schedules as ScheduleItem[]) || []}
              initialLeaves={(selectedDoctor.leaves as LeaveItem[]) || []}
              initialBlockedSlots={(selectedDoctor.blockedSlots as BlockedSlotItem[]) || []}
            />

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setSelectedDoctor(null)}>
                Close Schedule Editor
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DOCTORS SCHEDULE ROSTER */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Doctor Consulting Schedules</CardTitle>
          <CardDescription className="text-xs">
            Overview of weekly shifts, slot durations, and active consultation availability for clinic doctors.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="p-3">Doctor</th>
                  <th className="p-3">Slot Duration</th>
                  <th className="p-3">Daily Capacity</th>
                  <th className="p-3">Weekly Working Days</th>
                  <th className="p-3 text-right">Schedule Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {doctors.map((doc) => {
                  const schedules = doc.schedules || [];
                  const activeDays = Array.from(new Set(schedules.map((s) => s.dayOfWeek)));

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60">
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">
                        <div>Dr. {doc.user?.fullName}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{doc.specialization}</div>
                      </td>

                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {doc.appointmentDurationMinutes || 15} minutes
                      </td>

                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {doc.maxDailyAppointments ? `${doc.maxDailyAppointments} patients/day` : "Unlimited"}
                      </td>

                      <td className="p-3">
                        {activeDays.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {activeDays.map((day) => (
                              <span
                                key={day}
                                className="px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200 text-[10px] font-bold border border-teal-200 dark:border-teal-900"
                              >
                                {day.slice(0, 3)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <Badge variant="slate">No schedules set</Badge>
                        )}
                      </td>

                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedDoctor(doc)}
                          className="text-xs font-semibold"
                        >
                          ⚙️ Manage Shifts & Leaves
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* CLINIC HOLIDAYS MANAGER */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Clinic Holidays & Closure Dates</CardTitle>
          <CardDescription className="text-xs">
            Declare clinic-wide closure days (National holidays, festivals). All doctor slots are automatically blocked.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ADD HOLIDAY FORM */}
          <form
            onSubmit={handleAddHoliday}
            className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
          >
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Holiday Date *
              </label>
              <Input
                type="date"
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Holiday Title *
              </label>
              <Input
                placeholder="e.g. Diwali, Independence Day, Clinic Annual Day"
                value={holidayTitle}
                onChange={(e) => setHolidayTitle(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div>
              <Button type="submit" disabled={saving} className="text-xs w-full bg-teal-600 hover:bg-teal-700 text-white font-bold">
                {saving ? "Scheduling..." : "+ Add Holiday"}
              </Button>
            </div>
          </form>

          {/* HOLIDAY LIST */}
          <div className="space-y-2">
            {holidays.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No clinic holidays currently scheduled.</p>
            ) : (
              holidays.map((h) => (
                <div
                  key={h.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-teal-600 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-950 px-2 py-1 rounded-md border border-teal-200 dark:border-teal-900">
                      {h.date}
                    </span>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{h.title}</span>
                      {h.description && (
                        <p className="text-[11px] text-slate-500">{h.description}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteHoliday(h.id)}
                    className="text-rose-500 hover:text-rose-700 text-xs font-semibold px-2 py-1 rounded hover:bg-rose-50 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
