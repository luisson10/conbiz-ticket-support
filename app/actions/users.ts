"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { createCustomer, findCustomer } from "./linear";
import { requireAdmin } from "@/lib/auth";
import { actionError, type ActionResult } from "@/lib/contracts/action-result";
import { hashPassword } from "@/lib/password";

type UserDto = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "VIEWER";
  boardIds: string[];
  hasPassword: boolean;
  linearCustomerId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type CreateUserInput = {
  name: string;
  email: string;
  role: "ADMIN" | "VIEWER";
  password: string;
  boardIds?: string[];
};

export async function createUser(data: CreateUserInput): Promise<ActionResult<UserDto>> {
  try {
    await requireAdmin();
    const db = prisma as any;
    const email = data.email.trim().toLowerCase();
    const name = data.name.trim();
    const password = data.password.trim();
    const role = data.role === "ADMIN" ? "ADMIN" : "VIEWER";
    const boardIds = [...new Set((data.boardIds || []).filter(Boolean))];

    if (!name || !email || !password) {
      return { success: false, error: "Nombre, email y password son requeridos." };
    }
    if (password.length < 8) {
      return { success: false, error: "El password debe tener al menos 8 caracteres." };
    }
    if (role === "VIEWER" && boardIds.length === 0) {
      return { success: false, error: "Un viewer debe tener al menos un board asignado." };
    }

    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, error: "User with this email already exists." };
    }

    let linearCustomerId: string | null = null;

    const linearCheck = await findCustomer(email);
    if (!linearCheck.success) {
      console.error("Linear customer check failed:", linearCheck.error);
    }

    if (linearCheck.success && linearCheck.data) {
      linearCustomerId = linearCheck.data.id;
    } else {
      const createRes = await createCustomer(name, email);
      if (createRes.success) {
        linearCustomerId = createRes.data.id;
      } else {
        console.error("Failed to create Linear customer:", createRes.error);
      }
    }

    const passwordHash = hashPassword(password);
    const user = await db.user.create({
      data: {
        name,
        email,
        role,
        passwordHash,
        linearCustomerId,
        boardAccess:
          role === "VIEWER"
            ? {
                createMany: {
                  data: boardIds.map((boardId) => ({ boardId })),
                  skipDuplicates: true,
                },
              }
            : undefined,
      },
      include: {
        boardAccess: {
          select: { boardId: true },
        },
      },
    });

    revalidatePath("/admin/users");
    return {
      success: true,
      data: {
        ...user,
        role: user.role === "ADMIN" ? "ADMIN" : "VIEWER",
        boardIds: user.boardAccess.map((entry: { boardId: string }) => entry.boardId),
        hasPassword: Boolean(user.passwordHash),
      },
    };
  } catch (error: unknown) {
    return actionError(error, "Failed to create user.");
  }
}

export async function getUsers(): Promise<ActionResult<UserDto[]>> {
  try {
    await requireAdmin();
    const db = prisma as any;
    const users = await db.user.findMany({
      include: {
        boardAccess: {
          select: { boardId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return {
      success: true,
      data: users.map((user: any) => ({
        ...user,
        role: user.role === "ADMIN" ? "ADMIN" : "VIEWER",
        boardIds: user.boardAccess.map((entry: { boardId: string }) => entry.boardId),
        hasPassword: Boolean(user.passwordHash),
      })),
    };
  } catch (error: unknown) {
    return actionError(error, "Failed to load users.");
  }
}

export async function deleteUser(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    await prisma.user.delete({ where: { id } });
    revalidatePath("/admin/users");
    return { success: true, data: { id } };
  } catch (error: unknown) {
    return actionError(error, "Failed to delete user.");
  }
}
