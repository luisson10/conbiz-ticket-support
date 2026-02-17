import type { Prisma } from "@prisma/client";

export type ReleaseStatusFilter = "ALL" | "DRAFT" | "PUBLISHED";

export function canViewRelease(params: {
  isAdmin: boolean;
  releaseStatus: "DRAFT" | "PUBLISHED";
  accountIds: string[];
  selectedAccountId: string | null;
}): boolean {
  if (params.isAdmin) return true;
  if (params.releaseStatus !== "PUBLISHED") return false;
  if (!params.selectedAccountId) return false;
  return params.accountIds.includes(params.selectedAccountId);
}

export function buildReleaseTimelineWhere(params: {
  isAdmin: boolean;
  selectedAccountId: string | null;
  status?: ReleaseStatusFilter;
  cursorDate?: string | null;
}): Prisma.ReleaseWhereInput {
  const where: Prisma.ReleaseWhereInput = {};
  if (!params.isAdmin) {
    if (!params.selectedAccountId) {
      return { id: "__no_release__" };
    }
    where.status = "PUBLISHED";
    where.accounts = {
      some: {
        accountId: params.selectedAccountId,
      },
    };
  } else if (params.status && params.status !== "ALL") {
    where.status = params.status;
  }

  if (params.cursorDate) {
    where.OR = [
      {
        publishedAt: {
          lt: new Date(params.cursorDate),
        },
      },
      {
        publishedAt: null,
        createdAt: {
          lt: new Date(params.cursorDate),
        },
      },
    ];
  }

  return where;
}

export function slugifyTagName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
