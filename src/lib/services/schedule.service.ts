import { prisma } from "@/lib/db";
import { DayOfWeek } from "@prisma/client";
import { recordAuditLog } from "@/lib/services/audit.service";
import { sendDoctorScheduleChangedNotification } from "@/lib/services/notification.service";
import { DEFAULT_FALLBACK_DOCTORS } from "@/lib/services/cms.service";

export interface ScheduleItemInput {
  dayOfWeek: DayOfWeek;
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
  slotDurationMinutes?: number;
  maxPatientsPerSlot?: number;
  maxDailyAppointments?: number | null;
  breakStartTime?: string | null; // "13:00"
  breakEndTime?: string | null;   // "14:00"
  breakReason?: string | null;
  isAvailable?: boolean;
}

export interface DoctorLeaveInput {
  startDate: string | Date;
  endDate: string | Date;
  reason?: string;
  isApproved?: boolean;
}

export interface DoctorBlockedSlotInput {
  date: string | Date;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string;
}

export interface ClinicHolidayInput {
  date: string | Date;
  title: string;
  description?: string;
}

export interface SlotResult {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  status: "AVAILABLE" | "BREAK" | "BLOCKED" | "BOOKED" | "PAST";
  reason?: string;
}

export interface AvailableSlotsResponse {
  doctorId: string;
  doctorName: string;
  date: string;
  dayOfWeek: DayOfWeek;
  available: boolean;
  unavailabilityReason?: string;
  workingHours?: { startTime: string; endTime: string };
  breakHours?: { startTime: string; endTime: string; reason?: string | null };
  slotDurationMinutes: number;
  maxDailyAppointments?: number | null;
  currentBookedCount?: number;
  isFullyBooked?: boolean;
  nextAvailableDate?: string | null;
  totalSlots: number;
  availableSlotsCount: number;
  slots: SlotResult[];
}

const DAY_MAP: Record<number, DayOfWeek> = {
  0: DayOfWeek.SUNDAY,
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
  6: DayOfWeek.SATURDAY,
};

/**
 * Converts "HH:MM" string to minutes from start of day.
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Converts minutes from start of day to "HH:MM".
 */
function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Normalizes any date string or Date object to a clean YYYY-MM-DD Date at midnight UTC.
 */
export function normalizeDate(dateInput: string | Date): { dateObj: Date; dateStr: string } {
  let dateObj: Date;
  if (typeof dateInput === "string") {
    // If format is "YYYY-MM-DD"
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      dateObj = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    } else {
      dateObj = new Date(dateInput);
    }
  } else {
    dateObj = new Date(Date.UTC(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate(), 0, 0, 0, 0));
  }

  const y = dateObj.getUTCFullYear();
  const m = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getUTCDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${d}`;

  return { dateObj, dateStr };
}

/**
 * Scans upcoming calendar dates starting after fromDate to find the earliest available booking date for the doctor.
 */
export async function findNextAvailableDate(
  doctorId: string,
  fromDateInput: string | Date,
  maxDaysToScan = 30
): Promise<string | null> {
  const { dateObj: baseDate } = normalizeDate(fromDateInput);

  const startDate = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);
  const endDate = new Date(baseDate.getTime() + maxDaysToScan * 24 * 60 * 60 * 1000);

  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: {
      id: true,
      clinicId: true,
      isActive: true,
      isAvailableForBooking: true,
      appointmentDurationMinutes: true,
      maxDailyAppointments: true,
      schedules: {
        where: { isAvailable: true },
      },
    },
  });

  if (!doctor || !doctor.isActive || !doctor.isAvailableForBooking || doctor.schedules.length === 0) {
    return null;
  }

  const [holidays, leaves, blockedSlots, appointments] = await Promise.all([
    prisma.clinicHoliday.findMany({
      where: {
        clinicId: doctor.clinicId,
        date: { gte: startDate, lte: endDate },
      },
    }),
    prisma.doctorLeave.findMany({
      where: {
        doctorId,
        isApproved: true,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    }),
    prisma.doctorBlockedSlot.findMany({
      where: {
        doctorId,
        date: { gte: startDate, lte: endDate },
      },
    }),
    prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: { gte: startDate, lte: endDate },
        status: { notIn: ["CANCELLED", "RESCHEDULED"] },
      },
      select: {
        appointmentDate: true,
        appointmentTime: true,
      },
    }),
  ]);

  const holidayDateSet = new Set(
    holidays.map((h) => normalizeDate(h.date).dateStr)
  );

  const scheduleMap = new Map<DayOfWeek, (typeof doctor.schedules)[0]>();
  for (const s of doctor.schedules) {
    scheduleMap.set(s.dayOfWeek, s);
  }

  for (let offset = 1; offset <= maxDaysToScan; offset++) {
    const currentDay = new Date(baseDate.getTime() + offset * 24 * 60 * 60 * 1000);
    const { dateStr } = normalizeDate(currentDay);
    const dayOfWeek = DAY_MAP[currentDay.getUTCDay()];

    const schedule = scheduleMap.get(dayOfWeek);
    if (!schedule) continue;

    if (holidayDateSet.has(dateStr)) continue;

    const onLeave = leaves.some(
      (l) => l.startDate <= currentDay && l.endDate >= currentDay
    );
    if (onLeave) continue;

    const isFullDayBlocked = blockedSlots.some(
      (b) => normalizeDate(b.date).dateStr === dateStr && !b.startTime && !b.endTime
    );
    if (isFullDayBlocked) continue;

    const dayAppointments = appointments.filter(
      (a) => normalizeDate(a.appointmentDate).dateStr === dateStr
    );
    const effectiveCapacity = schedule.maxDailyAppointments ?? doctor.maxDailyAppointments;
    if (effectiveCapacity !== null && dayAppointments.length >= effectiveCapacity) {
      continue;
    }

    const slotDuration = schedule.slotDurationMinutes || doctor.appointmentDurationMinutes || 15;
    const startMinutes = timeToMinutes(schedule.startTime);
    const endMinutes = timeToMinutes(schedule.endTime);
    const breakStart = schedule.breakStartTime ? timeToMinutes(schedule.breakStartTime) : null;
    const breakEnd = schedule.breakEndTime ? timeToMinutes(schedule.breakEndTime) : null;

    const dayBlocked = blockedSlots.filter(
      (b) => normalizeDate(b.date).dateStr === dateStr && b.startTime && b.endTime
    );
    const bookedTimes = new Set(dayAppointments.map((a) => a.appointmentTime));

    let foundFreeSlot = false;
    for (let cur = startMinutes; cur + slotDuration <= endMinutes; cur += slotDuration) {
      const curEnd = cur + slotDuration;
      if (breakStart !== null && breakEnd !== null && cur < breakEnd && curEnd > breakStart) {
        continue;
      }
      const blocked = dayBlocked.some((b) => {
        const bStart = timeToMinutes(b.startTime!);
        const bEnd = timeToMinutes(b.endTime!);
        return cur < bEnd && curEnd > bStart;
      });
      if (blocked) continue;

      const timeStr = minutesToTime(cur);
      if (bookedTimes.has(timeStr)) continue;

      foundFreeSlot = true;
      break;
    }

    if (foundFreeSlot) {
      return dateStr;
    }
  }

  return null;
}

/**
 * CORE SCHEDULE ENGINE:
 * Dynamically computes available appointment slots for a given doctor on a given date.
 * Takes into account:
 * - Doctor active and booking status
 * - Clinic Holidays
 * - Doctor Approved Leaves
 * - Full-day and Partial-day Blocked Slots
 * - Weekly Working Hours & Working Days
 * - Scheduled Shift Breaks (e.g. Lunch/Tea)
 * - Already booked appointments
 * - Configured maximum bookings (Capacity limit e.g. 10/10)
 * - Next available date calculation when date is full
 */
function generateFallbackSlots(
  doctorId: string,
  targetDateInput: string | Date
): AvailableSlotsResponse {
  const { dateObj, dateStr } = normalizeDate(targetDateInput);
  const dayOfWeek = DAY_MAP[dateObj.getUTCDay()];
  const fallbackDoctor =
    DEFAULT_FALLBACK_DOCTORS.find((d) => d.id === doctorId) ||
    DEFAULT_FALLBACK_DOCTORS[0];
  const doctorName = fallbackDoctor.user.fullName;
  const isSunday = dateObj.getUTCDay() === 0;

  if (isSunday) {
    const nextDate = new Date(dateObj);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    const nextDateStr = nextDate.toISOString().split("T")[0];
    return {
      doctorId,
      doctorName,
      date: dateStr,
      dayOfWeek,
      available: false,
      nextAvailableDate: nextDateStr,
      unavailabilityReason: "Clinic is closed on Sundays",
      slotDurationMinutes: 30,
      totalSlots: 0,
      availableSlotsCount: 0,
      slots: [],
    };
  }

  const times: { start: string; end: string; isBreak?: boolean }[] = [
    { start: "09:00", end: "09:30" },
    { start: "09:30", end: "10:00" },
    { start: "10:00", end: "10:30" },
    { start: "10:30", end: "11:00" },
    { start: "11:00", end: "11:30" },
    { start: "11:30", end: "12:00" },
    { start: "12:00", end: "12:30" },
    { start: "12:30", end: "13:00" },
    { start: "13:00", end: "14:00", isBreak: true },
    { start: "14:00", end: "14:30" },
    { start: "14:30", end: "15:00" },
    { start: "15:00", end: "15:30" },
    { start: "15:30", end: "16:00" },
    { start: "16:00", end: "16:30" },
    { start: "16:30", end: "17:00" },
    { start: "17:00", end: "17:30" },
  ];

  const slots: SlotResult[] = times.map((t) => {
    if (t.isBreak) {
      return {
        startTime: t.start,
        endTime: t.end,
        isAvailable: false,
        status: "BREAK",
        reason: "Lunch Break",
      };
    }
    return {
      startTime: t.start,
      endTime: t.end,
      isAvailable: true,
      status: "AVAILABLE",
    };
  });

  const availableCount = slots.filter((s) => s.isAvailable).length;

  return {
    doctorId,
    doctorName,
    date: dateStr,
    dayOfWeek,
    available: availableCount > 0,
    isFullyBooked: false,
    currentBookedCount: 0,
    workingHours: { startTime: "09:00", endTime: "17:30" },
    breakHours: { startTime: "13:00", endTime: "14:00", reason: "Lunch Break" },
    slotDurationMinutes: 30,
    totalSlots: slots.length,
    availableSlotsCount: availableCount,
    slots,
  };
}

export async function getDoctorAvailableSlots(
  doctorId: string,
  targetDateInput: string | Date
): Promise<AvailableSlotsResponse> {
  const { dateObj, dateStr } = normalizeDate(targetDateInput);

  try {
    // 1. Fetch Doctor and check active status
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        user: { select: { fullName: true } },
        clinic: { select: { id: true, name: true } },
      },
    });

    if (!doctor) {
      return generateFallbackSlots(doctorId, targetDateInput);
    }

  const doctorName = doctor.user.fullName;
  const dayOfWeek = DAY_MAP[dateObj.getUTCDay()];

  // If doctor is deactivated or marked not available
  if (!doctor.isActive || !doctor.isAvailableForBooking) {
    return {
      doctorId,
      doctorName,
      date: dateStr,
      dayOfWeek,
      available: false,
      unavailabilityReason: "Doctor is currently inactive or not accepting bookings.",
      slotDurationMinutes: doctor.appointmentDurationMinutes,
      totalSlots: 0,
      availableSlotsCount: 0,
      slots: [],
    };
  }

  // 2. Check Clinic Holidays
  const clinicHoliday = await prisma.clinicHoliday.findFirst({
    where: {
      clinicId: doctor.clinicId,
      date: dateObj,
    },
  });

  if (clinicHoliday) {
    const nextDate = await findNextAvailableDate(doctorId, dateObj);
    return {
      doctorId,
      doctorName,
      date: dateStr,
      dayOfWeek,
      available: false,
      nextAvailableDate: nextDate,
      unavailabilityReason: `Clinic is closed for holiday: ${clinicHoliday.title}`,
      slotDurationMinutes: doctor.appointmentDurationMinutes,
      totalSlots: 0,
      availableSlotsCount: 0,
      slots: [],
    };
  }

  // 3. Check Doctor Approved Leaves
  const activeLeave = await prisma.doctorLeave.findFirst({
    where: {
      doctorId,
      isApproved: true,
      startDate: { lte: dateObj },
      endDate: { gte: dateObj },
    },
  });

  if (activeLeave) {
    const nextDate = await findNextAvailableDate(doctorId, dateObj);
    return {
      doctorId,
      doctorName,
      date: dateStr,
      dayOfWeek,
      available: false,
      nextAvailableDate: nextDate,
      unavailabilityReason: `Doctor is on leave: ${activeLeave.reason || "Approved Personal Leave"}`,
      slotDurationMinutes: doctor.appointmentDurationMinutes,
      totalSlots: 0,
      availableSlotsCount: 0,
      slots: [],
    };
  }

  // 4. Check Doctor Full-Day Blocked Slots
  const fullDayBlocked = await prisma.doctorBlockedSlot.findFirst({
    where: {
      doctorId,
      date: dateObj,
      startTime: null,
      endTime: null,
    },
  });

  if (fullDayBlocked) {
    const nextDate = await findNextAvailableDate(doctorId, dateObj);
    return {
      doctorId,
      doctorName,
      date: dateStr,
      dayOfWeek,
      available: false,
      nextAvailableDate: nextDate,
      unavailabilityReason: `Doctor schedule is blocked for this date: ${fullDayBlocked.reason || "Unavailable"}`,
      slotDurationMinutes: doctor.appointmentDurationMinutes,
      totalSlots: 0,
      availableSlotsCount: 0,
      slots: [],
    };
  }

  // 5. Check Doctor Weekly Schedule for this DayOfWeek
  const schedule = await prisma.doctorSchedule.findFirst({
    where: {
      doctorId,
      dayOfWeek,
      isAvailable: true,
    },
  });

  if (!schedule) {
    const nextDate = await findNextAvailableDate(doctorId, dateObj);
    return {
      doctorId,
      doctorName,
      date: dateStr,
      dayOfWeek,
      available: false,
      nextAvailableDate: nextDate,
      unavailabilityReason: `Doctor does not have consultation hours on ${dayOfWeek}.`,
      slotDurationMinutes: doctor.appointmentDurationMinutes,
      totalSlots: 0,
      availableSlotsCount: 0,
      slots: [],
    };
  }

  // 6. Fetch Partial Blocked Slots on this date
  const partialBlockedSlots = await prisma.doctorBlockedSlot.findMany({
    where: {
      doctorId,
      date: dateObj,
      startTime: { not: null },
      endTime: { not: null },
    },
  });

  // 7. Fetch Existing Booked Appointments on this date
  const bookedAppointments = await prisma.appointment.findMany({
    where: {
      doctorId,
      appointmentDate: dateObj,
      status: { notIn: ["CANCELLED", "RESCHEDULED"] },
    },
    select: {
      appointmentTime: true,
    },
  });

  const bookedTimes = new Set(bookedAppointments.map((a) => a.appointmentTime));
  const effectiveMaxDaily = schedule.maxDailyAppointments ?? doctor.maxDailyAppointments;
  const currentBookedCount = bookedAppointments.length;
  const isFullyBooked = effectiveMaxDaily !== null && currentBookedCount >= effectiveMaxDaily;

  // 8. Generate candidate slots
  const slotDuration = schedule.slotDurationMinutes || doctor.appointmentDurationMinutes || 15;
  const startMinutes = timeToMinutes(schedule.startTime);
  const endMinutes = timeToMinutes(schedule.endTime);

  const breakStartMinutes = schedule.breakStartTime ? timeToMinutes(schedule.breakStartTime) : null;
  const breakEndMinutes = schedule.breakEndTime ? timeToMinutes(schedule.breakEndTime) : null;

  const slots: SlotResult[] = [];

  for (let current = startMinutes; current + slotDuration <= endMinutes; current += slotDuration) {
    const slotStartStr = minutesToTime(current);
    const slotEndStr = minutesToTime(current + slotDuration);
    const slotEnd = current + slotDuration;

    // Check if slot falls in break
    let isBreak = false;
    if (breakStartMinutes !== null && breakEndMinutes !== null) {
      if (current < breakEndMinutes && slotEnd > breakStartMinutes) {
        isBreak = true;
      }
    }

    if (isBreak) {
      slots.push({
        startTime: slotStartStr,
        endTime: slotEndStr,
        isAvailable: false,
        status: "BREAK",
        reason: schedule.breakReason || "Scheduled Break",
      });
      continue;
    }

    // Check partial blocked date intervals
    let isBlocked = false;
    let blockReason = "";
    for (const b of partialBlockedSlots) {
      if (b.startTime && b.endTime) {
        const bStart = timeToMinutes(b.startTime);
        const bEnd = timeToMinutes(b.endTime);
        if (current < bEnd && slotEnd > bStart) {
          isBlocked = true;
          blockReason = b.reason || "Blocked Slot";
          break;
        }
      }
    }

    if (isBlocked) {
      slots.push({
        startTime: slotStartStr,
        endTime: slotEndStr,
        isAvailable: false,
        status: "BLOCKED",
        reason: blockReason,
      });
      continue;
    }

    // Check if already booked
    if (bookedTimes.has(slotStartStr)) {
      slots.push({
        startTime: slotStartStr,
        endTime: slotEndStr,
        isAvailable: false,
        status: "BOOKED",
        reason: "Already booked",
      });
      continue;
    }

    // Otherwise slot is candidate available
    slots.push({
      startTime: slotStartStr,
      endTime: slotEndStr,
      isAvailable: true,
      status: "AVAILABLE",
    });
  }

  // If daily maximum limit is reached, all slots become unavailable
  if (isFullyBooked) {
    const nextDate = await findNextAvailableDate(doctorId, dateObj);
    return {
      doctorId,
      doctorName,
      date: dateStr,
      dayOfWeek,
      available: false,
      isFullyBooked: true,
      currentBookedCount,
      maxDailyAppointments: effectiveMaxDaily,
      nextAvailableDate: nextDate,
      unavailabilityReason: `FULLY BOOKED: Doctor has reached the maximum capacity limit (${currentBookedCount}/${effectiveMaxDaily}) for this date.`,
      workingHours: { startTime: schedule.startTime, endTime: schedule.endTime },
      breakHours:
        schedule.breakStartTime && schedule.breakEndTime
          ? {
              startTime: schedule.breakStartTime,
              endTime: schedule.breakEndTime,
              reason: schedule.breakReason,
            }
          : undefined,
      slotDurationMinutes: slotDuration,
      totalSlots: slots.length,
      availableSlotsCount: 0,
      slots: slots.map((s) => ({
        ...s,
        isAvailable: false,
        status: "BOOKED" as const,
        reason: "Capacity limit reached",
      })),
    };
  }

  const availableCount = slots.filter((s) => s.isAvailable).length;
  let nextAvailableDate: string | null = null;
  if (availableCount === 0) {
    nextAvailableDate = await findNextAvailableDate(doctorId, dateObj);
  }

  return {
    doctorId,
    doctorName,
    date: dateStr,
    dayOfWeek,
    available: availableCount > 0,
    isFullyBooked: false,
    currentBookedCount,
    maxDailyAppointments: effectiveMaxDaily,
    nextAvailableDate,
    unavailabilityReason: availableCount === 0 ? "No available slots remain for this date." : undefined,
    workingHours: { startTime: schedule.startTime, endTime: schedule.endTime },
    breakHours:
      schedule.breakStartTime && schedule.breakEndTime
        ? {
            startTime: schedule.breakStartTime,
            endTime: schedule.breakEndTime,
            reason: schedule.breakReason,
          }
        : undefined,
    slotDurationMinutes: slotDuration,
    totalSlots: slots.length,
    availableSlotsCount: availableCount,
    slots,
  };
  } catch (error) {
    console.warn(`[Schedule Service] DB unavailable or lookup error for doctor ${doctorId}. Using fallback slots.`, error);
    return generateFallbackSlots(doctorId, targetDateInput);
  }
}

/**
 * Replaces or upserts a Doctor's weekly schedule.
 */
export async function saveDoctorWeeklySchedules(
  doctorId: string,
  schedules: ScheduleItemInput[],
  actorUserId?: string
) {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { clinicId: true },
  });

  if (!doctor) throw new Error("Doctor not found");

  await prisma.$transaction(async (tx) => {
    // Delete existing schedules for this doctor
    await tx.doctorSchedule.deleteMany({
      where: { doctorId },
    });

    // Insert new schedule records
    if (schedules.length > 0) {
      await tx.doctorSchedule.createMany({
        data: schedules.map((s) => ({
          doctorId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          slotDurationMinutes: s.slotDurationMinutes || 15,
          maxPatientsPerSlot: s.maxPatientsPerSlot || 1,
          maxDailyAppointments: s.maxDailyAppointments ?? null,
          breakStartTime: s.breakStartTime || null,
          breakEndTime: s.breakEndTime || null,
          breakReason: s.breakReason || null,
          isAvailable: s.isAvailable !== false,
        })),
      });
    }
  });

  await recordAuditLog({
    userId: actorUserId,
    clinicId: doctor.clinicId,
    action: "UPDATE_DOCTOR_SCHEDULE",
    entity: "DoctorSchedule",
    entityId: doctorId,
    metadata: { count: schedules.length },
  });

  // Non-blocking notification dispatch
  sendDoctorScheduleChangedNotification(doctorId, "Weekly consultation timings have been updated.").catch((err) => {
    console.error("[ScheduleService] Notification trigger error:", err);
  });

  return prisma.doctorSchedule.findMany({
    where: { doctorId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}

/**
 * Adds a leave for a doctor.
 */
export async function addDoctorLeave(
  doctorId: string,
  input: DoctorLeaveInput,
  actorUserId?: string
) {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { clinicId: true },
  });

  if (!doctor) throw new Error("Doctor not found");

  const { dateObj: startDate } = normalizeDate(input.startDate);
  const { dateObj: endDate } = normalizeDate(input.endDate);

  if (endDate < startDate) {
    throw new Error("Leave end date cannot be earlier than start date.");
  }

  const leave = await prisma.doctorLeave.create({
    data: {
      doctorId,
      startDate,
      endDate,
      reason: input.reason?.trim() || null,
      isApproved: input.isApproved !== false,
    },
  });

  await recordAuditLog({
    userId: actorUserId,
    clinicId: doctor.clinicId,
    action: "ADD_DOCTOR_LEAVE",
    entity: "DoctorLeave",
    entityId: leave.id,
    metadata: input as unknown as Record<string, unknown>,
  });

  // Non-blocking notification dispatch
  const leaveStartStr = startDate.toISOString().slice(0, 10);
  const leaveEndStr = endDate.toISOString().slice(0, 10);
  sendDoctorScheduleChangedNotification(
    doctorId,
    `Doctor is on leave from ${leaveStartStr} to ${leaveEndStr}: ${input.reason || "Approved Leave"}`
  ).catch((err) => {
    console.error("[ScheduleService] Notification trigger error:", err);
  });

  return leave;
}

/**
 * Deletes a doctor leave.
 */
export async function deleteDoctorLeave(leaveId: string, actorUserId?: string) {
  const leave = await prisma.doctorLeave.findUnique({
    where: { id: leaveId },
    include: { doctor: { select: { clinicId: true } } },
  });

  if (!leave) throw new Error("Leave not found");

  await prisma.doctorLeave.delete({ where: { id: leaveId } });

  await recordAuditLog({
    userId: actorUserId,
    clinicId: leave.doctor.clinicId,
    action: "DELETE_DOCTOR_LEAVE",
    entity: "DoctorLeave",
    entityId: leaveId,
  });

  return { success: true };
}

/**
 * Adds a blocked slot / date for a doctor.
 */
export async function addDoctorBlockedSlot(
  doctorId: string,
  input: DoctorBlockedSlotInput,
  actorUserId?: string
) {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { clinicId: true },
  });

  if (!doctor) throw new Error("Doctor not found");

  const { dateObj: date } = normalizeDate(input.date);

  const blocked = await prisma.doctorBlockedSlot.create({
    data: {
      doctorId,
      date,
      startTime: input.startTime?.trim() || null,
      endTime: input.endTime?.trim() || null,
      reason: input.reason?.trim() || null,
    },
  });

  await recordAuditLog({
    userId: actorUserId,
    clinicId: doctor.clinicId,
    action: "ADD_DOCTOR_BLOCKED_SLOT",
    entity: "DoctorBlockedSlot",
    entityId: blocked.id,
    metadata: input as unknown as Record<string, unknown>,
  });

  return blocked;
}

/**
 * Deletes a blocked slot.
 */
export async function deleteDoctorBlockedSlot(slotId: string, actorUserId?: string) {
  const slot = await prisma.doctorBlockedSlot.findUnique({
    where: { id: slotId },
    include: { doctor: { select: { clinicId: true } } },
  });

  if (!slot) throw new Error("Blocked slot not found");

  await prisma.doctorBlockedSlot.delete({ where: { id: slotId } });

  await recordAuditLog({
    userId: actorUserId,
    clinicId: slot.doctor.clinicId,
    action: "DELETE_DOCTOR_BLOCKED_SLOT",
    entity: "DoctorBlockedSlot",
    entityId: slotId,
  });

  return { success: true };
}

/**
 * Adds a Clinic Holiday.
 */
export async function addClinicHoliday(
  clinicId: string,
  input: ClinicHolidayInput,
  actorUserId?: string
) {
  const { dateObj: date } = normalizeDate(input.date);

  const holiday = await prisma.clinicHoliday.create({
    data: {
      clinicId,
      date,
      title: input.title.trim(),
      description: input.description?.trim() || null,
    },
  });

  await recordAuditLog({
    userId: actorUserId,
    clinicId,
    action: "ADD_CLINIC_HOLIDAY",
    entity: "ClinicHoliday",
    entityId: holiday.id,
    metadata: input as unknown as Record<string, unknown>,
  });

  return holiday;
}

/**
 * Deletes a Clinic Holiday.
 */
export async function deleteClinicHoliday(holidayId: string, actorUserId?: string) {
  const holiday = await prisma.clinicHoliday.findUnique({
    where: { id: holidayId },
  });

  if (!holiday) throw new Error("Holiday not found");

  await prisma.clinicHoliday.delete({ where: { id: holidayId } });

  await recordAuditLog({
    userId: actorUserId,
    clinicId: holiday.clinicId,
    action: "DELETE_CLINIC_HOLIDAY",
    entity: "ClinicHoliday",
    entityId: holidayId,
  });

  return { success: true };
}

/**
 * Lists clinic holidays.
 */
export async function getClinicHolidays(clinicId: string) {
  return prisma.clinicHoliday.findMany({
    where: { clinicId },
    orderBy: { date: "asc" },
  });
}
