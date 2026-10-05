import { prisma } from "@/lib/db";

export interface CreateAuditLogParams {
  userId?: string | null;
  clinicId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface GetAuditLogsParams {
  clinicId?: string | null;
  userId?: string | null;
  action?: string | null;
  entity?: string | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  search?: string | null;
  page?: number;
  limit?: number;
}

/**
 * Creates an immutable audit log record for tracking administrative,
 * security, clinical, and financial actions.
 */
export async function recordAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        clinicId: params.clinicId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (error) {
    // Audit logging should not crash the primary operational transaction,
    // but should be logged to stderr.
    console.error("⚠️ Failed to record audit log:", error);
  }
}

/**
 * Retrieves paginated audit logs with multi-dimensional filtering.
 */
export async function getAuditLogs(params: GetAuditLogsParams = {}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (params.clinicId) {
    where.clinicId = params.clinicId;
  }
  if (params.userId) {
    where.userId = params.userId;
  }
  if (params.action && params.action !== "ALL") {
    where.action = params.action;
  }
  if (params.entity && params.entity !== "ALL") {
    where.entity = params.entity;
  }

  if (params.startDate || params.endDate) {
    const dateRange: Record<string, Date> = {};
    if (params.startDate) {
      dateRange.gte = new Date(params.startDate);
    }
    if (params.endDate) {
      const end = new Date(params.endDate);
      end.setHours(23, 59, 59, 999);
      dateRange.lte = end;
    }
    where.createdAt = dateRange;
  }

  if (params.search && params.search.trim()) {
    const s = params.search.trim();
    where.OR = [
      { action: { contains: s, mode: "insensitive" } },
      { entity: { contains: s, mode: "insensitive" } },
      { entityId: { contains: s, mode: "insensitive" } },
      { user: { fullName: { contains: s, mode: "insensitive" } } },
      { user: { email: { contains: s, mode: "insensitive" } } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs: logs.map((log) => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt.toISOString(),
      user: log.user
        ? {
            id: log.user.id,
            fullName: log.user.fullName,
            email: log.user.email,
            role: log.user.role,
          }
        : null,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
