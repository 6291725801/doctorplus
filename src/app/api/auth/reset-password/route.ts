import { NextRequest } from "next/server";
import { resetPasswordSchema } from "@/lib/validators/auth";
import { resetPassword } from "@/lib/services/auth.service";
import { successResponse, handleApiError } from "@/lib/utils/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = resetPasswordSchema.parse(body);

    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");
    const userAgent = request.headers.get("user-agent");

    const result = await resetPassword(validatedData, {
      ipAddress: clientIp,
      userAgent,
    });

    return successResponse(result, result.message);
  } catch (error) {
    return handleApiError(error);
  }
}
