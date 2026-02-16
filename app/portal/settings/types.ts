export type Account = {
  id: string;
  name: string;
};

export type Board = {
  id: string;
  name: string;
  type: "SUPPORT" | "PROJECT";
  accountId: string;
  teamId: string;
  projectId?: string | null;
};

export type TeamOption = {
  id: string;
  name: string;
  key: string;
};

export type ProjectOption = {
  id: string;
  name: string;
  state: string;
};

export type BoardForm = {
  name: string;
  teamId: string;
  projectId: string;
};
