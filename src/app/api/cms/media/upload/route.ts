import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { uploadMediaAsset, getActiveClinic } from "@/lib/services/cms.service";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const allowedRoles = ["SUPER_ADMIN", "CLINIC_ADMIN", "CONTENT_MANAGER"];
    if (!allowedRoles.includes(session.role)) {
      return errorResponse("Forbidden: Insufficient privileges", "FORBIDDEN", 403);
    }

    const activeClinic = await getActiveClinic();
    const clinicId = session.clinicId || activeClinic.id;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const altText = (formData.get("altText") as string) || "";
    const title = (formData.get("title") as string) || "";

    if (!file) {
      return errorResponse("No file was uploaded.", "NO_FILE", 400);
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return errorResponse(
        `Invalid file type "${file.type}". Only JPG, PNG, WEBP, and SVG are supported.`,
        "INVALID_FILE_TYPE",
        415
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return errorResponse(
        `File size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`,
        "FILE_TOO_LARGE",
        413
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const asset = await uploadMediaAsset(
      clinicId,
      buffer,
      file.name,
      file.type,
      altText,
      title,
      session.userId
    );

    return successResponse(asset, "Media uploaded successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
