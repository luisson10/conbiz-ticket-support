import { randomBytes, createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import prisma from "@/lib/prisma";

export type AuthRole = "ADMIN" | "VIEWER";

export type AuthContext = {
  userId: string;
  role: AuthRole;
  email?: string;
  boardIds: string[];
};

const AUTH_BYPASS = process.env.CONBIZ_AUTH_BYPASS === "true";
const CAN_BYPASS = AUTH_BYPASS && process.env.NODE_ENV !== "production";
const SESSION_COOKIE = "conbiz_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

function normalizeRole(role: string | null | undefined): AuthRole {
  return role?.toUpperCase() === "ADMIN" ? "ADMIN" : "VIEWER";
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function readLegacyAuth(): Promise<AuthContext | null> {
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

  return { userId, role, email, boardIds: [] };
}

async function readSessionAuth(): Promise<AuthContext | null> {
  const db = prisma as any;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashSessionToken(token);
  const now = new Date();

  const session = await db.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          role: true,
          email: true,
          isActive: true,
          boardAccess: { select: { boardId: true } },
        },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt <= now || !session.user.isActive) return null;

  await db.session.update({
    where: { id: session.id },
    data: { updatedAt: now },
  });

  return {
    userId: session.user.id,
    role: session.user.role === "ADMIN" ? "ADMIN" : "VIEWER",
    email: session.user.email,
    boardIds: session.user.boardAccess.map((entry: { boardId: string }) => entry.boardId),
  };
}

export function isAuthBypassEnabled(): boolean {
  return CAN_BYPASS;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  if (CAN_BYPASS) {
    return { userId: "dev-user", role: "ADMIN", boardIds: [] };
  }

  if (AUTH_BYPASS && process.env.NODE_ENV === "production") {
    throw new Error("CONBIZ_AUTH_BYPASS cannot be enabled in production.");
  }

  const session = await readSessionAuth();
  if (session) return session;

  return readLegacyAuth();
}

export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext();
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

export async function createUserSession(userId: string): Promise<void> {
  const db = prisma as any;
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearUserSession(): Promise<void> {
  const db = prisma as any;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = hashSessionToken(token);
    await db.session.deleteMany({
      where: { tokenHash },
    });
  }
  cookieStore.delete(SESSION_COOKIE);
}
