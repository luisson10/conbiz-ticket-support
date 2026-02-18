"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAccount,
  createBoard,
  getAccounts,
  getBoards,
  updateAccount,
  updateBoard,
} from "@/app/actions/boards";
import { getProjects, getTeams } from "@/app/actions/linear";
import type { Account, Board, BoardForm, ProjectOption, TeamOption } from "@/app/portal/settings/types";

export const emptyBoardForm: BoardForm = {
  name: "",
  teamId: "",
  projectId: "",
};

export function useSettingsController() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [projectsByTeam, setProjectsByTeam] = useState<Record<string, ProjectOption[]>>({});

  const [search, setSearch] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const [accountName, setAccountName] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);

  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [savingNewAccount, setSavingNewAccount] = useState(false);

  const [boardForms, setBoardForms] = useState<Record<string, BoardForm>>({});
  const [createForms, setCreateForms] = useState<Record<"SUPPORT" | "PROJECT", BoardForm>>({
    SUPPORT: { ...emptyBoardForm },
    PROJECT: { ...emptyBoardForm },
  });

  const [savingBoardId, setSavingBoardId] = useState<string | null>(null);
  const [creatingBoardType, setCreatingBoardType] = useState<"SUPPORT" | "PROJECT" | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadProjectsForTeam = useCallback(async (teamId: string) => {
    if (!teamId || projectsByTeam[teamId]) return;
    const projectsRes = await getProjects(teamId);
    if (projectsRes.success) {
      setProjectsByTeam((prev) => ({ ...prev, [teamId]: projectsRes.data }));
    }
  }, [projectsByTeam]);

  const refreshData = useCallback(async (preserveAccountId?: string | null) => {
    const [accountsRaw, boardsRaw, teamsRaw] = await Promise.allSettled([
      getAccounts(),
      getBoards(),
      getTeams(),
    ]);

    if (
      accountsRaw.status === "rejected" ||
      boardsRaw.status === "rejected" ||
      teamsRaw.status === "rejected"
    ) {
      const messages: string[] = [];
      if (accountsRaw.status === "rejected") messages.push("accounts request failed");
      if (boardsRaw.status === "rejected") messages.push("boards request failed");
      if (teamsRaw.status === "rejected") messages.push("teams request failed");
      setErrorMessage(`No se pudo cargar la configuracion (${messages.join(", ")}).`);
      return;
    }

    const accountsRes = accountsRaw.value;
    const boardsRes = boardsRaw.value;
    const teamsRes = teamsRaw.value;

    if (!accountsRes.success || !boardsRes.success || !teamsRes.success) {
      const reasons: string[] = [];
      if (!accountsRes.success) reasons.push(`accounts: ${accountsRes.error}`);
      if (!boardsRes.success) reasons.push(`boards: ${boardsRes.error}`);
      if (!teamsRes.success) reasons.push(`teams: ${teamsRes.error}`);
      setErrorMessage(
        reasons.length > 0
          ? `No se pudo cargar la configuracion (${reasons.join(" | ")}).`
          : "No se pudo cargar la configuracion."
      );
      return;
    }

    setAccounts(accountsRes.data.map((item) => ({ id: item.id, name: item.name })));
    setBoards(
      boardsRes.data.map((board) => ({
        id: board.id,
        name: board.name,
        type: board.type,
        accountId: board.accountId,
        teamId: board.teamId,
        projectId: board.projectId,
      }))
    );
    setTeams(teamsRes.data);

    const targetAccount =
      preserveAccountId && accountsRes.data.some((account) => account.id === preserveAccountId)
        ? preserveAccountId
        : accountsRes.data[0]?.id || null;

    setSelectedAccountId(targetAccount);

    if (teamsRes.data.length > 0) {
      setCreateForms((prev) => ({
        SUPPORT: {
          ...prev.SUPPORT,
          teamId: prev.SUPPORT.teamId || teamsRes.data[0].id,
        },
        PROJECT: {
          ...prev.PROJECT,
          teamId: prev.PROJECT.teamId || teamsRes.data[0].id,
        },
      }));
      await loadProjectsForTeam(teamsRes.data[0].id);
    }
  }, [loadProjectsForTeam]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await refreshData(null);
      setLoading(false);
    }
    void init();
  }, [refreshData]);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) || null,
    [accounts, selectedAccountId]
  );

  useEffect(() => {
    setAccountName(selectedAccount?.name || "");
    if (!selectedAccount) return;

    setCreateForms((prev) => ({
      SUPPORT: {
        ...prev.SUPPORT,
        name: prev.SUPPORT.name || `${selectedAccount.name} Soporte`,
      },
      PROJECT: {
        ...prev.PROJECT,
        name: prev.PROJECT.name || `${selectedAccount.name} Proyecto`,
      },
    }));
  }, [selectedAccount]);

  useEffect(() => {
    const nextForms: Record<string, BoardForm> = {};
    boards.forEach((board) => {
      nextForms[board.id] = {
        name: board.name,
        teamId: board.teamId,
        projectId: board.projectId || "",
      };
    });
    setBoardForms(nextForms);
  }, [boards]);

  useEffect(() => {
    const teamIds = new Set<string>();
    boards.forEach((board) => {
      if (board.accountId === selectedAccountId && board.teamId) {
        teamIds.add(board.teamId);
      }
    });

    Object.values(createForms).forEach((form) => {
      if (form.teamId) teamIds.add(form.teamId);
    });

    teamIds.forEach((teamId) => {
      void loadProjectsForTeam(teamId);
    });
  }, [boards, selectedAccountId, createForms, loadProjectsForTeam]);

  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((account) => [account.name, account.id].some((field) => field.toLowerCase().includes(q)));
  }, [accounts, search]);

  const boardsForSelectedAccount = useMemo(
    () => boards.filter((board) => board.accountId === selectedAccountId),
    [boards, selectedAccountId]
  );

  const supportBoard = boardsForSelectedAccount.find((board) => board.type === "SUPPORT") || null;
  const projectBoard = boardsForSelectedAccount.find((board) => board.type === "PROJECT") || null;

  async function handleCreateAccount() {
    const name = newAccountName.trim();
    if (!name) {
      setErrorMessage("El nombre de la cuenta es requerido.");
      return;
    }

    setSavingNewAccount(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await createAccount({ name });
      if (res.success) {
        setNewAccountName("");
        setShowCreateAccount(false);
        await refreshData(res.data.id);
        setSuccessMessage("Cuenta creada correctamente.");
      } else {
        setErrorMessage(res.error || "No se pudo crear la cuenta.");
      }
    } catch {
      setErrorMessage("No se pudo crear la cuenta (server action failed).");
    }

    setSavingNewAccount(false);
  }

  async function handleSaveAccount() {
    if (!selectedAccount) return;

    const name = accountName.trim();
    if (!name) {
      setErrorMessage("El nombre de la cuenta es requerido.");
      return;
    }

    setSavingAccount(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await updateAccount({ id: selectedAccount.id, name });
      if (res.success) {
        await refreshData(selectedAccount.id);
        setSuccessMessage("Cuenta actualizada.");
      } else {
        setErrorMessage(res.error || "No se pudo actualizar la cuenta.");
      }
    } catch {
      setErrorMessage("No se pudo actualizar la cuenta (server action failed).");
    }

    setSavingAccount(false);
  }

  async function handleCreateBoard(type: "SUPPORT" | "PROJECT") {
    if (!selectedAccount) return;

    const form = createForms[type];
    if (!form.name.trim() || !form.teamId) {
      setErrorMessage("Nombre y equipo son requeridos para crear el board.");
      return;
    }

    setCreatingBoardType(type);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await createBoard({
        name: form.name,
        type,
        accountId: selectedAccount.id,
        teamId: form.teamId,
        projectId: form.projectId || null,
      });

      if (res.success) {
        await refreshData(selectedAccount.id);
        setSuccessMessage(`Board de ${type === "SUPPORT" ? "soporte" : "proyecto"} creado.`);
      } else {
        setErrorMessage(res.error || "No se pudo crear el board.");
      }
    } catch {
      setErrorMessage("No se pudo crear el board (server action failed).");
    }

    setCreatingBoardType(null);
  }

  async function handleSaveBoard(board: Board) {
    const form = boardForms[board.id];
    if (!form || !form.name.trim() || !form.teamId) {
      setErrorMessage("Nombre y equipo son requeridos para actualizar el board.");
      return;
    }

    setSavingBoardId(board.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await updateBoard({
        id: board.id,
        name: form.name,
        teamId: form.teamId,
        projectId: form.projectId || null,
      });

      if (res.success) {
        await refreshData(selectedAccountId);
        setSuccessMessage("Board actualizado.");
      } else {
        setErrorMessage(res.error || "No se pudo actualizar el board.");
      }
    } catch {
      setErrorMessage("No se pudo actualizar el board (server action failed).");
    }

    setSavingBoardId(null);
  }

  return {
    loading,
    search,
    setSearch,
    selectedAccountId,
    setSelectedAccountId,
    selectedAccount,
    filteredAccounts,
    accountName,
    setAccountName,
    savingAccount,
    showCreateAccount,
    setShowCreateAccount,
    newAccountName,
    setNewAccountName,
    savingNewAccount,
    supportBoard,
    projectBoard,
    boardForms,
    createForms,
    teams,
    projectsByTeam,
    savingBoardId,
    creatingBoardType,
    errorMessage,
    setErrorMessage,
    successMessage,
    setSuccessMessage,
    loadProjectsForTeam,
    handleCreateAccount,
    handleSaveAccount,
    handleCreateBoard,
    handleSaveBoard,
    setBoardForms,
    setCreateForms,
  };
}
