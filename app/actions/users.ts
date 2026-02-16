"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { createCustomer, findCustomer } from "./linear";
import { requireAdmin } from "@/lib/auth";
import { actionError, type ActionResult } from "@/lib/contracts/action-result";

type UserDto = {
  id: string;
  email: string;
  name: string;
  role: string;
  linearCustomerId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type CreateUserInput = { name: string; email: string; role: string };

export async function createUser(data: CreateUserInput): Promise<ActionResult<UserDto>> {
  try {
    await requireAdmin();

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return { success: false, error: "User with this email already exists." };
    }

    let linearCustomerId: string | null = null;

    const linearCheck = await findCustomer(data.email);
    if (!linearCheck.success) {
      console.error("Linear customer check failed:", linearCheck.error);
    }

    if (linearCheck.success && linearCheck.data) {
      linearCustomerId = linearCheck.data.id;
    } else {
      const createRes = await createCustomer(data.name, data.email);
      if (createRes.success) {
        linearCustomerId = createRes.data.id;
      } else {
        console.error("Failed to create Linear customer:", createRes.error);
      }
    }

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        linearCustomerId,
      },
    });

    revalidatePath("/admin/users");
    return { success: true, data: user };
  } catch (error: unknown) {
    return actionError(error, "Failed to create user.");
  }
}

export async function getUsers(): Promise<ActionResult<UserDto[]>> {
  try {
    await requireAdmin();
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: users };
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
