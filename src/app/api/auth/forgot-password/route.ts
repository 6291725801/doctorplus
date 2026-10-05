import { NextRequest } from "next/server";
import { forgotPasswordSchema } from "@/lib/validators/auth";
import { requestPasswordReset } from "@/lib/services/auth.service";
import { successResponse, handleApiError } from "@/lib/utils/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = forgotPasswordSchema.parse(body);

    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");
    const userAgent = request.headers.get("user-agent");

    const result = await requestPasswordReset(validatedData, {
      ipAddress: clientIp,
      userAgent,
    });

    return successResponse(result, result.message);
  } catch (error) {
    return handleApiError(error);
  }
}
