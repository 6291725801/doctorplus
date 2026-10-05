# Phase 9: Clinic Management Reports & Business Intelligence Engine

## 1. Overview
Phase 9 delivers a comprehensive, real-time analytics, reporting, and audit governance engine for clinic administrators. Built strictly on live PostgreSQL database queries without fake numbers or mocks, the system delivers 10 core operational and financial KPIs, multi-dimensional breakdowns, RFC-4180 compliant CSV export with UTF-8 BOM, and immutable audit logs.

---

## 2. Dashboard KPIs (10 Core Operational & Financial Metrics)
The admin dashboard computes the following 10 metrics via optimized database aggregations:

| # | Metric | Database Computation Logic |
|---|--------|----------------------------|
| 1 | **Today's Appointments** | Count of appointments where `appointmentDate` matches today's clinic date. |
| 2 | **Upcoming Appointments** | Count of future/today appointments with active status (`PENDING`, `CONFIRMED`, `CHECKED_IN`, `IN_CONSULTATION`, `RESCHEDULED`). |
| 3 | **Completed Appointments** | Count of appointments with `status == COMPLETED` in filtered range. |
| 4 | **Cancelled Appointments** | Count of appointments with `status == CANCELLED` in filtered range. |
| 5 | **No-Show Appointments** | Count of appointments with `status == NO_SHOW` in filtered range. |
| 6 | **Total Patients** | Total unique registered users with `role == PATIENT`. |
| 7 | **New Patients** | Patients registered within the selected period (default: last 30 days). |
| 8 | **Revenue (₹)** | Actual realized collections from paid appointments/payments ledger. |
| 9 | **Pending Payments (₹)** | Total receivable balance amounts on uncancelled, non-paid bookings. |
| 10 | **Advance Payments (₹)** | Total advance booking deposits collected for active appointments. |

---

## 3. Reporting Modules

### A. Daily Operations Ledger
- **Aggregation**: Grouped by date (`appointmentDate`).
- **Columns**: Date, Day of Week, Total Booked, Confirmed, Completed, Cancelled, No-Show, Rescheduled, Advance Collected, Balance Collected, Total Revenue, Pending Balance.

### B. Weekly Summary
- **Aggregation**: Grouped by ISO calendar week (Monday to Sunday).
- **Columns**: Week Identifier, Start Date, End Date, Total Bookings, Completed Consultations, Cancelled, No-Show, Completion Rate (%), Total Revenue, Pending Balance.

### C. Monthly Performance Trends & Cohorts
- **Aggregation**: Grouped by Year-Month.
- **Columns**: Month Identifier, Month Name, Total Bookings, Completed, Cancelled, No-Show, New Patients Registered, Completion %, Cancellation %, Total Revenue.

### D. Doctor-Wise Clinical Workload
- **Aggregation**: Grouped by physician (`doctorId`).
- **Columns**: Doctor Name, Specialization, Total Assigned, Completed, Cancelled, No-Show, Completion Rate (%), Revenue Generated (₹), Pending Receivables (₹).

### E. Service-Wise Demand Analysis
- **Aggregation**: Grouped by treatment (`serviceId`).
- **Columns**: Service Name, Standard Fee (₹), Total Bookings, Completed Consultations, Cancelled, Share of Total Clinic Bookings (%), Total Revenue (₹).

### F. Payment-Wise Multi-Channel Ledger
- **Aggregation**: Grouped by payment channel (`ONLINE`, `CASH`, `UPI`, `CARD`) and status (`PAID`, `PENDING`, `PARTIALLY_PAID`, `REFUNDED`, `FAILED`).
- **Metrics**: Total Gross Collections, Total Refunds, Net Realized Cash Inflow, Transaction Counts, and Channel Volume.

---

## 4. Multi-Dimensional Filtering
All dashboard KPIs and reports can be filtered in real-time by:
- **Date Presets**: "All Time", "Today", "This Week", "This Month", "Last 30 Days", "Year-to-Date".
- **Custom Date Range**: `startDate` (YYYY-MM-DD) to `endDate` (YYYY-MM-DD).
- **Physician**: Specific doctor ID or `ALL`.
- **Clinical Service**: Specific service ID or `ALL`.
- **Appointment Status**: `ALL`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`, `PENDING`, `CHECKED_IN`, `RESCHEDULED`.
- **Payment Status**: `ALL`, `PAID`, `PENDING`, `PARTIALLY_PAID`, `REFUNDED`.

---

## 5. RFC 4180 Compliant CSV Export Engine
Located at [`src/lib/services/csv-export.service.ts`](file:///c:/Users/rohit/Documents/Real%20project/src/lib/services/csv-export.service.ts):
- **RFC 4180 Compliance**: Quotes strings containing commas, quotes, or newlines, and escapes internal quotes (`""`).
- **UTF-8 BOM Prefix (`\uFEFF`)**: Injected into the first 3 bytes (`0xEF 0xBB 0xBF`) to ensure Microsoft Excel, Apple Numbers, and Google Sheets render currencies (₹) and patient names without encoding corruption.
- **Dedicated Export Types**:
  - `daily`: Daily operations ledger.
  - `weekly`: Weekly aggregate summary.
  - `monthly`: Monthly performance cohorts.
  - `doctor`: Doctor-wise performance and workload.
  - `service`: Service utilization and popularity.
  - `payment`: Payment methods and transaction volumes.
  - `appointments`: Full appointment master audit ledger.
- **Endpoint**: `GET /api/admin/reports/export?type=...` sets `Content-Type: text/csv; charset=utf-8` with dynamic attachment filenames.

---

## 6. System Audit Logging & Governance Trail
Located at [`src/lib/services/audit.service.ts`](file:///c:/Users/rohit/Documents/Real%20project/src/lib/services/audit.service.ts):
- **Model**: `AuditLog` in Prisma storing `action`, `entity`, `entityId`, `userId`, `clinicId`, `metadata`, `ipAddress`, `userAgent`, and `createdAt`.
- **Automated Logging**:
  - `REPORT_VIEWED`: Recorded on report generation with applied filter metadata.
  - `REPORT_EXPORTED`: Recorded on CSV downloads with type and parameters.
  - `STATUS_COMPLETED`, `STATUS_NO_SHOW`, `STATUS_CHECKED_IN`: Recorded on appointment state transitions.
  - `BOOK_APPOINTMENT`, `CANCEL_APPOINTMENT`, `RESCHEDULE_APPOINTMENT`: Recorded on booking operations.
  - `PAYMENT_VERIFIED`, `PAYMENT_REFUNDED`: Recorded on financial transactions.
- **Admin UI**: Filterable, searchable audit table inside the admin reports view.

---

## 7. Query Optimization & Performance
- **Composite Database Indexes**:
  - `Appointment`: `[clinicId, appointmentDate]`, `[doctorId, appointmentDate]`, `[serviceId, appointmentDate]`, `[status, appointmentDate]`, `[appointmentDate]`.
  - `Payment`: `[createdAt]`, `[method, status]`, `[paidAt]`.
  - `AuditLog`: `[createdAt]`, `[action, createdAt]`, `[clinicId, action]`.
- **Parallel Query Execution**: Queries run concurrently via `Promise.all`.
- **SLA Benchmark**: Dashboard metrics and multi-report aggregations execute in under 300ms.

---

## 8. Test Verification
All 28 tests passing across two dedicated test suites:
- [`tests/integration/phase9-clinic-reports.test.ts`](file:///c:/Users/rohit/Documents/Real%20project/tests/integration/phase9-clinic-reports.test.ts): 15 tests.
- [`tests/integration/phase9-api-routes.test.ts`](file:///c:/Users/rohit/Documents/Real%20project/tests/integration/phase9-api-routes.test.ts): 13 tests.
- Zero TypeScript errors (`npm run typecheck`).
