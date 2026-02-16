"use client";

import { Plus, Save } from "lucide-react";
import type { Board, BoardForm, ProjectOption, TeamOption } from "@/app/portal/settings/types";

type BoardEditorCardProps = {
  type: "SUPPORT" | "PROJECT";
  board: Board | null;
  form: BoardForm;
  teams: TeamOption[];
  projects: ProjectOption[];
  savingBoardId: string | null;
  creatingBoardType: "SUPPORT" | "PROJECT" | null;
  onChangeForm: (value: BoardForm) => void;
  onSelectTeam: (teamId: string) => void;
  onSaveBoard: (board: Board) => void;
  onCreateBoard: (type: "SUPPORT" | "PROJECT") => void;
};

export default function BoardEditorCard({
  type,
  board,
  form,
  teams,
  projects,
  savingBoardId,
  creatingBoardType,
  onChangeForm,
  onSelectTeam,
  onSaveBoard,
  onCreateBoard,
}: BoardEditorCardProps) {
  const label = type === "SUPPORT" ? "Board de soporte" : "Board de proyecto";

  if (board) {
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
              onChange={(e) => onChangeForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">Equipo Linear</label>
            <select
              value={form.teamId}
              onChange={(e) => {
                const teamId = e.target.value;
                onChangeForm({ ...form, teamId, projectId: "" });
                onSelectTeam(teamId);
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
              onChange={(e) => onChangeForm({ ...form, projectId: e.target.value })}
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
            onClick={() => onSaveBoard(board)}
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

  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
      <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
      <p className="mt-1 text-xs text-gray-500">No existe aun. Crea uno para esta cuenta.</p>

      <div className="mt-3 space-y-3">
        <div>
          <label className="text-xs font-semibold text-gray-500">Nombre</label>
          <input
            value={form.name}
            onChange={(e) => onChangeForm({ ...form, name: e.target.value })}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500">Equipo Linear</label>
          <select
            value={form.teamId}
            onChange={(e) => {
              const teamId = e.target.value;
              onChangeForm({ ...form, teamId, projectId: "" });
              onSelectTeam(teamId);
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
            onChange={(e) => onChangeForm({ ...form, projectId: e.target.value })}
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
          onClick={() => onCreateBoard(type)}
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
