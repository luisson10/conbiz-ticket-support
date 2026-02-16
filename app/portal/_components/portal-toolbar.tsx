"use client";

import { Plus, Search } from "lucide-react";
import type { BoardDto, SortRuleDto } from "@/lib/contracts/portal";
import type { BoardView } from "@/app/portal/_hooks/use-board-preferences";
import SortPopover from "@/app/portal/_components/sort-popover";
import ViewToggle from "@/app/portal/_components/view-toggle";

type PortalToolbarProps = {
  selectedBoard: BoardDto | null;
  search: string;
  onSearchChange: (value: string) => void;
  view: BoardView;
  onChangeView: (view: BoardView) => void;
  sorts: SortRuleDto[];
  onChangeSorts: (updater: SortRuleDto[] | ((prev: SortRuleDto[]) => SortRuleDto[])) => void;
  onCreateTicket: () => void;
};

export default function PortalToolbar({
  selectedBoard,
  search,
  onSearchChange,
  view,
  onChangeView,
  sorts,
  onChangeSorts,
  onCreateTicket,
}: PortalToolbarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <SortPopover disabled={!selectedBoard} sorts={sorts} onChange={onChangeSorts} />

      <div className="flex h-10 min-w-[260px] flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 shadow-sm">
        <Search className="h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tickets..."
          className="w-full bg-transparent text-sm text-gray-700 outline-none"
        />
      </div>

      <ViewToggle value={view} onChange={onChangeView} />

      {!selectedBoard ? (
        <div className="flex h-10 items-center rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-medium text-gray-500">
          Crea o selecciona un board para continuar
        </div>
      ) : selectedBoard.type !== "PROJECT" ? (
        <button
          onClick={onCreateTicket}
          className="flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Crear ticket
        </button>
      ) : (
        <div className="flex h-10 items-center rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-medium text-gray-500">
          Vista proyecto: solo lectura para nuevos tickets
        </div>
      )}
    </div>
  );
}
