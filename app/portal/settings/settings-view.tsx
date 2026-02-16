"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  createAccount,
  createBoard,
  getAccounts,
  getBoards,
  updateAccount,
  updateBoard,
} from "@/app/actions/boards";
import { getProjects, getTeams } from "@/app/actions/linear";
import { ArrowLeft, Building2, Plus, Save, Search, ExternalLink } from "lucide-react";

type Account = {
  id: string;
  name: string;
};

type Board = {
  id: string;
  name: string;
  type: "SUPPORT" | "PROJECT";
  accountId: string;
  teamId: string;
  projectId?: string | null;
};

type TeamOption = {
  id: string;
  name: string;
  key: string;
};

type ProjectOption = {
  id: string;
  name: string;
  state: string;
};

type BoardForm = {
  name: string;
  teamId: string;
  projectId: string;
};

const emptyBoardForm: BoardForm = {
  name: "",
  teamId: "",
  projectId: "",
};

export default function SettingsView() {
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

  async function loadProjectsForTeam(teamId: string) {
    if (!teamId || projectsByTeam[teamId]) return;
    const projectsRes = await getProjects(teamId);
    if (projectsRes.success) {
      setProjectsByTeam((prev) => ({ ...prev, [teamId]: projectsRes.data }));
    }
  }

  async function refreshData(preserveAccountId?: string | null) {
    const [accountsRes, boardsRes, teamsRes] = await Promise.all([
      getAccounts(),
      getBoards(),
      getTeams(),
    ]);

    if (!accountsRes.success || !boardsRes.success || !teamsRes.success) {
      setErrorMessage("No se pudo cargar la configuracion.");
      return;
    }

    setAccounts(accountsRes.data);
    setBoards(boardsRes.data);
    setTeams(teamsRes.data);

    const targetAccount =
      preserveAccountId && accountsRes.data.some((a: Account) => a.id === preserveAccountId)
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
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      await refreshData(null);
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) || null;

  useEffect(() => {
    setAccountName(selectedAccount?.name || "");
    if (selectedAccount) {
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
    }
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
      if (form.teamId) {
        teamIds.add(form.teamId);
      }
    });
    teamIds.forEach((teamId) => {
      void loadProjectsForTeam(teamId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boards, selectedAccountId, createForms]);

  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((account) =>
      [account.name, account.id].some((field) => field.toLowerCase().includes(q))
    );
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

    const res = await createAccount({ name });
    if (res.success) {
      setNewAccountName("");
      setShowCreateAccount(false);
      await refreshData(res.data.id);
      setSuccessMessage("Cuenta creada correctamente.");
    } else {
      setErrorMessage(res.error || "No se pudo crear la cuenta.");
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

    const res = await updateAccount({ id: selectedAccount.id, name });
    if (res.success) {
      await refreshData(selectedAccount.id);
      setSuccessMessage("Cuenta actualizada.");
    } else {
      setErrorMessage(res.error || "No se pudo actualizar la cuenta.");
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

    setSavingBoardId(null);
  }

  function renderBoardEditor(type: "SUPPORT" | "PROJECT", board: Board | null) {
    const label = type === "SUPPORT" ? "Board de soporte" : "Board de proyecto";

    if (board) {
      const form = boardForms[board.id] || emptyBoardForm;
      const projects = projectsByTeam[form.teamId] || [];
      return (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
            <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
              {board.id.slice(0, 8)}
            </span>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Nombre</label>
              <input
                value={form.name}
                onChange={(e) =>
                  setBoardForms((prev) => ({
                    ...prev,
                    [board.id]: { ...form, name: e.target.value },
                  }))
                }
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Equipo Linear</label>
              <select
                value={form.teamId}
                onChange={(e) => {
                  const teamId = e.target.value;
                  setBoardForms((prev) => ({
                    ...prev,
                    [board.id]: { ...form, teamId, projectId: "" },
                  }));
                  void loadProjectsForTeam(teamId);
                }}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
              >
                <option value="">Selecciona un equipo</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Proyecto Linear</label>
              <select
                value={form.projectId}
                onChange={(e) =>
                  setBoardForms((prev) => ({
                    ...prev,
                    [board.id]: { ...form, projectId: e.target.value },
                  }))
                }
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
              >
                <option value="">Sin proyecto (team-wide)</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => handleSaveBoard(board)}
              disabled={savingBoardId === board.id}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" />
              Guardar board
            </button>
          </div>
        </div>
      );
    }

    const form = createForms[type];
    const projects = projectsByTeam[form.teamId] || [];

    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
        <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
        <p className="mt-1 text-xs text-gray-500">No existe aun. Crea uno para esta cuenta.</p>
        <div className="mt-3 space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500">Nombre</label>
            <input
              value={form.name}
              onChange={(e) =>
                setCreateForms((prev) => ({
                  ...prev,
                  [type]: { ...form, name: e.target.value },
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Equipo Linear</label>
            <select
              value={form.teamId}
              onChange={(e) => {
                const teamId = e.target.value;
                setCreateForms((prev) => ({
                  ...prev,
                  [type]: { ...form, teamId, projectId: "" },
                }));
                void loadProjectsForTeam(teamId);
              }}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
            >
              <option value="">Selecciona un equipo</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Proyecto Linear</label>
            <select
              value={form.projectId}
              onChange={(e) =>
                setCreateForms((prev) => ({
                  ...prev,
                  [type]: { ...form, projectId: e.target.value },
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
            >
              <option value="">Sin proyecto (team-wide)</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => handleCreateBoard(type)}
            disabled={creatingBoardType === type}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" />
            Crear board {type === "SUPPORT" ? "de soporte" : "de proyecto"}
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-gray-500">Cargando configuracion...</div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/portal"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al portal
            </Link>
            <div>
              <div className="text-lg font-semibold text-gray-900">Configuracion de cuentas</div>
              <div className="text-xs text-gray-500">Gestiona organizaciones y boards de soporte/proyecto</div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cuenta..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>

          <button
            onClick={() => {
              setErrorMessage(null);
              setSuccessMessage(null);
              setShowCreateAccount(true);
            }}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Crear organizacion
          </button>

          <div className="mt-4 space-y-2">
            {filteredAccounts.map((account) => (
              <button
                key={account.id}
                onClick={() => setSelectedAccountId(account.id)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selectedAccountId === account.id
                    ? "border-primary/40 bg-primary-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="text-sm font-semibold text-gray-900">{account.name}</div>
                <div className="mt-1 text-xs text-gray-500">ID: {account.id.slice(0, 10)}</div>
              </button>
            ))}
            {filteredAccounts.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-200 p-4 text-xs text-gray-500">
                No hay cuentas que coincidan.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          {!selectedAccount ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-6 text-sm text-gray-500">
              Selecciona una cuenta para ver su configuracion.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{selectedAccount.name}</h2>
                  <p className="text-xs text-gray-500">ID: {selectedAccount.id}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/portal?account=${selectedAccount.id}&type=SUPPORT`}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Abrir soporte
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href={`/portal?account=${selectedAccount.id}&type=PROJECT`}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Abrir proyecto
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm font-semibold text-gray-900">Informacion de cuenta</div>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <div className="min-w-[16rem] flex-1">
                    <label className="text-xs font-semibold text-gray-500">Nombre principal</label>
                    <input
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleSaveAccount}
                    disabled={savingAccount}
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Guardar cuenta
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
                  {successMessage}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {renderBoardEditor("SUPPORT", supportBoard)}
                {renderBoardEditor("PROJECT", projectBoard)}
              </div>
            </div>
          )}
        </section>
      </main>

      {showCreateAccount && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10 animate-fade-in">
          <div className="w-[min(92vw,32rem)] shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl animate-slide-up">
            <div className="border-b border-gray-100 px-5 py-4">
              <h3 className="text-base font-semibold text-gray-900">Crear organizacion</h3>
            </div>

            <div className="space-y-4 px-5 py-5">
              <p className="text-sm text-gray-500">
                Ingresa un nombre unico para la nueva organizacion.
              </p>

              <div>
                <label className="block text-xs font-semibold text-gray-500">
                  Nombre de organizacion
                </label>
                <input
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none"
                  placeholder="Vela"
                  autoFocus
                />
              </div>

              {errorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {errorMessage}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => {
                    setShowCreateAccount(false);
                    setNewAccountName("");
                    setErrorMessage(null);
                  }}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateAccount}
                  disabled={savingNewAccount}
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  Crear organizacion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
