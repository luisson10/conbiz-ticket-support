"use server";

import { linearClient } from "@/lib/linear";
import prisma from "@/lib/prisma";
import { requireAdmin, requireAuth } from "@/lib/auth";
import { actionError, type ActionResult } from "@/lib/contracts/action-result";
import type {
  ActivityItemDto,
  BoardDto,
  IssueDetailsDto,
  TicketDto,
  WorkflowStateDto,
} from "@/lib/contracts/portal";

type WorkflowStateSnapshot = {
  id: string;
  name: string;
  type: string;
  color: string;
};

type IssueSnapshot = {
  id: string;
  identifier: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  url?: string | null;
  priority?: number | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  state?: {
    id: string;
    name: string;
    type: string;
    color: string;
  } | null;
  assignee?: {
    name?: string | null;
  } | null;
  project?: {
    name?: string | null;
  } | null;
};

type IssuePage = {
  nodes: IssueSnapshot[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
};

type ActivityIssueSnapshot = {
  id: string;
  identifier: string;
  title: string;
  updatedAt?: string | null;
  comments: {
    nodes: Array<{
      id: string;
      body?: string | null;
      createdAt: string;
    }>;
  };
};

type ActivityIssuePage = {
  nodes: ActivityIssueSnapshot[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
};

const workflowStateCache = new Map<
  string,
  { expiresAt: number; states: WorkflowStateSnapshot[] }
>();

const BOARD_ISSUES_QUERY = `
  query BoardIssues($teamId: ID!, $first: Int!, $after: String) {
    issues(first: $first, after: $after, filter: { team: { id: { eq: $teamId } } }) {
      nodes {
        id
        identifier
        title
        description
        dueDate
        url
        priority
        updatedAt
        createdAt
        state { id name type color }
        assignee { name }
        project { name }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const PROJECT_BOARD_ISSUES_QUERY = `
  query ProjectBoardIssues($teamId: ID!, $projectId: ID!, $first: Int!, $after: String) {
    issues(
      first: $first
      after: $after
      filter: {
        team: { id: { eq: $teamId } }
        project: { id: { eq: $projectId } }
      }
    ) {
      nodes {
        id
        identifier
        title
        description
        dueDate
        url
        priority
        updatedAt
        createdAt
        state { id name type color }
        assignee { name }
        project { name }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const BOARD_ACTIVITY_QUERY = `
  query BoardActivity($teamId: ID!, $first: Int!, $after: String) {
    issues(first: $first, after: $after, filter: { team: { id: { eq: $teamId } } }) {
      nodes {
        id
        identifier
        title
        updatedAt
        comments(first: 15) {
          nodes {
            id
            body
            createdAt
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const PROJECT_BOARD_ACTIVITY_QUERY = `
  query ProjectBoardActivity($teamId: ID!, $projectId: ID!, $first: Int!, $after: String) {
    issues(
      first: $first
      after: $after
      filter: {
        team: { id: { eq: $teamId } }
        project: { id: { eq: $projectId } }
      }
    ) {
      nodes {
        id
        identifier
        title
        updatedAt
        comments(first: 15) {
          nodes {
            id
            body
            createdAt
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

function toBoardDto(board: {
  id: string;
  name: string;
  type: "SUPPORT" | "PROJECT";
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

async function getWorkflowStatesCached(teamId: string): Promise<WorkflowStateDto[]> {
  const now = Date.now();
  const cached = workflowStateCache.get(teamId);
  if (cached && cached.expiresAt > now) {
    return cached.states;
  }

  const states = await linearClient.workflowStates({
    filter: { team: { id: { eq: teamId } } },
  });

  const mapped: WorkflowStateDto[] = states.nodes.map((state) => ({
    id: state.id,
    name: state.name,
    type: state.type,
    color: state.color,
  }));

  workflowStateCache.set(teamId, {
    expiresAt: now + 60_000,
    states: mapped,
  });

  return mapped;
}

async function getIssueSnapshotsPage(
  board: { teamId: string; projectId?: string | null },
  options: { first: number; after?: string | null }
): Promise<IssuePage> {
  const query = board.projectId ? PROJECT_BOARD_ISSUES_QUERY : BOARD_ISSUES_QUERY;
  const variables = board.projectId
    ? {
        teamId: board.teamId,
        projectId: board.projectId,
        first: options.first,
        after: options.after ?? null,
      }
    : {
        teamId: board.teamId,
        first: options.first,
        after: options.after ?? null,
      };

  const raw = (await linearClient.client.rawRequest(query, variables)) as {
    data?: { issues?: IssuePage };
  };

  return (
    raw.data?.issues ?? {
      nodes: [],
      pageInfo: {
        hasNextPage: false,
        endCursor: null,
      },
    }
  );
}

function canAccessBoard(auth: { role: "ADMIN" | "VIEWER"; boardIds: string[] }, boardId: string): boolean {
  if (auth.role === "ADMIN") return true;
  return auth.boardIds.includes(boardId);
}

export async function getBoardTickets(
  boardId: string,
  options?: { first?: number; after?: string | null }
): Promise<
  ActionResult<{
    board: BoardDto;
    tickets: TicketDto[];
    states: WorkflowStateDto[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  }>
> {
  try {
    const auth = await requireAuth();
    if (!canAccessBoard(auth, boardId)) {
      return { success: false, error: "Forbidden" };
    }

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { account: true },
    });

    if (!board) {
      return { success: false, error: "Board not found." };
    }

    const first = Math.min(Math.max(options?.first ?? 100, 1), 250);
    const page = await getIssueSnapshotsPage(board, {
      first,
      after: options?.after ?? null,
    });

    const states = await getWorkflowStatesCached(board.teamId);

    const tickets: TicketDto[] = page.nodes.map((issue) => ({
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description,
      dueDate: issue.dueDate,
      url: issue.url,
      priority: issue.priority,
      updatedAt: issue.updatedAt,
      state: issue.state?.name || "Unknown",
      stateId: issue.state?.id || null,
      stateType: issue.state?.type || null,
      stateColor: issue.state?.color || "#cbd5f5",
      assigneeName: issue.assignee?.name || "Unassigned",
      projectName: issue.project?.name || null,
      createdAt: issue.createdAt,
    }));

    return {
      success: true,
      data: {
        board: toBoardDto(board),
        tickets,
        states,
        pageInfo: page.pageInfo,
      },
    };
  } catch (error: unknown) {
    return actionError(error, "Failed to load tickets.");
  }
}

async function getActivityPage(
  board: { teamId: string; projectId?: string | null },
  options: { first: number; after?: string | null }
): Promise<ActivityIssuePage> {
  const query = board.projectId ? PROJECT_BOARD_ACTIVITY_QUERY : BOARD_ACTIVITY_QUERY;
  const variables = board.projectId
    ? {
        teamId: board.teamId,
        projectId: board.projectId,
        first: options.first,
        after: options.after ?? null,
      }
    : {
        teamId: board.teamId,
        first: options.first,
        after: options.after ?? null,
      };

  const raw = (await linearClient.client.rawRequest(query, variables)) as {
    data?: { issues?: ActivityIssuePage };
  };
  return (
    raw.data?.issues ?? {
      nodes: [],
      pageInfo: {
        hasNextPage: false,
        endCursor: null,
      },
    }
  );
}

export async function getRecentActivity(
  boardId: string,
  options?: { limit?: number; since?: string | null; after?: string | null }
): Promise<ActionResult<ActivityItemDto[]>> {
  try {
    const auth = await requireAuth();
    if (!canAccessBoard(auth, boardId)) {
      return { success: false, error: "Forbidden" };
    }

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { account: true },
    });

    if (!board) {
      return { success: false, error: "Board not found." };
    }

    const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100);
    const page = await getActivityPage(board, {
      first: Math.max(limit, 30),
      after: options?.after ?? null,
    });

    const sinceDate = options?.since ? new Date(options.since) : null;

    const activity: ActivityItemDto[] = [];

    page.nodes.forEach((issue) => {
      if (issue.updatedAt) {
        const updatedAtDate = new Date(issue.updatedAt);
        if (!sinceDate || updatedAtDate > sinceDate) {
          activity.push({
            id: `${issue.id}-update-${issue.updatedAt}`,
            type: "update",
            issueId: issue.id,
            issueTitle: issue.title,
            issueIdentifier: issue.identifier,
            createdAt: issue.updatedAt,
          });
        }
      }

      issue.comments.nodes
        .filter((comment) => typeof comment.body === "string" && comment.body.includes("#sync"))
        .forEach((comment) => {
          const commentDate = new Date(comment.createdAt);
          if (sinceDate && commentDate <= sinceDate) {
            return;
          }

          activity.push({
            id: comment.id,
            type: "comment",
            issueId: issue.id,
            issueTitle: issue.title,
            issueIdentifier: issue.identifier,
            createdAt: comment.createdAt,
            body: comment.body?.replace(/#sync\s*/gi, "").trim() || "",
          });
        });
    });

    activity.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return { success: true, data: activity.slice(0, limit) };
  } catch (error: unknown) {
    return actionError(error, "Failed to load activity.");
  }
}

type IssueAttachment = {
  id: string;
  title?: string | null;
  url: string;
  createdAt: string;
};

type IssueWithAttachments = {
  attachments: () => Promise<{ nodes: IssueAttachment[] }>;
};

function hasAttachments(issue: unknown): issue is IssueWithAttachments {
  return Boolean(
    issue &&
      typeof issue === "object" &&
      "attachments" in issue &&
      typeof (issue as { attachments?: unknown }).attachments === "function"
  );
}

export async function getIssueDetails(issueId: string): Promise<ActionResult<IssueDetailsDto>> {
  try {
    await requireAuth();

    const issue = await linearClient.issue(issueId);
    if (!issue) return { success: false, error: "Issue not found." };

    const attachmentsPromise = hasAttachments(issue)
      ? issue.attachments()
      : Promise.resolve<{ nodes: IssueAttachment[] }>({ nodes: [] });

    const [comments, attachments, state, assignee, project] = await Promise.all([
      issue.comments(),
      attachmentsPromise,
      issue.state,
      issue.assignee,
      issue.project,
    ]);

    const syncedComments = await Promise.all(
      (comments?.nodes || [])
        .filter((comment) => typeof comment.body === "string" && comment.body.includes("#sync"))
        .map(async (comment) => {
          const user = await comment.user;
          return {
            id: comment.id,
            body: comment.body.replace(/#sync\s*/gi, "").trim(),
            createdAt: new Date(comment.createdAt).toISOString(),
            userName: user?.name || "Unknown",
          };
        })
    );

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
        stateType: state?.type || null,
        stateColor: state?.color || "#cbd5f5",
        assigneeName: assignee?.name || "Unassigned",
        projectName: project?.name || null,
        comments: syncedComments,
        attachments: attachments.nodes.map((attachment) => ({
          id: attachment.id,
          title: attachment.title,
          url: attachment.url,
          createdAt: new Date(attachment.createdAt).toISOString(),
        })),
      },
    };
  } catch (error: unknown) {
    return actionError(error, "Failed to load issue details.");
  }
}

export async function createIssueComment(
  issueId: string,
  body: string
): Promise<ActionResult<{ id: string; body: string; createdAt: string; userName: string }>> {
  try {
    await requireAdmin();

    const trimmed = body.trim();
    if (!trimmed) {
      return { success: false, error: "Comment cannot be empty." };
    }

    const issue = await linearClient.issue(issueId);
    if (!issue) {
      return { success: false, error: "Issue not found." };
    }

    const state = await issue.state;
    const stateType = state?.type?.toLowerCase();
    if (stateType === "canceled" || stateType === "completed") {
      return {
        success: false,
        error: "Comments are disabled for closed or canceled tickets.",
      };
    }

    const response = await linearClient.createComment({
      issueId,
      body: `#sync\n${trimmed}`,
    });

    const comment = await response.comment;

    if (!comment) {
      return { success: false, error: "Failed to create comment." };
    }

    const user = await comment.user;

    return {
      success: true,
      data: {
        id: comment.id,
        body: trimmed,
        createdAt: new Date(comment.createdAt).toISOString(),
        userName: user?.name || "You",
      },
    };
  } catch (error: unknown) {
    return actionError(error, "Failed to create comment.");
  }
}
