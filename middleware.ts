import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_BYPASS = process.env.CONBIZ_AUTH_BYPASS === "true";

function normalizeRole(role: string | null | undefined) {
  return role?.toUpperCase() === "ADMIN" ? "ADMIN" : "USER";
}

export function middleware(request: NextRequest) {
  if (AUTH_BYPASS) return NextResponse.next();

  const userId =
    request.headers.get("x-conbiz-user-id") ||
    request.cookies.get("conbiz_user_id")?.value ||
    null;

  const role = normalizeRole(
    request.headers.get("x-conbiz-user-role") ||
      request.cookies.get("conbiz_user_role")?.value
  );

  if (!userId || role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
