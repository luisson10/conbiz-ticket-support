import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_BYPASS = process.env.CONBIZ_AUTH_BYPASS === "true";
const CAN_BYPASS = AUTH_BYPASS && process.env.NODE_ENV !== "production";

function normalizeRole(role: string | null | undefined) {
  return role?.toUpperCase() === "ADMIN" ? "ADMIN" : "VIEWER";
}

export function proxy(request: NextRequest) {
  if (CAN_BYPASS) return NextResponse.next();

  if (AUTH_BYPASS && process.env.NODE_ENV === "production") {
    return new NextResponse("Invalid auth configuration", { status: 500 });
  }

  const hasSessionCookie = Boolean(request.cookies.get("conbiz_session")?.value);

  const userId =
    request.headers.get("x-conbiz-user-id") ||
    request.cookies.get("conbiz_user_id")?.value ||
    null;

  const role = normalizeRole(
    request.headers.get("x-conbiz-user-role") || request.cookies.get("conbiz_user_role")?.value
  );

  if (hasSessionCookie) {
    return NextResponse.next();
  }

  if (!userId || role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
