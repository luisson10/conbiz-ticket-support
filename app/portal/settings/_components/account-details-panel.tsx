"use client";

import Link from "next/link";
import { ExternalLink, Save } from "lucide-react";
import type { Account, Board, BoardForm, ProjectOption, TeamOption } from "@/app/portal/settings/types";
import BoardEditorCard from "@/app/portal/settings/_components/board-editor-card";

type AccountDetailsPanelProps = {
  account: Account | null;
  accountName: string;
  onChangeAccountName: (value: string) => void;
  onSaveAccount: () => void;
  savingAccount: boolean;
  supportBoard: Board | null;
  projectBoard: Board | null;
  supportForm: BoardForm;
  projectForm: BoardForm;
  teams: TeamOption[];
  supportProjects: ProjectOption[];
  projectProjects: ProjectOption[];
  savingBoardId: string | null;
  creatingBoardType: "SUPPORT" | "PROJECT" | null;
  onChangeBoardForm: (type: "SUPPORT" | "PROJECT", value: BoardForm) => void;
  onSelectTeam: (teamId: string) => void;
  onSaveBoard: (board: Board) => void;
  onCreateBoard: (type: "SUPPORT" | "PROJECT") => void;
  errorMessage: string | null;
  successMessage: string | null;
};

export default function AccountDetailsPanel({
  account,
  accountName,
  onChangeAccountName,
  onSaveAccount,
  savingAccount,
  supportBoard,
  projectBoard,
  supportForm,
  projectForm,
  teams,
  supportProjects,
  projectProjects,
  savingBoardId,
  creatingBoardType,
  onChangeBoardForm,
  onSelectTeam,
  onSaveBoard,
  onCreateBoard,
  errorMessage,
  successMessage,
}: AccountDetailsPanelProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {!account ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-6 text-sm text-gray-500">
          Selecciona una cuenta para ver su configuracion.
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{account.name}</h2>
              <p className="text-xs text-gray-500">ID: {account.id}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/portal?account=${account.id}&type=SUPPORT`}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Abrir soporte
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <Link
                href={`/portal?account=${account.id}&type=PROJECT`}
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
                  onChange={(e) => onChangeAccountName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <button
                onClick={onSaveAccount}
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
            <BoardEditorCard
              type="SUPPORT"
              board={supportBoard}
              form={supportForm}
              teams={teams}
              projects={supportProjects}
              savingBoardId={savingBoardId}
              creatingBoardType={creatingBoardType}
              onChangeForm={(value) => onChangeBoardForm("SUPPORT", value)}
              onSelectTeam={onSelectTeam}
              onSaveBoard={onSaveBoard}
              onCreateBoard={onCreateBoard}
            />

            <BoardEditorCard
              type="PROJECT"
              board={projectBoard}
              form={projectForm}
              teams={teams}
              projects={projectProjects}
              savingBoardId={savingBoardId}
              creatingBoardType={creatingBoardType}
              onChangeForm={(value) => onChangeBoardForm("PROJECT", value)}
              onSelectTeam={onSelectTeam}
              onSaveBoard={onSaveBoard}
              onCreateBoard={onCreateBoard}
            />
          </div>
        </div>
      )}
    </section>
  );
}
