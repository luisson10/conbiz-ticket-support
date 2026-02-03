"use server";

import { linearClient } from "@/lib/linear";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function getBoardTickets(boardId: string) {
  try {
    requireAuth();

    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      return { success: false, error: "Board not found." };
    }

    const filter: any = {
      team: { id: { eq: board.teamId } },
    };

    if (board.projectId) {
      filter.project = { id: { eq: board.projectId } };
    }

    const [issues, states] = await Promise.all([
      linearClient.issues({ filter, first: 100 }),
      linearClient.workflowStates({
        filter: { team: { id: { eq: board.teamId } } },
      }),
    ]);

    const tickets = await Promise.all(
      issues.nodes.map(async (issue) => {
        const [state, assignee, project] = await Promise.all([
          issue.state,
          issue.assignee,
          issue.project,
        ]);

        return {
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          description: issue.description,
          dueDate: issue.dueDate,
          url: issue.url,
          priority: issue.priority,
          updatedAt: issue.updatedAt,
          state: state?.name || "Unknown",
          stateId: state?.id || null,
          stateType: state?.type || null,
          stateColor: state?.color || "#cbd5f5",
          assigneeName: assignee?.name || "Unassigned",
          projectName: project?.name || null,
          createdAt: issue.createdAt,
        };
      })
    );

    return {
      success: true,
      data: {
        board,
        tickets,
        states: states.nodes.map((s) => ({
          id: s.id,
          name: s.name,
          type: s.type,
          color: s.color,
        })),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getRecentActivity(boardId: string) {
  try {
    requireAuth();

    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      return { success: false, error: "Board not found." };
    }

    const filter: any = {
      team: { id: { eq: board.teamId } },
    };

    if (board.projectId) {
      filter.project = { id: { eq: board.projectId } };
    }

    const issues = await linearClient.issues({ filter, first: 50 });

    const activity: Array<{
      id: string;
      type: "comment" | "update";
      issueId: string;
      issueTitle: string;
      issueIdentifier: string;
      createdAt: string;
      body?: string;
    }> = [];

    for (const issue of issues.nodes) {
      if (issue.updatedAt) {
        activity.push({
          id: `${issue.id}-update`,
          type: "update",
          issueId: issue.id,
          issueTitle: issue.title,
          issueIdentifier: issue.identifier,
          createdAt: issue.updatedAt,
        });
      }

      const comments = await issue.comments();
      comments.nodes
        .filter((c) => typeof c.body === "string" && c.body.includes("#sync"))
        .forEach((c) => {
          activity.push({
            id: c.id,
            type: "comment",
            issueId: issue.id,
            issueTitle: issue.title,
            issueIdentifier: issue.identifier,
            createdAt: c.createdAt,
            body: c.body.replace(/#sync\s*/gi, "").trim(),
          });
        });
    }

    activity.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return { success: true, data: activity.slice(0, 20) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getIssueDetails(issueId: string) {
  try {
    requireAuth();

    const issue = await linearClient.issue(issueId);
    if (!issue) return { success: false, error: "Issue not found." };

    const attachmentsPromise =
      "attachments" in issue ? (issue as any).attachments() : Promise.resolve(null);

    const [comments, attachments, state, assignee, project] = await Promise.all([
      issue.comments(),
      attachmentsPromise,
      issue.state,
      issue.assignee,
      issue.project,
    ]);

    const syncedComments =
      comments?.nodes
        ?.filter((c) => typeof c.body === "string" && c.body.includes("#sync"))
        .map((c) => ({
          id: c.id,
          body: c.body.replace(/#sync\s*/gi, "").trim(),
          createdAt: c.createdAt,
          userName: c.user?.name || "Unknown",
        })) || [];

    return {
      success: true,
      data: {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description,
        url: issue.url,
        dueDate: issue.dueDate,
        priority: issue.priority,
        state: state?.name || "Unknown",
        stateColor: state?.color || "#cbd5f5",
        assigneeName: assignee?.name || "Unassigned",
        projectName: project?.name || null,
        comments: syncedComments,
        attachments: attachments?.nodes?.map((a) => ({
          id: a.id,
          title: a.title,
          url: a.url,
          createdAt: a.createdAt,
        })) || [],
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createIssueComment(issueId: string, body: string) {
  try {
    requireAuth();

    const trimmed = body.trim();
    if (!trimmed) {
      return { success: false, error: "Comment cannot be empty." };
    }

    const payload = {
      issueId,
      body: `#sync\n${trimmed}`,
    };

    const response = await linearClient.createComment(payload);
    const comment = await response.comment;

    if (!comment) {
      return { success: false, error: "Failed to create comment." };
    }

    return {
      success: true,
      data: {
        id: comment.id,
        body: trimmed,
        createdAt: comment.createdAt,
        userName: comment.user?.name || "You",
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
