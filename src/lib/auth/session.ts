import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { UserRole } from "@prisma/client";
import { env } from "@/lib/env";

export interface SessionPayload {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  clinicId?: string | null;
  [key: string]: unknown;
}

const JWT_SECRET_BYTES = new TextEncoder().encode(env.JWT_SECRET);
const SESSION_EXPIRATION = "7d";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Creates and signs a secure JWT session token.
 */
export async function createSessionToken(
  payload: SessionPayload
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRATION)
    .sign(JWT_SECRET_BYTES);
}

/**
 * Verifies and decodes a session JWT token.
 * Returns null if token is invalid or expired.
 */
export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_BYTES, {
      algorithms: ["HS256"],
    });

    if (
      !payload.userId ||
      !payload.email ||
      !payload.role ||
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      fullName: (payload.fullName as string) || "",
      role: payload.role as UserRole,
      clinicId: (payload.clinicId as string) || null,
    };
  } catch {
    return null;
  }
}

/**
 * Sets the secure session cookie on the outgoing response.
 */
export async function setSessionCookie(token: string): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(env.SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
  } catch {
    // When invoked outside Next.js HTTP request cycle (e.g. tests, CLI),
    // skip setting HTTP header without crashing.
  }
}

/**
 * Retrieves and validates the current session from incoming cookies.
 */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(env.SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Clears the session cookie on logout.
 */
export async function clearSessionCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(env.SESSION_COOKIE_NAME);
  } catch {
    // Outside request cycle
  }
}
