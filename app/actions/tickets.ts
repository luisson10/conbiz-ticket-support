"use server";

import { linearClient } from "@/lib/linear";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { actionError, type ActionResult } from "@/lib/contracts/action-result";

type CreateTicketInput = {
  boardId: string;
  title: string;
  description: string;
  category?: string | null;
  dueDate?: string;
  attachments?: Array<{
    assetUrl: string;
    filename: string;
    contentType: string;
    size: number;
  }>;
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

    const normalizedCategory = data.category?.trim();

    let labelId: string | undefined;
    if (normalizedCategory) {
      const existingLabels = await linearClient.issueLabels({
        first: 250,
        filter: { team: { id: { eq: board.teamId } } },
      });

      const existing = existingLabels.nodes.find(
        (label) => label.name.trim().toLowerCase() === normalizedCategory.toLowerCase()
      );

      if (existing) {
        labelId = existing.id;
      } else {
        const labelResponse = await linearClient.createIssueLabel({
          name: normalizedCategory,
          teamId: board.teamId,
        });
        const createdLabel = await labelResponse.issueLabel;
        labelId = createdLabel?.id;
      }
    }

    const markdownAttachments = (data.attachments || [])
      .filter((attachment) => attachment.assetUrl)
      .map((attachment) => {
        const name = attachment.filename || "Adjunto";
        if (attachment.contentType.startsWith("image/")) {
          return `![${name}](${attachment.assetUrl})`;
        }
        return `- [${name}](${attachment.assetUrl})`;
      });

    const description = [data.description.trim()];
    if (markdownAttachments.length > 0) {
      description.push("", "### Archivos adjuntos", ...markdownAttachments);
    }

    const issuePayload: {
      teamId: string;
      title: string;
      description: string;
      dueDate?: string;
      projectId?: string;
      labelIds?: string[];
    } = {
      teamId: board.teamId,
      title: data.title,
      description: description.join("\n"),
      dueDate: data.dueDate,
      labelIds: labelId ? [labelId] : undefined,
    };

    if (board.projectId) {
      issuePayload.projectId = board.projectId;
    }

    const issueResponse = await linearClient.createIssue(issuePayload);
    const issue = await issueResponse.issue;

    if (!issue) {
      return { success: false, error: "Failed to create issue in Linear." };
    }

    if (data.attachments && data.attachments.length > 0) {
      await Promise.all(
        data.attachments
          .filter((attachment) => attachment.assetUrl)
          .map((attachment) =>
            linearClient.attachmentLinkURL(issue.id, attachment.assetUrl, {
              title: attachment.filename || "Archivo",
            })
          )
      );
    }

    return { success: true, data: { issueId: issue.id } };
  } catch (error: unknown) {
    return actionError(error, "Failed to create ticket.");
  }
}
