import { describe, it, expect } from "vitest";
import {
  hasPermission,
  isAuthorized,
  getDefaultDashboardPath,
} from "@/lib/auth/rbac";
import { UserRole } from "@prisma/client";

describe("Role-Based Access Control (RBAC)", () => {
  describe("Permission Checks", () => {
    it("SUPER_ADMIN should have platform and clinic permissions", () => {
      expect(hasPermission("SUPER_ADMIN", "platform:super_admin")).toBe(true);
      expect(hasPermission("SUPER_ADMIN", "clinic:manage")).toBe(true);
      expect(hasPermission("SUPER_ADMIN", "doctors:manage")).toBe(true);
      expect(hasPermission("SUPER_ADMIN", "cms:manage")).toBe(true);
      expect(hasPermission("SUPER_ADMIN", "audit:view")).toBe(true);
    });

    it("CLINIC_ADMIN should manage clinic and staff but not super admin platform scope", () => {
      expect(hasPermission("CLINIC_ADMIN", "clinic:manage")).toBe(true);
      expect(hasPermission("CLINIC_ADMIN", "doctors:manage")).toBe(true);
      expect(hasPermission("CLINIC_ADMIN", "services:manage")).toBe(true);
      expect(hasPermission("CLINIC_ADMIN", "platform:super_admin")).toBe(false);
    });

    it("DOCTOR should view assigned appointments and patients, but not manage clinic settings", () => {
      expect(hasPermission("DOCTOR", "appointments:view_assigned")).toBe(true);
      expect(hasPermission("DOCTOR", "patients:view_assigned")).toBe(true);
      expect(hasPermission("DOCTOR", "clinic:manage")).toBe(false);
      expect(hasPermission("DOCTOR", "cms:manage")).toBe(false);
    });

    it("RECEPTIONIST should manage appointments and check-ins but not edit clinical profiles", () => {
      expect(hasPermission("RECEPTIONIST", "appointments:check_in")).toBe(true);
      expect(hasPermission("RECEPTIONIST", "appointments:manage")).toBe(true);
      expect(hasPermission("RECEPTIONIST", "clinic:manage")).toBe(false);
    });

    it("CONTENT_MANAGER should manage CMS and media assets", () => {
      expect(hasPermission("CONTENT_MANAGER", "cms:manage")).toBe(true);
      expect(hasPermission("CONTENT_MANAGER", "media:manage")).toBe(true);
      expect(hasPermission("CONTENT_MANAGER", "doctors:manage")).toBe(false);
    });

    it("PATIENT should book appointments and view own records only", () => {
      expect(hasPermission("PATIENT", "appointments:book")).toBe(true);
      expect(hasPermission("PATIENT", "patient_profile:manage_own")).toBe(true);
      expect(hasPermission("PATIENT", "appointments:manage")).toBe(false);
      expect(hasPermission("PATIENT", "patients:view_all")).toBe(false);
    });
  });

  describe("Role Authorization Guard (isAuthorized)", () => {
    it("SUPER_ADMIN is always authorized regardless of role list", () => {
      expect(isAuthorized("SUPER_ADMIN", ["DOCTOR"])).toBe(true);
      expect(isAuthorized("SUPER_ADMIN", ["PATIENT"])).toBe(true);
    });

    it("allows user when their role is in the allowed list", () => {
      const staffRoles: UserRole[] = ["CLINIC_ADMIN", "RECEPTIONIST"];
      expect(isAuthorized("CLINIC_ADMIN", staffRoles)).toBe(true);
      expect(isAuthorized("RECEPTIONIST", staffRoles)).toBe(true);
      expect(isAuthorized("DOCTOR", staffRoles)).toBe(false);
      expect(isAuthorized("PATIENT", staffRoles)).toBe(false);
    });
  });

  describe("Default Dashboard Path Resolution", () => {
    it("routes each role to its dedicated workspace", () => {
      expect(getDefaultDashboardPath("SUPER_ADMIN")).toBe("/dashboard/admin");
      expect(getDefaultDashboardPath("CLINIC_ADMIN")).toBe("/dashboard/admin");
      expect(getDefaultDashboardPath("CONTENT_MANAGER")).toBe("/dashboard/admin");
      expect(getDefaultDashboardPath("DOCTOR")).toBe("/dashboard/doctor");
      expect(getDefaultDashboardPath("RECEPTIONIST")).toBe("/dashboard/receptionist");
      expect(getDefaultDashboardPath("PATIENT")).toBe("/dashboard/patient");
    });
  });
});
