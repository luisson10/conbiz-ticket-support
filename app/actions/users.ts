"use server";

import prisma from "@/lib/prisma";
import { createCustomer, findCustomer } from "./linear";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

export async function createUser(data: { name: string; email: string; role: string }) {
  try {
    requireAdmin();

    // 1. Check if user already exists in DB
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return { success: false, error: "User with this email already exists." };
    }

    // 2. Sync with Linear (Find or Create Customer)
    let linearCustomerId = null;
    
    // Check if customer exists in Linear
    const linearCheck = await findCustomer(data.email);
    if (!linearCheck.success) {
        console.error("Linear check failed:", linearCheck.error);
        // We might choose to proceed without linking or fail. Let's fail for now to ensure sync.
        // Or better, just log it and proceed, linking later? 
        // Let's try to create if not found.
    }

    if (linearCheck.success && linearCheck.data) {
        linearCustomerId = linearCheck.data.id;
    } else {
        // Create in Linear
        const createRes = await createCustomer(data.name, data.email);
        if (createRes.success && createRes.data) {
            linearCustomerId = createRes.data.id;
        } else {
            console.error("Failed to create Linear customer:", createRes.error);
        }
    }

    // 3. Create User in DB
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        linearCustomerId: linearCustomerId,
      },
    });

    revalidatePath("/admin/users");
    return { success: true, data: user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUsers() {
  try {
    requireAdmin();
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: users };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteUser(id: string) {
  try {
    requireAdmin();
    await prisma.user.delete({ where: { id } });
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
