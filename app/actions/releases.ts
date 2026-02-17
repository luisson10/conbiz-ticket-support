"use server";

import prisma from "@/lib/prisma";
import { linearClient } from "@/lib/linear";
import { requireAdmin, requireAuth } from "@/lib/auth";
import { actionError, type ActionResult } from "@/lib/contracts/action-result";
import type {
  ReleaseCandidateTicketDto,
  ReleaseDetailsDto,
  ReleaseItemDto,
  ReleaseTagDto,
  ReleaseTimelineItemDto,
} from "@/lib/contracts/releases";
import { buildReleaseTimelineWhere, canViewRelease, slugifyTagName, type ReleaseStatusFilter } from "./releases-utils";
import type { BoardType } from "@/lib/contracts/portal";

const RELEASE_ISSUES_QUERY = `
  query ReleaseIssues($teamId: ID!) {
    issues(
      first: 200
      filter: {
        team: { id: { eq: $teamId } }
      }
    ) {
      nodes {
        id
        identifier
        title
        priority
        state {
          name
          type
        }
      }
    }
  }
`;

const RELEASE_PROJECT_ISSUES_QUERY = `
  query ReleaseProjectIssues($teamId: ID!, $projectId: ID!) {
    issues(
      first: 200
      filter: {
        team: { id: { eq: $teamId } }
        project: { id: { eq: $projectId } }
      }
    ) {
      nodes {
        id
        identifier
        title
        priority
        state {
          name
          type
        }
      }
    }
  }
`;

type IssueSnapshot = {
  id: string;
  identifier: string;
  title: string;
  priority?: number | null;
  state?: {
    name: string;
    type: string;
  } | null;
};

type ReleaseListParams = {
  accountId: string;
  cursor?: string;
  limit?: number;
  status?: ReleaseStatusFilter;
};

type DraftInput = {
  title: string;
  description: string;
  accountIds: string[];
  tagIds?: string[];
};

type UpdateReleaseInput = {
  releaseId: string;
  title: string;
  description: string;
  accountIds: string[];
  tagIds?: string[];
};

function assertReleasePrismaModels() {
  const client = prisma as unknown as Record<string, unknown>;
  const requiredModels = ["release", "releaseTag", "releaseItem", "releaseAccount"];
  const missing = requiredModels.filter((name) => {
    const model = client[name] as { findMany?: unknown } | undefined;
    return !model || typeof model.findMany !== "function";
  });

  if (missing.length > 0) {
    throw new Error(
      `Prisma client is out of date (missing: ${missing.join(
        ", "
      )}). Run: npx prisma migrate dev && npx prisma generate, then restart dev server.`
    );
  }
}

async function ensureCreatorUser(input: {
  userId: string;
  role: "ADMIN" | "USER";
  email?: string;
}) {
  const email = input.email?.trim().toLowerCase() || `${input.userId}@local.conbiz`;
  await prisma.user.upsert({
    where: { id: input.userId },
    update: {
      email,
      role: input.role,
    },
    create: {
      id: input.userId,
      email,
      name: email.split("@")[0] || "User",
      role: input.role,
    },
  });
}

function toTagDto(tag: { id: string; name: string; slug: string }): ReleaseTagDto {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
  };
}

function toItemDto(item: {
  id: string;
  releaseId: string;
  issueId: string;
  issueIdentifier: string;
  title: string;
  stateName: string;
  stateType: string | null;
  priority: number | null;
  boardType: BoardType;
  accountId: string;
  createdAt: Date;
}): ReleaseItemDto {
  return {
    id: item.id,
    releaseId: item.releaseId,
    issueId: item.issueId,
    issueIdentifier: item.issueIdentifier,
    title: item.title,
    stateName: item.stateName,
    stateType: item.stateType,
    priority: item.priority,
    boardType: item.boardType,
    accountId: item.accountId,
    createdAt: item.createdAt.toISOString(),
  };
}

function toTimelineDto(release: {
  id: string;
  title: string;
  description: string;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  accounts: Array<{ account: { id: string; name: string } }>;
  tagAssignments: Array<{ tag: { id: string; name: string; slug: string } }>;
  _count?: { items: number };
}): ReleaseTimelineItemDto {
  return {
    id: release.id,
    title: release.title,
    description: release.description,
    status: release.status,
    publishedAt: release.publishedAt?.toISOString() || null,
    createdAt: release.createdAt.toISOString(),
    updatedAt: release.updatedAt.toISOString(),
    accounts: release.accounts.map((entry) => entry.account),
    tags: release.tagAssignments.map((entry) => toTagDto(entry.tag)),
    itemCount: release._count?.items || 0,
  };
}

async function ensureAccountsExist(accountIds: string[]) {
  const unique = [...new Set(accountIds.filter(Boolean))];
  if (unique.length === 0) {
    throw new Error("At least one account must be selected.");
  }

  const accounts = await prisma.account.findMany({
    where: { id: { in: unique } },
    select: { id: true },
  });

  if (accounts.length !== unique.length) {
    throw new Error("One or more selected accounts do not exist.");
  }

  return unique;
}

async function getBoardIssueSnapshots(board: {
  teamId: string;
  projectId: string | null;
}): Promise<IssueSnapshot[]> {
  const query = board.projectId ? RELEASE_PROJECT_ISSUES_QUERY : RELEASE_ISSUES_QUERY;
  const variables = board.projectId
    ? { teamId: board.teamId, projectId: board.projectId }
    : { teamId: board.teamId };
  const raw = (await linearClient.client.rawRequest(query, variables)) as {
    data?: { issues?: { nodes?: IssueSnapshot[] } };
  };

  return raw.data?.issues?.nodes || [];
}

export async function getReleaseTags(): Promise<ActionResult<ReleaseTagDto[]>> {
  try {
    await requireAuth();
    assertReleasePrismaModels();

    const tags = await prisma.releaseTag.findMany({
      orderBy: { name: "asc" },
    });

    return { success: true, data: tags.map(toTagDto) };
  } catch (error: unknown) {
    return actionError(error, "Failed to load release tags.");
  }
}

export async function getReleaseTimeline(
  params: ReleaseListParams
): Promise<ActionResult<{ items: ReleaseTimelineItemDto[]; nextCursor: string | null }>> {
  try {
    const auth = await requireAuth();
    assertReleasePrismaModels();
    if (!params.accountId) {
      return { success: true, data: { items: [], nextCursor: null } };
    }
    const limit = Math.min(Math.max(params.limit ?? 12, 1), 50);

    const where = buildReleaseTimelineWhere({
      isAdmin: auth.role === "ADMIN",
      selectedAccountId: params.accountId,
      status: params.status,
      cursorDate: params.cursor ?? null,
    });

    const releases = await prisma.release.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: limit + 1,
      include: {
        accounts: { include: { account: true } },
        tagAssignments: { include: { tag: true } },
        _count: { select: { items: true } },
      },
    });

    const hasNext = releases.length > limit;
    const selected = hasNext ? releases.slice(0, limit) : releases;

    const items = selected
      .filter((release) =>
        canViewRelease({
          isAdmin: auth.role === "ADMIN",
          releaseStatus: release.status,
          accountIds: release.accounts.map((scope) => scope.accountId),
          selectedAccountId: params.accountId,
        })
      )
      .map(toTimelineDto);

    const last = selected[selected.length - 1];
    const nextCursor = hasNext
      ? (last.publishedAt?.toISOString() || last.createdAt.toISOString())
      : null;

    return {
      success: true,
      data: {
        items,
        nextCursor,
      },
    };
  } catch (error: unknown) {
    return actionError(error, "Failed to load releases timeline.");
  }
}

export async function getReleaseDetails(
  releaseId: string,
  accountId: string
): Promise<ActionResult<ReleaseDetailsDto>> {
  try {
    const auth = await requireAuth();
    assertReleasePrismaModels();
    if (!accountId) {
      return { success: false, error: "Account is required." };
    }

    const release = await prisma.release.findUnique({
      where: { id: releaseId },
      include: {
        accounts: { include: { account: true } },
        tagAssignments: { include: { tag: true } },
        items: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!release) {
      return { success: false, error: "Release not found." };
    }

    const canView = canViewRelease({
      isAdmin: auth.role === "ADMIN",
      releaseStatus: release.status,
      accountIds: release.accounts.map((scope) => scope.accountId),
      selectedAccountId: accountId,
    });

    if (!canView) {
      return { success: false, error: "Forbidden." };
    }

    const timeline = toTimelineDto(release);
    return {
      success: true,
      data: {
        ...timeline,
        items: release.items.map(toItemDto),
      },
    };
  } catch (error: unknown) {
    return actionError(error, "Failed to load release details.");
  }
}

export async function createReleaseDraft(
  input: DraftInput
): Promise<ActionResult<ReleaseTimelineItemDto>> {
  try {
    const auth = await requireAdmin();
    assertReleasePrismaModels();
    const title = input.title.trim();
    if (!title) {
      return { success: false, error: "Title is required." };
    }

    const accountIds = await ensureAccountsExist(input.accountIds);
    await ensureCreatorUser(auth);

    const release = await prisma.release.create({
      data: {
        title,
        description: input.description?.trim() || "",
        status: "DRAFT",
        createdByUserId: auth.userId,
        accounts: {
          create: accountIds.map((accountId) => ({ accountId })),
        },
        tagAssignments: {
          create:
            input.tagIds?.map((tagId) => ({
              tagId,
            })) || [],
        },
      },
      include: {
        accounts: { include: { account: true } },
        tagAssignments: { include: { tag: true } },
        _count: { select: { items: true } },
      },
    });

    return { success: true, data: toTimelineDto(release) };
  } catch (error: unknown) {
    return actionError(error, "Failed to create draft release.");
  }
}

export async function updateRelease(
  input: UpdateReleaseInput
): Promise<ActionResult<ReleaseTimelineItemDto>> {
  try {
    await requireAdmin();
    assertReleasePrismaModels();
    const title = input.title.trim();
    if (!title) {
      return { success: false, error: "Title is required." };
    }

    const release = await prisma.release.findUnique({
      where: { id: input.releaseId },
      select: { id: true, status: true },
    });

    if (!release) {
      return { success: false, error: "Release not found." };
    }

    const accountIds = await ensureAccountsExist(input.accountIds);

    const updated = await prisma.release.update({
      where: { id: input.releaseId },
      data: {
        title,
        description: input.description?.trim() || "",
        accounts: {
          deleteMany: {},
          create: accountIds.map((accountId) => ({ accountId })),
        },
        tagAssignments: {
          deleteMany: {},
          create:
            input.tagIds?.map((tagId) => ({
              tagId,
            })) || [],
        },
      },
      include: {
        accounts: { include: { account: true } },
        tagAssignments: { include: { tag: true } },
        _count: { select: { items: true } },
      },
    });

    return { success: true, data: toTimelineDto(updated) };
  } catch (error: unknown) {
    return actionError(error, "Failed to update release.");
  }
}

export async function publishRelease(input: {
  releaseId: string;
  publishedAt?: string;
}): Promise<ActionResult<ReleaseTimelineItemDto>> {
  try {
    await requireAdmin();
    assertReleasePrismaModels();

    const release = await prisma.release.update({
      where: { id: input.releaseId },
      data: {
        status: "PUBLISHED",
        publishedAt: input.publishedAt ? new Date(input.publishedAt) : new Date(),
      },
      include: {
        accounts: { include: { account: true } },
        tagAssignments: { include: { tag: true } },
        _count: { select: { items: true } },
      },
    });

    return { success: true, data: toTimelineDto(release) };
  } catch (error: unknown) {
    return actionError(error, "Failed to publish release.");
  }
}

export async function deleteReleaseDraft(
  releaseId: string
): Promise<ActionResult<{ releaseId: string }>> {
  try {
    await requireAdmin();
    assertReleasePrismaModels();

    const existing = await prisma.release.findUnique({
      where: { id: releaseId },
      select: { status: true },
    });

    if (!existing) {
      return { success: false, error: "Release not found." };
    }

    if (existing.status !== "DRAFT") {
      return { success: false, error: "Only draft releases can be deleted." };
    }

    await prisma.release.delete({ where: { id: releaseId } });
    return { success: true, data: { releaseId } };
  } catch (error: unknown) {
    return actionError(error, "Failed to delete draft release.");
  }
}

export async function deleteRelease(
  releaseId: string
): Promise<ActionResult<{ releaseId: string }>> {
  try {
    await requireAdmin();
    assertReleasePrismaModels();

    const existing = await prisma.release.findUnique({
      where: { id: releaseId },
      select: { id: true },
    });

    if (!existing) {
      return { success: false, error: "Release not found." };
    }

    await prisma.release.delete({ where: { id: releaseId } });
    return { success: true, data: { releaseId } };
  } catch (error: unknown) {
    return actionError(error, "Failed to delete release.");
  }
}

export async function upsertReleaseTag(input: {
  name: string;
}): Promise<ActionResult<ReleaseTagDto>> {
  try {
    await requireAdmin();
    assertReleasePrismaModels();
    const name = input.name.trim();
    if (!name) {
      return { success: false, error: "Tag name is required." };
    }

    const slug = slugifyTagName(name);
    if (!slug) {
      return { success: false, error: "Invalid tag name." };
    }

    const tag = await prisma.releaseTag.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });

    return { success: true, data: toTagDto(tag) };
  } catch (error: unknown) {
    return actionError(error, "Failed to upsert release tag.");
  }
}

export async function deleteReleaseTag(
  tagId: string
): Promise<ActionResult<{ tagId: string }>> {
  try {
    await requireAdmin();
    assertReleasePrismaModels();

    const linked = await prisma.releaseTagAssignment.count({
      where: { tagId },
    });

    if (linked > 0) {
      return { success: false, error: "Tag is in use by one or more releases." };
    }

    await prisma.releaseTag.delete({ where: { id: tagId } });
    return { success: true, data: { tagId } };
  } catch (error: unknown) {
    return actionError(error, "Failed to delete release tag.");
  }
}

export async function getReleaseCandidateTickets(params: {
  accountId: string;
}): Promise<ActionResult<ReleaseCandidateTicketDto[]>> {
  try {
    await requireAdmin();
    assertReleasePrismaModels();
    if (!params.accountId) {
      return { success: false, error: "Account is required." };
    }

    const boards = await prisma.board.findMany({
      where: {
        accountId: params.accountId,
      },
      select: {
        teamId: true,
        projectId: true,
        type: true,
        accountId: true,
      },
    });

    const candidates = new Map<string, ReleaseCandidateTicketDto>();

    await Promise.all(
      boards.map(async (board) => {
        const issues = await getBoardIssueSnapshots(board);
        issues.forEach((issue) => {
          if (!candidates.has(issue.id)) {
            candidates.set(issue.id, {
              issueId: issue.id,
              identifier: issue.identifier,
              title: issue.title,
              stateName: issue.state?.name || "Unknown",
              stateType: issue.state?.type || null,
              priority: issue.priority ?? null,
              boardType: board.type,
              accountId: board.accountId,
            });
          }
        });
      })
    );

    return {
      success: true,
      data: [...candidates.values()].sort((a, b) => a.identifier.localeCompare(b.identifier)),
    };
  } catch (error: unknown) {
    return actionError(error, "Failed to load release candidate tickets.");
  }
}

export async function attachReleaseItems(input: {
  releaseId: string;
  issueIds: string[];
  accountIds: string[];
}): Promise<ActionResult<{ attached: number }>> {
  try {
    await requireAdmin();
    assertReleasePrismaModels();

    const issueIds = [...new Set(input.issueIds.filter(Boolean))];
    const accountIds = await ensureAccountsExist(input.accountIds);

    if (issueIds.length === 0) {
      return { success: false, error: "At least one issue must be selected." };
    }

    const boards = await prisma.board.findMany({
      where: {
        accountId: { in: accountIds },
      },
      select: {
        teamId: true,
        projectId: true,
        type: true,
        accountId: true,
      },
    });

    const snapshotMap = new Map<
      string,
      {
        issueIdentifier: string;
        title: string;
        stateName: string;
        stateType: string | null;
        priority: number | null;
        boardType: BoardType;
        accountId: string;
      }
    >();

    await Promise.all(
      boards.map(async (board) => {
        const issues = await getBoardIssueSnapshots(board);
        issues.forEach((issue) => {
          if (issueIds.includes(issue.id) && !snapshotMap.has(issue.id)) {
            snapshotMap.set(issue.id, {
              issueIdentifier: issue.identifier,
              title: issue.title,
              stateName: issue.state?.name || "Unknown",
              stateType: issue.state?.type || null,
              priority: issue.priority ?? null,
              boardType: board.type,
              accountId: board.accountId,
            });
          }
        });
      })
    );

    const rows = issueIds
      .map((issueId) => {
        const snapshot = snapshotMap.get(issueId);
        if (!snapshot) return null;
        return {
          releaseId: input.releaseId,
          issueId,
          issueIdentifier: snapshot.issueIdentifier,
          title: snapshot.title,
          stateName: snapshot.stateName,
          stateType: snapshot.stateType,
          priority: snapshot.priority,
          boardType: snapshot.boardType,
          accountId: snapshot.accountId,
        };
      })
      .filter(Boolean) as Array<{
      releaseId: string;
      issueId: string;
      issueIdentifier: string;
      title: string;
      stateName: string;
      stateType: string | null;
      priority: number | null;
      boardType: BoardType;
      accountId: string;
    }>;

    if (rows.length === 0) {
      return { success: false, error: "No matching issues found for selected accounts." };
    }

    let attached = 0;
    for (const row of rows) {
      const existing = await prisma.releaseItem.findUnique({
        where: {
          releaseId_issueId: {
            releaseId: row.releaseId,
            issueId: row.issueId,
          },
        },
        select: { id: true },
      });
      if (existing) continue;
      await prisma.releaseItem.create({ data: row });
      attached += 1;
    }

    return {
      success: true,
      data: { attached },
    };
  } catch (error: unknown) {
    return actionError(error, "Failed to attach release items.");
  }
}

export async function detachReleaseItem(input: {
  releaseId: string;
  issueId: string;
}): Promise<ActionResult<{ issueId: string }>> {
  try {
    await requireAdmin();
    assertReleasePrismaModels();

    await prisma.releaseItem.delete({
      where: {
        releaseId_issueId: {
          releaseId: input.releaseId,
          issueId: input.issueId,
        },
      },
    });

    return {
      success: true,
      data: { issueId: input.issueId },
    };
  } catch (error: unknown) {
    return actionError(error, "Failed to detach release item.");
  }
}
