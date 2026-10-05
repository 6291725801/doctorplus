import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { logoutUser } from "@/lib/services/auth.service";
import { successResponse } from "@/lib/utils/api-response";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");
    const userAgent = request.headers.get("user-agent");

    await logoutUser(session?.userId, {
      ipAddress: clientIp,
      userAgent,
    });

    const acceptHeader = request.headers.get("accept") || "";
    if (acceptHeader.includes("application/json") && !acceptHeader.includes("text/html")) {
      return successResponse({ loggedOut: true, redirectTo: "/signup" }, "Logged out successfully");
    }

    return NextResponse.redirect(new URL("/signup", request.url), 303);
  } catch (error) {
    return NextResponse.redirect(new URL("/signup", request.url), 303);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");
    const userAgent = request.headers.get("user-agent");

    await logoutUser(session?.userId, {
      ipAddress: clientIp,
      userAgent,
    });

    return NextResponse.redirect(new URL("/signup", request.url), 303);
  } catch (error) {
    return NextResponse.redirect(new URL("/signup", request.url), 303);
  }
}

