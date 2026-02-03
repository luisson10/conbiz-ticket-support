import { cookies, headers } from "next/headers";

export type AuthContext = {
  userId: string;
  role: "ADMIN" | "USER";
  email?: string;
};

const AUTH_BYPASS = process.env.CONBIZ_AUTH_BYPASS === "true";

function normalizeRole(role: string | null | undefined): "ADMIN" | "USER" {
  return role?.toUpperCase() === "ADMIN" ? "ADMIN" : "USER";
}

function readAuth(): AuthContext | null {
  const headerList = headers();
  const cookieStore = cookies();

  const userId =
    headerList.get("x-conbiz-user-id") ||
    cookieStore.get("conbiz_user_id")?.value ||
    null;

  if (!userId) return null;

  const role = normalizeRole(
    headerList.get("x-conbiz-user-role") ||
      cookieStore.get("conbiz_user_role")?.value
  );

  const email =
    headerList.get("x-conbiz-user-email") ||
    cookieStore.get("conbiz_user_email")?.value ||
    undefined;

  return { userId, role, email };
}

export function requireAuth(): AuthContext {
  if (AUTH_BYPASS) {
    return { userId: "dev-user", role: "ADMIN" };
  }

  const ctx = readAuth();
  if (!ctx) {
    throw new Error("Unauthorized");
  }
  return ctx;
}

export function requireAdmin(): AuthContext {
  const ctx = requireAuth();
  if (ctx.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return ctx;
}
