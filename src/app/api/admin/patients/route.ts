import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";

/**
 * GET /api/admin/patients
 * Strict RBAC: Accessible by SUPER_ADMIN, CLINIC_ADMIN, and RECEPTIONIST.
 * Lists clinic patients with search, appointment stats, and contact profiles.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["SUPER_ADMIN", "CLINIC_ADMIN", "RECEPTIONIST"].includes(session.role)) {
      return errorResponse("Forbidden: Insufficient privileges to view patient directory", "FORBIDDEN", 403);
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {
      role: "PATIENT",
    };

    if (search) {
      whereClause.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const [patients, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        include: {
          patientProfile: {
            include: {
              appointments: {
                select: {
                  id: true,
                  appointmentNumber: true,
                  appointmentDate: true,
                  status: true,
                  consultationFee: true,
                },
                orderBy: { appointmentDate: "desc" },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    const formattedPatients = patients.map((user) => {
      const profile = user.patientProfile;
      const appts = profile?.appointments || [];
      const completedCount = appts.filter((a) => a.status === "COMPLETED").length;
      const lastAppt = appts.length > 0 ? appts[0].appointmentDate.toISOString().slice(0, 10) : null;

      return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || null,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString().slice(0, 10),
        profileId: profile?.id || null,
        gender: profile?.gender || null,
        dateOfBirth: profile?.dateOfBirth ? profile.dateOfBirth.toISOString().slice(0, 10) : null,
        bloodGroup: profile?.bloodGroup || null,
        city: profile?.city || null,
        emergencyContactName: profile?.emergencyContactName || null,
        emergencyContactPhone: profile?.emergencyContactPhone || null,
        medicalNotes: session.role === "RECEPTIONIST" ? null : profile?.medicalNotes || null, // Receptionist doesn't need clinical notes
        totalAppointments: appts.length,
        completedAppointments: completedCount,
        lastAppointmentDate: lastAppt,
      };
    });

    return successResponse({
      patients: formattedPatients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
