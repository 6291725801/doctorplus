import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_that_is_at_least_32_chars_long_clinic_2026";
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "clinic_auth_session";
const secretBytes = new TextEncoder().encode(JWT_SECRET);

interface DecodedToken {
  userId: string;
  email: string;
  role: string;
  clinicId?: string | null;
}

async function verifyToken(token: string): Promise<DecodedToken | null> {
  try {
    const { payload } = await jwtVerify(token, secretBytes);
    if (!payload.userId || !payload.role) return null;
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
      clinicId: (payload.clinicId as string) || null,
    };
  } catch {
    return null;
  }
}

function getRoleRedirect(role: string): string {
  switch (role) {
    case "SUPER_ADMIN":
    case "CLINIC_ADMIN":
    case "CONTENT_MANAGER":
      return "/dashboard/admin";
    case "DOCTOR":
      return "/dashboard/doctor";
    case "RECEPTIONIST":
      return "/dashboard/receptionist";
    case "PATIENT":
    default:
      return "/dashboard/patient";
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  // 1. Auth routes redirect if user is already logged in
  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/reset-password");

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL(getRoleRedirect(session.role), request.url));
  }

  // 2. Protected Dashboard routes
  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Direct "/dashboard" root visits to role-specific dashboard
    if (pathname === "/dashboard" || pathname === "/dashboard/") {
      return NextResponse.redirect(new URL(getRoleRedirect(session.role), request.url));
    }

    // Admin dashboard protection
    if (pathname.startsWith("/dashboard/admin")) {
      const allowedRoles = ["SUPER_ADMIN", "CLINIC_ADMIN", "CONTENT_MANAGER"];
      if (!allowedRoles.includes(session.role)) {
        return NextResponse.redirect(new URL(getRoleRedirect(session.role), request.url));
      }
    }

    // Doctor dashboard protection
    if (pathname.startsWith("/dashboard/doctor")) {
      const allowedRoles = ["DOCTOR", "SUPER_ADMIN", "CLINIC_ADMIN"];
      if (!allowedRoles.includes(session.role)) {
        return NextResponse.redirect(new URL(getRoleRedirect(session.role), request.url));
      }
    }

    // Receptionist dashboard protection
    if (pathname.startsWith("/dashboard/receptionist")) {
      const allowedRoles = ["RECEPTIONIST", "SUPER_ADMIN", "CLINIC_ADMIN"];
      if (!allowedRoles.includes(session.role)) {
        return NextResponse.redirect(new URL(getRoleRedirect(session.role), request.url));
      }
    }
  }

  const response = NextResponse.next();

  // 3. Security Headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("X-XSS-Protection", "1; mode=block");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
