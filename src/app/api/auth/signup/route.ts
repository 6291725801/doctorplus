import { NextRequest } from "next/server";
import { signupSchema } from "@/lib/validators/auth";
import { registerPatient } from "@/lib/services/auth.service";
import { successResponse, handleApiError } from "@/lib/utils/api-response";
import { getDefaultDashboardPath } from "@/lib/auth/rbac";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = signupSchema.parse(body);

    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");
    const userAgent = request.headers.get("user-agent");

    const { user, token } = await registerPatient(validatedData, {
      ipAddress: clientIp,
      userAgent,
    });

    return successResponse(
      {
        user,
        token,
        redirectTo: getDefaultDashboardPath(user.role),
      },
      "Account registered successfully",
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
