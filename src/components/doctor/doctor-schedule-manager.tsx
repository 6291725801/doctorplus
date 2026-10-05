"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { DayOfWeek } from "@prisma/client";

export interface ScheduleItem {
  id?: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
  breakReason?: string | null;
  isAvailable: boolean;
}

export interface LeaveItem {
  id: string;
  startDate: string | Date;
  endDate: string | Date;
  reason?: string | null;
  isApproved: boolean;
}

export interface BlockedSlotItem {
  id: string;
  date: string | Date;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
}

interface DoctorScheduleManagerProps {
  doctorId: string;
  doctorName: string;
  initialSchedules: ScheduleItem[];
  initialLeaves: LeaveItem[];
  initialBlockedSlots: BlockedSlotItem[];
  onClose?: () => void;
}

const ALL_DAYS: DayOfWeek[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
];

export function DoctorScheduleManager({
  doctorId,
  doctorName,
  initialSchedules,
  initialLeaves,
  initialBlockedSlots,
  onClose,
}: DoctorScheduleManagerProps) {
  const [activeTab, setActiveTab] = useState<"schedules" | "breaks" | "leaves" | "blocked" | "preview">("schedules");

  // Schedule state map
  const [schedules, setSchedules] = useState<Record<DayOfWeek, ScheduleItem>>(() => {
    const map: Partial<Record<DayOfWeek, ScheduleItem>> = {};
    ALL_DAYS.forEach((day) => {
      const existing = initialSchedules.find((s) => s.dayOfWeek === day);
      map[day] = existing || {
        dayOfWeek: day,
        startTime: "09:00",
        endTime: "17:00",
        slotDurationMinutes: 15,
        breakStartTime: "13:00",
        breakEndTime: "14:00",
        breakReason: "Lunch Break",
        isAvailable: day !== DayOfWeek.SUNDAY,
      };
    });
    return map as Record<DayOfWeek, ScheduleItem>;
  });

  // Leaves & Blocked Slots state
  const [leaves, setLeaves] = useState<LeaveItem[]>(initialLeaves);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlotItem[]>(initialBlockedSlots);

  // Form states for new leave
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  // Form states for new blocked slot
  const [blockDate, setBlockDate] = useState("");
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockReason, setBlockReason] = useState("");

  // Live Slot preview state
  const [previewDate, setPreviewDate] = useState(() => {
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    return tom.toISOString().split("T")[0];
  });
  const [previewSlots, setPreviewSlots] = useState<{
    available: boolean;
    unavailabilityReason?: string;
    slots: Array<{ startTime: string; endTime: string; isAvailable: boolean; status: string; reason?: string }>;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Save weekly schedules
  const handleSaveSchedules = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const list = Object.values(schedules);
      const res = await fetch(`/api/doctors/${doctorId}/schedules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedules: list }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: "error", text: data.error?.message || "Failed to save schedules." });
      } else {
        setMessage({ type: "success", text: "Doctor weekly working schedules and breaks saved successfully!" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error while saving schedule." });
    } finally {
      setSaving(false);
    }
  };

  // Add leave
  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStart || !leaveEnd) {
      setMessage({ type: "error", text: "Please specify leave start and end dates." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/doctors/${doctorId}/leaves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: leaveStart,
          endDate: leaveEnd,
          reason: leaveReason || "Personal Leave",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLeaves([data.data, ...leaves]);
        setLeaveStart("");
        setLeaveEnd("");
        setLeaveReason("");
        setMessage({ type: "success", text: "Leave added successfully." });
      } else {
        setMessage({ type: "error", text: data.error?.message || "Failed to add leave." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error while adding leave." });
    } finally {
      setSaving(false);
    }
  };

  // Delete leave
  const handleDeleteLeave = async (leaveId: string) => {
    try {
      const res = await fetch(`/api/doctors/${doctorId}/leaves/${leaveId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setLeaves(leaves.filter((l) => l.id !== leaveId));
        setMessage({ type: "success", text: "Leave removed successfully." });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to delete leave." });
    }
  };

  // Add blocked date
  const handleAddBlockedSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockDate) {
      setMessage({ type: "error", text: "Please specify the date to block." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/doctors/${doctorId}/blocked-slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: blockDate,
          startTime: blockStart || null,
          endTime: blockEnd || null,
          reason: blockReason || "Schedule Blocked",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBlockedSlots([data.data, ...blockedSlots]);
        setBlockDate("");
        setBlockStart("");
        setBlockEnd("");
        setBlockReason("");
        setMessage({ type: "success", text: "Blocked slot/date added successfully." });
      } else {
        setMessage({ type: "error", text: data.error?.message || "Failed to block slot." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error." });
    } finally {
      setSaving(false);
    }
  };

  // Delete blocked slot
  const handleDeleteBlockedSlot = async (slotId: string) => {
    try {
      const res = await fetch(`/api/doctors/${doctorId}/blocked-slots/${slotId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setBlockedSlots(blockedSlots.filter((s) => s.id !== slotId));
        setMessage({ type: "success", text: "Blocked slot removed successfully." });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to remove blocked slot." });
    }
  };

  // Live slot preview generator
  const runSlotPreview = async () => {
    if (!previewDate) return;
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/schedule/slots?doctorId=${doctorId}&date=${previewDate}`);
      const data = await res.json();
      if (data.success) {
        setPreviewSlots(data.data);
      } else {
        setPreviewSlots({
          available: false,
          unavailabilityReason: data.error?.message || "Unable to compute slots.",
          slots: [],
        });
      }
    } catch {
      setPreviewSlots(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Schedule & Availability Engine
            </h2>
            <Badge variant="teal">{doctorName}</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure working hours, shift breaks, approved leaves, and blocked dates.
          </p>
        </div>
        {onClose && (
          <Button variant="outline" size="sm" onClick={onClose}>
            Done / Close
          </Button>
        )}
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
        {[
          { key: "schedules", label: "📅 Working Days & Hours" },
          { key: "breaks", label: "☕ Shift Breaks" },
          { key: "leaves", label: "🏖️ Doctor Leaves" },
          { key: "blocked", label: "🚫 Blocked Dates / Hours" },
          { key: "preview", label: "⚡ Live Schedule Preview" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key as "schedules" | "breaks" | "leaves" | "blocked" | "preview");
              setMessage(null);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              activeTab === tab.key
                ? "bg-teal-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: WORKING DAYS & HOURS */}
      {activeTab === "schedules" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Weekly Working Days & Shifts</CardTitle>
              <CardDescription className="text-xs">
                Toggle consulting days and set active clinical hours per day.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {ALL_DAYS.map((day) => {
                  const s = schedules[day];
                  return (
                    <div key={day} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-3 w-36">
                        <input
                          type="checkbox"
                          id={`check-${day}`}
                          checked={s.isAvailable}
                          onChange={(e) =>
                            setSchedules({
                              ...schedules,
                              [day]: { ...s, isAvailable: e.target.checked },
                            })
                          }
                          className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
                        />
                        <label
                          htmlFor={`check-${day}`}
                          className={`text-xs font-bold ${
                            s.isAvailable ? "text-slate-900 dark:text-white" : "text-slate-400 line-through"
                          }`}
                        >
                          {day}
                        </label>
                      </div>

                      {s.isAvailable ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-slate-500">From</span>
                          <input
                            type="time"
                            value={s.startTime}
                            onChange={(e) =>
                              setSchedules({
                                ...schedules,
                                [day]: { ...s, startTime: e.target.value },
                              })
                            }
                            className="text-xs p-1.5 rounded border border-slate-300 dark:bg-slate-900"
                          />
                          <span className="text-xs text-slate-500">To</span>
                          <input
                            type="time"
                            value={s.endTime}
                            onChange={(e) =>
                              setSchedules({
                                ...schedules,
                                [day]: { ...s, endTime: e.target.value },
                              })
                            }
                            className="text-xs p-1.5 rounded border border-slate-300 dark:bg-slate-900"
                          />
                          <span className="text-xs text-slate-500 ml-2">Slot:</span>
                          <select
                            value={s.slotDurationMinutes}
                            onChange={(e) =>
                              setSchedules({
                                ...schedules,
                                [day]: { ...s, slotDurationMinutes: Number(e.target.value) },
                              })
                            }
                            className="text-xs p-1.5 rounded border border-slate-300 dark:bg-slate-900"
                          >
                            <option value={10}>10 min</option>
                            <option value={15}>15 min</option>
                            <option value={20}>20 min</option>
                            <option value={30}>30 min</option>
                            <option value={45}>45 min</option>
                            <option value={60}>60 min</option>
                          </select>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Day Off (No Consultations)</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-3">
                <Button onClick={handleSaveSchedules} isLoading={saving} size="sm">
                  Save Working Hours
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: SHIFT BREAKS */}
      {activeTab === "breaks" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Shift Break Times (Lunch / Rest)</CardTitle>
            <CardDescription className="text-xs">
              Slots that overlap with break hours are automatically excluded from appointment booking.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {ALL_DAYS.map((day) => {
                const s = schedules[day];
                if (!s.isAvailable) return null;

                return (
                  <div key={day} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-900 dark:text-white w-28">{day}</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-500">Break Start:</span>
                      <input
                        type="time"
                        value={s.breakStartTime || ""}
                        onChange={(e) =>
                          setSchedules({
                            ...schedules,
                            [day]: { ...s, breakStartTime: e.target.value || null },
                          })
                        }
                        className="text-xs p-1.5 rounded border border-slate-300 dark:bg-slate-900"
                      />
                      <span className="text-xs text-slate-500">Break End:</span>
                      <input
                        type="time"
                        value={s.breakEndTime || ""}
                        onChange={(e) =>
                          setSchedules({
                            ...schedules,
                            [day]: { ...s, breakEndTime: e.target.value || null },
                          })
                        }
                        className="text-xs p-1.5 rounded border border-slate-300 dark:bg-slate-900"
                      />
                      <input
                        type="text"
                        placeholder="Reason (e.g. Lunch)"
                        value={s.breakReason || ""}
                        onChange={(e) =>
                          setSchedules({
                            ...schedules,
                            [day]: { ...s, breakReason: e.target.value },
                          })
                        }
                        className="text-xs p-1.5 rounded border border-slate-300 w-36 dark:bg-slate-900"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2">
              <Button onClick={handleSaveSchedules} isLoading={saving} size="sm">
                Save Break Hours
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: DOCTOR LEAVES */}
      {activeTab === "leaves" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Apply / Record Doctor Leave</CardTitle>
              <CardDescription className="text-xs">
                During approved leave dates, the schedule engine blocks all slot bookings for this doctor.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddLeave} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <Input
                  label="Start Date"
                  type="date"
                  value={leaveStart}
                  onChange={(e) => setLeaveStart(e.target.value)}
                  required
                />
                <Input
                  label="End Date"
                  type="date"
                  value={leaveEnd}
                  onChange={(e) => setLeaveEnd(e.target.value)}
                  required
                />
                <Input
                  label="Reason / Notes"
                  placeholder="e.g. Medical Conference"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                />
                <Button type="submit" isLoading={saving} size="sm">
                  Add Leave
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recorded Leaves ({leaves.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {leaves.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">No leaves recorded.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {leaves.map((l) => (
                    <div key={l.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {new Date(l.startDate).toLocaleDateString()} — {new Date(l.endDate).toLocaleDateString()}
                        </span>
                        <p className="text-[11px] text-slate-500">{l.reason || "Personal Leave"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="teal">{l.isApproved ? "Approved" : "Pending"}</Badge>
                        <button
                          onClick={() => handleDeleteLeave(l.id)}
                          className="text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer ml-2"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: BLOCKED DATES & HOURS */}
      {activeTab === "blocked" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Block Specific Date or Time Interval</CardTitle>
              <CardDescription className="text-xs">
                Block an entire day or specific hours (e.g. for surgery or urgent meetings).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddBlockedSlot} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                <Input
                  label="Date"
                  type="date"
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  required
                />
                <Input
                  label="Start Time (Optional)"
                  type="time"
                  value={blockStart}
                  onChange={(e) => setBlockStart(e.target.value)}
                />
                <Input
                  label="End Time (Optional)"
                  type="time"
                  value={blockEnd}
                  onChange={(e) => setBlockEnd(e.target.value)}
                />
                <Input
                  label="Reason"
                  placeholder="e.g. Emergency Ward Duty"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                />
                <Button type="submit" isLoading={saving} size="sm">
                  Block Time
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Blocked Dates / Slots ({blockedSlots.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {blockedSlots.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">No blocked slots recorded.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {blockedSlots.map((b) => (
                    <div key={b.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {new Date(b.date).toLocaleDateString()}
                        </span>
                        <span className="text-slate-500 ml-2">
                          {b.startTime && b.endTime ? `(${b.startTime} - ${b.endTime})` : "(Full Day Blocked)"}
                        </span>
                        <p className="text-[11px] text-slate-500">{b.reason || "Unavailable"}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteBlockedSlot(b.id)}
                        className="text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 5: LIVE SCHEDULE ENGINE PREVIEW */}
      {activeTab === "preview" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Live Schedule Engine Slot Checker</CardTitle>
            <CardDescription className="text-xs">
              Test dynamic slot generation against real PostgreSQL rules (working hours, breaks, leaves, holidays).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Input
                label="Select Date to Inspect"
                type="date"
                value={previewDate}
                onChange={(e) => setPreviewDate(e.target.value)}
                className="w-48"
              />
              <Button onClick={runSlotPreview} isLoading={previewLoading} className="mt-5" size="sm">
                Compute Slots
              </Button>
            </div>

            {previewSlots && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Status: {previewSlots.available ? "✅ Available For Booking" : "❌ Closed / Unavailable"}
                  </span>
                  {previewSlots.unavailabilityReason && (
                    <span className="text-xs text-amber-600 font-semibold">
                      Reason: {previewSlots.unavailabilityReason}
                    </span>
                  )}
                </div>

                {previewSlots.slots.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2">
                      Computed Slots ({previewSlots.slots.filter((s) => s.isAvailable).length} Available /{" "}
                      {previewSlots.slots.length} Total):
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {previewSlots.slots.map((s, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded-lg text-center text-xs font-semibold border ${
                            s.isAvailable
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                              : s.status === "BREAK"
                              ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800"
                          }`}
                        >
                          <div>{s.startTime}</div>
                          <div className="text-[9px] font-normal uppercase opacity-80">{s.status}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
