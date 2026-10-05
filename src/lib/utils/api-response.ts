import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Returns a standardized JSON success response.
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message ? { message } : {}),
    },
    { status }
  );
}

/**
 * Returns a standardized JSON error response.
 */
export function errorResponse(
  message: string,
  code = "BAD_REQUEST",
  status = 400,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status }
  );
}

/**
 * Custom application error with HTTP status and code.
 */
export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(
    message: string,
    statusCode = 400,
    code = "APP_ERROR",
    details?: unknown
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Centralized API error handler for Next.js App Router route handlers.
 */
export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  // Custom Application Error
  if (error instanceof AppError) {
    return errorResponse(error.message, error.code, error.statusCode, error.details);
  }

  // Zod Validation Error
  if (error instanceof ZodError) {
    const fieldErrors = error.flatten().fieldErrors;
    return errorResponse(
      "Validation failed",
      "VALIDATION_ERROR",
      422,
      fieldErrors
    );
  }

  // Prisma Database Known Request Errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = (error.meta?.target as string[])?.join(", ") || "field";
      return errorResponse(
        `A record with this ${target} already exists.`,
        "DUPLICATE_RECORD",
        409
      );
    }
    if (error.code === "P2025") {
      return errorResponse("Record not found.", "NOT_FOUND", 404);
    }
    return errorResponse(
      "A database error occurred.",
      "DATABASE_ERROR",
      500
    );
  }

  // Standard Error
  if (error instanceof Error) {
    return errorResponse(
      error.message || "An unexpected error occurred",
      "INTERNAL_SERVER_ERROR",
      500
    );
  }

  // Unknown fallback
  return errorResponse(
    "An unexpected error occurred",
    "INTERNAL_SERVER_ERROR",
    500
  );
}
