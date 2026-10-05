import { describe, it, expect } from "vitest";
import {
  successResponse,
  errorResponse,
  AppError,
  handleApiError,
} from "@/lib/utils/api-response";
import { z } from "zod";

describe("API Response Utilities & Error Handler", () => {
  it("should create a formatted success response", async () => {
    const res = successResponse({ id: 1, name: "Cardiology" }, "Success", 200);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: 1, name: "Cardiology" });
    expect(body.message).toBe("Success");
  });

  it("should create a formatted error response", async () => {
    const res = errorResponse("Unauthorized access", "AUTH_FAILED", 401);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("AUTH_FAILED");
    expect(body.error.message).toBe("Unauthorized access");
  });

  it("should handle custom AppError instances with appropriate status", async () => {
    const customError = new AppError("Invalid consultation fee", 422, "INVALID_FEE");
    const res = handleApiError(customError);
    expect(res.status).toBe(422);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("INVALID_FEE");
    expect(body.error.message).toBe("Invalid consultation fee");
  });

  it("should format ZodError into structured validation errors", async () => {
    const testSchema = z.object({ age: z.number().min(18) });
    try {
      testSchema.parse({ age: 12 });
    } catch (err) {
      const res = handleApiError(err);
      expect(res.status).toBe(422);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.details).toBeDefined();
    }
  });
});
