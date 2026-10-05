import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listMediaAssets, getActiveClinic } from "@/lib/services/cms.service";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const activeClinic = await getActiveClinic();
    const clinicId = session.clinicId || activeClinic.id;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;

    const assets = await listMediaAssets(clinicId, search);
    return successResponse(assets);
  } catch (error) {
    return handleApiError(error);
  }
}
