import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/utils/api-response";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory sliding window rate limit store
const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up expired records every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (record.resetAt <= now) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

export interface RateLimitOptions {
  limit?: number; // max requests within the window
  windowSeconds?: number; // window duration in seconds
  identifierPrefix?: string; // namespace prefix (e.g. "auth", "appointment", "health")
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

/**
 * Checks and updates rate limit for a specific identifier.
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const limit = options.limit ?? 60;
  const windowSeconds = options.windowSeconds ?? 60;
  const prefix = options.identifierPrefix ?? "global";
  const compositeKey = `${prefix}:${key}`;

  const now = Date.now();
  const existing = rateLimitStore.get(compositeKey);

  if (!existing || existing.resetAt <= now) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    };
    rateLimitStore.set(compositeKey, newRecord);
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetSeconds: windowSeconds,
    };
  }

  if (existing.count >= limit) {
    const resetSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetSeconds,
    };
  }

  existing.count += 1;
  const resetSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  return {
    allowed: true,
    limit,
    remaining: limit - existing.count,
    resetSeconds,
  };
}

/**
 * Helper to extract client identifier (IP or token) from NextRequest
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

/**
 * Applies rate limiting to a NextRequest and returns standard headers or an HTTP 429 response if breached.
 */
export function applyRateLimit(
  req: NextRequest,
  options: RateLimitOptions = {}
) {
  const ip = getClientIp(req);
  const result = checkRateLimit(ip, options);

  const headers: Record<string, string> = {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.resetSeconds.toString(),
  };

  if (!result.allowed) {
    return {
      blocked: true,
      response: errorResponse(
        "Too many requests. Please slow down and try again shortly.",
        "RATE_LIMIT_EXCEEDED",
        429
      ),
      headers,
    };
  }

  return {
    blocked: false,
    headers,
  };
}

/**
 * Resets rate limit for testing purposes.
 */
export function resetRateLimits() {
  rateLimitStore.clear();
}
