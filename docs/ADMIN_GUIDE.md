# Clinic Administrator Guide

## Overview

The Administration Portal empowers clinic owners and non-technical staff to customize clinic branding, manage doctor rosters, configure appointment booking parameters, manage website content, and view audit reports without touching source code.

## 1. Roles & Access Hierarchy

The platform implements 6 distinct user roles:

| Role | Primary Responsibility | Access Scope |
| :--- | :--- | :--- |
| **SUPER_ADMIN** | Platform owner & DevOps | Full multi-clinic control |
| **CLINIC_ADMIN** | Clinic Director / Practice Manager | Clinic settings, staff, CMS, appointments |
| **DOCTOR** | Medical Practitioner | Assigned appointments, clinical notes |
| **RECEPTIONIST** | Front-desk Officer | Daily queue, check-in, patient lookups |
| **CONTENT_MANAGER** | Marketing & Content Specialist | CMS pages, media, banners, FAQs, SEO |
| **PATIENT** | Client / Patient | Appointment booking, receipts, medical profile |

## 2. Managing Staff & Doctors

1. Navigate to `/dashboard/admin`.
2. Doctors can be assigned specific consultation fees, advance booking requirements (minimum ₹100), working hours, and slot durations.
3. Reception staff can be granted check-in access without exposing financial reports or site configuration.

## 3. Audit Logs & Security Oversight

Every administrative action (modifying consultation fees, updating schedules, changing CMS sections, user password resets) generates an entry in the immutable `AuditLog` table containing:
- User ID
- Timestamp
- Action name
- Entity and Entity ID
- IP address & User Agent
- Metadata changes
