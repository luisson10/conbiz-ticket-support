import type { BoardType } from "@/lib/contracts/portal";

export type ReleaseStatus = "DRAFT" | "PUBLISHED";

export type ReleaseTagDto = {
  id: string;
  name: string;
  slug: string;
};

export type ReleaseItemDto = {
  id: string;
  releaseId: string;
  issueId: string;
  issueIdentifier: string;
  title: string;
  stateName: string;
  stateType?: string | null;
  priority?: number | null;
  boardType: BoardType;
  accountId: string;
  createdAt: string;
};

export type ReleaseTimelineItemDto = {
  id: string;
  title: string;
  description: string;
  status: ReleaseStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  accounts: Array<{ id: string; name: string }>;
  tags: ReleaseTagDto[];
  itemCount: number;
};

export type ReleaseDetailsDto = ReleaseTimelineItemDto & {
  items: ReleaseItemDto[];
};

export type ReleaseCandidateTicketDto = {
  issueId: string;
  identifier: string;
  title: string;
  stateName: string;
  stateType?: string | null;
  priority?: number | null;
  boardType: BoardType;
  accountId: string;
};
