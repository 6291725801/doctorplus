import { AppError } from "@/lib/utils/api-response";
import { UserRole } from "@prisma/client";

export interface TenantContext {
  userId: string;
  role: UserRole;
  clinicId?: string | null;
}

/**
 * Asserts multi-tenant data isolation.
 *
 * Rules:
 * 1. SUPER_ADMIN has global authority. They may operate on any targetClinicId,
 *    or their current clinicId context.
 * 2. CLINIC_ADMIN, DOCTOR, RECEPTIONIST, CONTENT_MANAGER are strictly locked
 *    to their assigned `clinicId`.
 * 3. Any attempt by a clinic-scoped role to access or mutate another clinic's
 *    data immediately throws an HTTP 403 Forbidden error.
 *
 * @param session The authenticated user's session context
 * @param targetClinicId The clinic ID that is being accessed or modified
 * @returns The validated clinicId to use for database queries
 */
export function assertTenantAccess(
  session: TenantContext,
  targetClinicId?: string | null
): string {
  // Super Admin can access any requested clinic, or defaults to their session clinic
  if (session.role === "SUPER_ADMIN") {
    if (targetClinicId) return targetClinicId;
    if (session.clinicId) return session.clinicId;
    return ""; // Global context
  }

  // Clinic-scoped roles must belong to a clinic
  if (!session.clinicId) {
    throw new AppError(
      "User is not assigned to any active clinic tenant.",
      403,
      "TENANT_NOT_ASSIGNED"
    );
  }

  // If a specific targetClinicId was requested, it MUST match the user's assigned clinic
  if (targetClinicId && targetClinicId !== session.clinicId) {
    throw new AppError(
      "Access denied: Cross-clinic tenant access is strictly prohibited.",
      403,
      "TENANT_ISOLATION_VIOLATION"
    );
  }

  return session.clinicId;
}

/**
 * Injects multi-tenant clinic scoping into database query `where` clauses.
 * Prevents accidental cross-tenant data leaks.
 */
export function withTenantScope<T extends Record<string, unknown>>(
  session: TenantContext,
  whereClause: T = {} as T,
  explicitClinicId?: string | null
): T & { clinicId?: string } {
  if (session.role === "SUPER_ADMIN") {
    if (explicitClinicId) {
      return { ...whereClause, clinicId: explicitClinicId };
    }
    return whereClause;
  }

  if (!session.clinicId) {
    throw new AppError(
      "Tenant scope requires an assigned clinic.",
      403,
      "TENANT_NOT_ASSIGNED"
    );
  }

  return {
    ...whereClause,
    clinicId: session.clinicId,
  };
}
