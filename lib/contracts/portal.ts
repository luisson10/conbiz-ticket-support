export type BoardType = "SUPPORT" | "PROJECT";
export type PortalMode = BoardType | "RELEASES";

export type AccountDto = {
  id: string;
  name: string;
};

export type BoardDto = {
  id: string;
  name: string;
  type: BoardType;
  accountId: string;
  account: AccountDto;
  teamId: string;
  projectId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkflowStateDto = {
  id: string;
  name: string;
  type: string;
  color: string;
};

export type TicketDto = {
  id: string;
  identifier: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  url?: string | null;
  priority?: number | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  state: string;
  stateId?: string | null;
  stateType?: string | null;
  stateColor?: string | null;
  assigneeName?: string | null;
  projectName?: string | null;
};

export type CommentDto = {
  id: string;
  body: string;
  createdAt: string;
  userName: string;
};

export type AttachmentDto = {
  id: string;
  title?: string | null;
  url: string;
  createdAt: string;
};

export type IssueDetailsDto = {
  id: string;
  identifier: string;
  title: string;
  description?: string | null;
  url?: string | null;
  dueDate?: string | null;
  priority?: number | null;
  state: string;
  stateType?: string | null;
  stateColor: string;
  assigneeName: string;
  projectName?: string | null;
  comments: CommentDto[];
  attachments: AttachmentDto[];
};

export type ActivityItemDto = {
  id: string;
  type: "comment" | "update";
  issueId: string;
  issueTitle: string;
  issueIdentifier: string;
  createdAt: string;
  body?: string;
};

export type SortField = "createdAt" | "updatedAt" | "priority" | "title" | "owner" | "state";

export type SortDirection = "asc" | "desc";

export type SortRuleDto = {
  id: string;
  field: SortField;
  direction: SortDirection;
};
