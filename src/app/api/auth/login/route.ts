import { NextRequest } from "next/server";
import { loginSchema } from "@/lib/validators/auth";
import { authenticateUser } from "@/lib/services/auth.service";
import { successResponse, handleApiError } from "@/lib/utils/api-response";
import { getDefaultDashboardPath } from "@/lib/auth/rbac";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");
    const userAgent = request.headers.get("user-agent");

    const { user, token } = await authenticateUser(validatedData, {
      ipAddress: clientIp,
      userAgent,
    });

    return successResponse(
      {
        user,
        token,
        redirectTo: getDefaultDashboardPath(user.role),
      },
      "Logged in successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
