import { getSession } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/services/auth.service";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const user = await getUserProfile(session.userId);
    if (!user) {
      return errorResponse("User not found", "NOT_FOUND", 404);
    }

    return successResponse({
      user,
      session,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
