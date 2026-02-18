"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { actionError, type ActionResult } from "@/lib/contracts/action-result";
import { createUserSession, clearUserSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

type LoginInput = {
  email: string;
  password: string;
};

export async function login(data: LoginInput): Promise<ActionResult<{ role: "ADMIN" | "VIEWER" }>> {
  try {
    const db = prisma as any;
    const bootstrapEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
    const bootstrapPassword = process.env.INITIAL_ADMIN_PASSWORD?.trim();
    if (bootstrapEmail && bootstrapPassword) {
      const existing = await db.user.findUnique({
        where: { email: bootstrapEmail },
        select: { id: true, passwordHash: true },
      });
      if (!existing || !existing.passwordHash) {
        await db.user.upsert({
          where: { email: bootstrapEmail },
          update: {
            name: "Initial Admin",
            role: "ADMIN",
            isActive: true,
            passwordHash: hashPassword(bootstrapPassword),
          },
          create: {
            email: bootstrapEmail,
            name: "Initial Admin",
            role: "ADMIN",
            isActive: true,
            passwordHash: hashPassword(bootstrapPassword),
          },
        });
      }
    }

    const email = data.email.trim().toLowerCase();
    const password = data.password;

    if (!email || !password) {
      return { success: false, error: "Email y password son requeridos." };
    }

    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        role: true,
        isActive: true,
        passwordHash: true,
      },
    });

    if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
      return { success: false, error: "Credenciales invalidas." };
    }

    await createUserSession(user.id);

    return {
      success: true,
      data: { role: user.role === "ADMIN" ? "ADMIN" : "VIEWER" },
    };
  } catch (error: unknown) {
    return actionError(error, "No se pudo iniciar sesion.");
  }
}

export async function logout(): Promise<void> {
  await clearUserSession();
  redirect("/login");
}
