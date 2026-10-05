# Appointment System Architecture

## Core Principles

The appointment engine is built to guarantee transactional safety, eliminate race conditions, and strictly enforce capacity limits.

## 1. Capacity & Slot Models

- **`DoctorSchedule`**: Configures weekly recurring working windows:
  - Day of week (`MONDAY` ... `SUNDAY`)
  - Start time (`09:00`) and End time (`13:00`)
  - Slot duration in minutes (e.g. 15 or 30 minutes)
  - Maximum patients allowed per slot (e.g. 1 or 5)
- **`DoctorLeave`**: Date ranges when doctor is unavailable.
- **`AppointmentSlot`**:
  - `date`, `startTime`, `endTime`
  - `maxCapacity`: Maximum bookings permitted
  - `bookedCount`: Current number of confirmed bookings
  - `status`: `AVAILABLE`, `BOOKED`, `BLOCKED`

## 2. Overbooking Prevention & Concurrency

1. Booking requests execute within a PostgreSQL serializable transaction (`prisma.$transaction`).
2. The slot is locked using row-level locking or optimistic concurrency (`WHERE bookedCount < maxCapacity`).
3. If `bookedCount` reaches `maxCapacity`, the slot status flips to `BOOKED` ("FULLY BOOKED") and subsequent concurrent requests are rejected safely.
