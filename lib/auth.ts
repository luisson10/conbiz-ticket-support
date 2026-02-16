import { cookies, headers } from "next/headers";

export type AuthContext = {
  userId: string;
  role: "ADMIN" | "USER";
  email?: string;
};

const AUTH_BYPASS = process.env.CONBIZ_AUTH_BYPASS === "true";
const CAN_BYPASS = AUTH_BYPASS && process.env.NODE_ENV !== "production";

function normalizeRole(role: string | null | undefined): "ADMIN" | "USER" {
  return role?.toUpperCase() === "ADMIN" ? "ADMIN" : "USER";
}

async function readAuth(): Promise<AuthContext | null> {
  const headerList = await headers();
  const cookieStore = await cookies();

  const userId =
    headerList.get("x-conbiz-user-id") ||
    cookieStore.get("conbiz_user_id")?.value ||
    null;

  if (!userId) return null;

  const role = normalizeRole(
    headerList.get("x-conbiz-user-role") || cookieStore.get("conbiz_user_role")?.value
  );

  const email =
    headerList.get("x-conbiz-user-email") ||
    cookieStore.get("conbiz_user_email")?.value ||
    undefined;

  return { userId, role, email };
}

export function isAuthBypassEnabled(): boolean {
  return CAN_BYPASS;
}

export async function requireAuth(): Promise<AuthContext> {
  if (CAN_BYPASS) {
    return { userId: "dev-user", role: "ADMIN" };
  }

  if (AUTH_BYPASS && process.env.NODE_ENV === "production") {
    throw new Error("CONBIZ_AUTH_BYPASS cannot be enabled in production.");
  }

  const ctx = await readAuth();
  if (!ctx) {
    throw new Error("Unauthorized");
  }
  return ctx;
}

export async function requireAdmin(): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (ctx.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return ctx;
}
