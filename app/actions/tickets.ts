"use server";

import { linearClient } from "@/lib/linear";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function createTicket(data: {
  boardId: string;
  title: string;
  description: string;
  priority?: number;
  dueDate?: string;
}) {
  try {
    requireAuth();

    const board = await prisma.board.findUnique({
      where: { id: data.boardId },
    });

    if (!board) {
      return { success: false, error: "Board not found." };
    }

    if (board.type === "PROJECT") {
      return {
        success: false,
        error: "This board is read-only. New tickets can only be created in support boards.",
      };
    }

    const issuePayload: any = {
      teamId: board.teamId,
      title: data.title,
      description: data.description,
      priority: data.priority,
      dueDate: data.dueDate,
    };

    if (board.projectId) {
      issuePayload.projectId = board.projectId;
    }

    const issueResponse = await linearClient.createIssue(issuePayload);
    const issue = await issueResponse.issue;
    
    if (!issue) {
       return { success: false, error: "Failed to create issue in Linear." };
    }

    return { success: true, data: { issueId: issue.id } };

  } catch (error: any) {
    console.error("Create Ticket Error:", error);
    return { success: false, error: error.message };
  }
}
