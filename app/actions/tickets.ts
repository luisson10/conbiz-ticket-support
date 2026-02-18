"use server";

import { linearClient } from "@/lib/linear";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { actionError, type ActionResult } from "@/lib/contracts/action-result";

type CreateTicketInput = {
  boardId: string;
  title: string;
  description: string;
  priority?: number;
  dueDate?: string;
};

type CreateTicketResult = { issueId: string };

export async function createTicket(
  data: CreateTicketInput
): Promise<ActionResult<CreateTicketResult>> {
  try {
    await requireAdmin();

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

    const issuePayload: {
      teamId: string;
      title: string;
      description: string;
      priority?: number;
      dueDate?: string;
      projectId?: string;
    } = {
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
  } catch (error: unknown) {
    return actionError(error, "Failed to create ticket.");
  }
}
