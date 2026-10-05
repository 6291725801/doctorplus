import { UserRole } from "@prisma/client";

export type Permission =
  | "platform:super_admin"
  | "clinic:manage"
  | "clinic:view"
  | "doctors:manage"
  | "doctors:view"
  | "services:manage"
  | "services:view"
  | "schedules:manage"
  | "schedules:view"
  | "appointments:manage"
  | "appointments:view_all"
  | "appointments:view_assigned"
  | "appointments:check_in"
  | "appointments:book"
  | "cms:manage"
  | "cms:view"
  | "media:manage"
  | "media:view"
  | "patients:manage"
  | "patients:view_all"
  | "patients:view_assigned"
  | "patient_profile:manage_own"
  | "reports:view"
  | "audit:view";

/**
 * Granular permissions mapped to each system role.
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    "platform:super_admin",
    "clinic:manage",
    "clinic:view",
    "doctors:manage",
    "doctors:view",
    "services:manage",
    "services:view",
    "schedules:manage",
    "schedules:view",
    "appointments:manage",
    "appointments:view_all",
    "appointments:view_assigned",
    "appointments:check_in",
    "appointments:book",
    "cms:manage",
    "cms:view",
    "media:manage",
    "media:view",
    "patients:manage",
    "patients:view_all",
    "patients:view_assigned",
    "patient_profile:manage_own",
    "reports:view",
    "audit:view",
  ],

  CLINIC_ADMIN: [
    "clinic:manage",
    "clinic:view",
    "doctors:manage",
    "doctors:view",
    "services:manage",
    "services:view",
    "schedules:manage",
    "schedules:view",
    "appointments:manage",
    "appointments:view_all",
    "appointments:view_assigned",
    "appointments:check_in",
    "appointments:book",
    "cms:manage",
    "cms:view",
    "media:manage",
    "media:view",
    "patients:manage",
    "patients:view_all",
    "patients:view_assigned",
    "patient_profile:manage_own",
    "reports:view",
    "audit:view",
  ],

  DOCTOR: [
    "clinic:view",
    "doctors:view",
    "services:view",
    "schedules:view",
    "appointments:view_assigned",
    "patients:view_assigned",
    "patient_profile:manage_own",
  ],

  RECEPTIONIST: [
    "clinic:view",
    "doctors:view",
    "services:view",
    "schedules:view",
    "appointments:manage",
    "appointments:view_all",
    "appointments:check_in",
    "appointments:book",
    "patients:manage",
    "patients:view_all",
    "patient_profile:manage_own",
  ],

  CONTENT_MANAGER: [
    "clinic:view",
    "cms:manage",
    "cms:view",
    "media:manage",
    "media:view",
    "services:view",
    "doctors:view",
    "patient_profile:manage_own",
  ],

  PATIENT: [
    "clinic:view",
    "doctors:view",
    "services:view",
    "appointments:book",
    "patient_profile:manage_own",
  ],
};

/**
 * Checks whether a given role possesses a specific permission.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Checks whether a user's role is in the allowed list of roles.
 */
export function isAuthorized(
  userRole: UserRole,
  allowedRoles: UserRole[]
): boolean {
  if (userRole === "SUPER_ADMIN") return true;
  return allowedRoles.includes(userRole);
}

/**
 * Returns the default redirect path after login for a given role.
 */
export function getDefaultDashboardPath(role: UserRole): string {
  switch (role) {
    case "SUPER_ADMIN":
    case "CLINIC_ADMIN":
      return "/dashboard/admin";
    case "DOCTOR":
      return "/dashboard/doctor";
    case "RECEPTIONIST":
      return "/dashboard/receptionist";
    case "CONTENT_MANAGER":
      return "/dashboard/admin";
    case "PATIENT":
    default:
      return "/dashboard/patient";
  }
}
