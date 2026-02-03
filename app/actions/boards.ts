"use server";

import prisma from "@/lib/prisma";
import { requireAdmin, requireAuth } from "@/lib/auth";

export async function getBoards() {
  try {
    requireAuth();
    const boards = await prisma.board.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: boards };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createBoard(data: {
  name: string;
  teamId: string;
  projectId?: string | null;
}) {
  try {
    requireAdmin();

    const board = await prisma.board.create({
      data: {
        name: data.name,
        teamId: data.teamId,
        projectId: data.projectId || null,
      },
    });

    return { success: true, data: board };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
