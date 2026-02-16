"use server";

import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { requireAdmin, requireAuth } from "@/lib/auth";

type BoardTypeInput = "SUPPORT" | "PROJECT";

type AccountRecord = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeAccountName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

async function listAccountsSafe() {
  const accountDelegate = (prisma as any).account;
  if (accountDelegate?.findMany) {
    return accountDelegate.findMany({
      orderBy: { name: "asc" },
    }) as Promise<AccountRecord[]>;
  }

  const rows = await prisma.$queryRaw<Array<{ id: string; name: string; createdAt: string; updatedAt: string }>>`
    SELECT id, name, createdAt, updatedAt
    FROM "Account"
    ORDER BY name ASC
  `;
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }));
}

async function createAccountSafe(name: string) {
  const accountDelegate = (prisma as any).account;
  if (accountDelegate?.create) {
    return accountDelegate.create({
      data: { name },
    }) as Promise<AccountRecord>;
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  await prisma.$executeRaw`
    INSERT INTO "Account" (id, name, createdAt, updatedAt)
    VALUES (${id}, ${name}, ${now}, ${now})
  `;

  return {
    id,
    name,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

async function updateAccountSafe(id: string, name: string) {
  const accountDelegate = (prisma as any).account;
  if (accountDelegate?.update) {
    return accountDelegate.update({
      where: { id },
      data: { name },
    }) as Promise<AccountRecord>;
  }

  const now = new Date().toISOString();
  await prisma.$executeRaw`
    UPDATE "Account"
    SET name = ${name}, updatedAt = ${now}
    WHERE id = ${id}
  `;

  const rows = await prisma.$queryRaw<Array<{ id: string; name: string; createdAt: string; updatedAt: string }>>`
    SELECT id, name, createdAt, updatedAt
    FROM "Account"
    WHERE id = ${id}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) {
    throw new Error("Account not found.");
  }
  return {
    id: row.id,
    name: row.name,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export async function getBoards() {
  try {
    requireAuth();
    const boards = await prisma.board.findMany({
      include: {
        account: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: boards };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAccounts() {
  try {
    requireAuth();
    const accounts = await listAccountsSafe();
    return { success: true, data: accounts };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createAccount(data: { name: string }) {
  try {
    requireAdmin();
    const name = normalizeAccountName(data.name || "");
    if (!name) {
      return { success: false, error: "Account name is required." };
    }

    const existingAccounts = await listAccountsSafe();
    const existing = existingAccounts.find(
      (account) => account.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      return { success: false, error: "Ya existe una organizacion con ese nombre." };
    }

    const account = await createAccountSafe(name);
    return { success: true, data: account };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateAccount(data: { id: string; name: string }) {
  try {
    requireAdmin();
    const name = normalizeAccountName(data.name || "");
    if (!data.id || !name) {
      return { success: false, error: "Account id and name are required." };
    }

    const existingAccounts = await listAccountsSafe();
    const duplicate = existingAccounts.find(
      (account) =>
        account.id !== data.id &&
        account.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      return { success: false, error: "Ya existe una organizacion con ese nombre." };
    }

    const account = await updateAccountSafe(data.id, name);
    return { success: true, data: account };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createBoard(data: {
  name: string;
  teamId: string;
  projectId?: string | null;
  type: BoardTypeInput;
  accountId?: string | null;
  accountName?: string | null;
}) {
  try {
    requireAdmin();

    const name = data.name?.trim();
    const accountName = data.accountName?.trim();
    if (!name) {
      return { success: false, error: "Board name is required." };
    }

    if (data.type !== "SUPPORT" && data.type !== "PROJECT") {
      return { success: false, error: "Invalid board type." };
    }

    let accountId = data.accountId || null;
    if (!accountId && !accountName) {
      return { success: false, error: "Account is required." };
    }

    if (!accountId && accountName) {
      const normalizedName = normalizeAccountName(accountName);
      const existingAccounts = await listAccountsSafe();
      const existing = existingAccounts.find(
        (account) => account.name.trim().toLowerCase() === normalizedName.toLowerCase()
      );
      if (existing) {
        accountId = existing.id;
      } else {
        const created = await createAccountSafe(normalizedName);
        accountId = created.id;
      }
    }

    if (!accountId) {
      return { success: false, error: "Account is required." };
    }

    const board = await prisma.board.create({
      data: {
        name,
        type: data.type,
        accountId,
        teamId: data.teamId,
        projectId: data.projectId || null,
      },
      include: {
        account: true,
      },
    });

    return { success: true, data: board };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateBoard(data: {
  id: string;
  name: string;
  teamId: string;
  projectId?: string | null;
}) {
  try {
    requireAdmin();
    const name = data.name?.trim();
    if (!data.id || !name || !data.teamId) {
      return { success: false, error: "Board id, name and team are required." };
    }

    const board = await prisma.board.update({
      where: { id: data.id },
      data: {
        name,
        teamId: data.teamId,
        projectId: data.projectId || null,
      },
      include: {
        account: true,
      },
    });

    return { success: true, data: board };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
