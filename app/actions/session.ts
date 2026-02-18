"use server";

import { requireAuth } from "@/lib/auth";
import { actionError, type ActionResult } from "@/lib/contracts/action-result";

type SessionInfo = {
  userId: string;
  role: "ADMIN" | "VIEWER";
  email?: string;
};

export async function getSessionInfo(): Promise<ActionResult<SessionInfo>> {
  try {
    const auth = await requireAuth();
    return {
      success: true,
      data: {
        userId: auth.userId,
        role: auth.role,
        email: auth.email,
      },
    };
  } catch (error: unknown) {
    return actionError(error, "Failed to resolve session info.");
  }
}
