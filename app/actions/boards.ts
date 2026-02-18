"use server";

import prisma from "@/lib/prisma";
import { requireAdmin, requireAuth } from "@/lib/auth";
import { actionError, type ActionResult } from "@/lib/contracts/action-result";
import type { BoardDto } from "@/lib/contracts/portal";

type AccountRecord = {
  id: string;
  name: string;
};

type CreateBoardInput = {
  name: string;
  teamId: string;
  projectId?: string | null;
  type: "SUPPORT" | "PROJECT";
  accountId?: string | null;
  accountName?: string | null;
};

type UpdateBoardInput = {
  id: string;
  name: string;
  teamId: string;
  projectId?: string | null;
};

function normalizeAccountName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function toBoardDto(board: {
  id: string;
  name: string;
  type: BoardDto["type"];
  accountId: string;
  account: { id: string; name: string };
  teamId: string;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): BoardDto {
  return {
    id: board.id,
    name: board.name,
    type: board.type,
    accountId: board.accountId,
    account: board.account,
    teamId: board.teamId,
    projectId: board.projectId,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
  };
}

export async function getBoards(): Promise<ActionResult<BoardDto[]>> {
  try {
    const auth = await requireAuth();
    const boards = await prisma.board.findMany({
      where:
        auth.role === "ADMIN"
          ? undefined
          : {
              id: {
                in: auth.boardIds.length > 0 ? auth.boardIds : ["__no_board__"],
              },
            },
      include: {
        account: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: boards.map(toBoardDto) };
  } catch (error: unknown) {
    return actionError(error, "Failed to load boards.");
  }
}

export async function getAccounts(): Promise<ActionResult<AccountRecord[]>> {
  try {
    await requireAdmin();
    const accounts = await prisma.account.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return { success: true, data: accounts };
  } catch (error: unknown) {
    return actionError(error, "Failed to load accounts.");
  }
}

export async function createAccount(data: {
  name: string;
}): Promise<ActionResult<AccountRecord>> {
  try {
    await requireAdmin();
    const name = normalizeAccountName(data.name || "");
    if (!name) {
      return { success: false, error: "Account name is required." };
    }

    const existing = await prisma.account.findMany({
      select: { id: true, name: true },
    });
    const duplicateName = existing.find(
      (account) => account.name.trim().toLowerCase() === name.toLowerCase()
    );

    if (duplicateName) {
      return { success: false, error: "Ya existe una organizacion con ese nombre." };
    }

    const account = await prisma.account.create({
      data: { name },
      select: { id: true, name: true },
    });

    return { success: true, data: account };
  } catch (error: unknown) {
    return actionError(error, "Failed to create account.");
  }
}

export async function updateAccount(data: {
  id: string;
  name: string;
}): Promise<ActionResult<AccountRecord>> {
  try {
    await requireAdmin();
    const name = normalizeAccountName(data.name || "");
    if (!data.id || !name) {
      return { success: false, error: "Account id and name are required." };
    }

    const existing = await prisma.account.findMany({
      select: { id: true, name: true },
    });
    const duplicate = existing.find(
      (account) =>
        account.id !== data.id && account.name.trim().toLowerCase() === name.toLowerCase()
    );

    if (duplicate) {
      return { success: false, error: "Ya existe una organizacion con ese nombre." };
    }

    const account = await prisma.account.update({
      where: { id: data.id },
      data: { name },
      select: { id: true, name: true },
    });

    return { success: true, data: account };
  } catch (error: unknown) {
    return actionError(error, "Failed to update account.");
  }
}

export async function createBoard(data: CreateBoardInput): Promise<ActionResult<BoardDto>> {
  try {
    await requireAdmin();

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
      const accounts = await prisma.account.findMany({
        select: { id: true, name: true },
      });
      const existing = accounts.find(
        (account) => account.name.trim().toLowerCase() === normalizedName.toLowerCase()
      );
      if (existing) {
        accountId = existing.id;
      } else {
        const created = await prisma.account.create({
          data: { name: normalizedName },
        });
        accountId = created.id;
      }
    }

    if (!accountId) {
      return { success: false, error: "Account is required." };
    }

    const existingBoardType = await prisma.board.findFirst({
      where: {
        accountId,
        type: data.type,
      },
    });

    if (existingBoardType) {
      return {
        success: false,
        error:
          data.type === "SUPPORT"
            ? "Esta organizacion ya tiene un board de soporte."
            : "Esta organizacion ya tiene un board de proyecto.",
      };
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

    return { success: true, data: toBoardDto(board) };
  } catch (error: unknown) {
    return actionError(error, "Failed to create board.");
  }
}

export async function updateBoard(data: UpdateBoardInput): Promise<ActionResult<BoardDto>> {
  try {
    await requireAdmin();
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

    return { success: true, data: toBoardDto(board) };
  } catch (error: unknown) {
    return actionError(error, "Failed to update board.");
  }
}
