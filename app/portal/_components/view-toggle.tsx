"use client";

import { LayoutGrid, List } from "lucide-react";
import type { BoardView } from "@/app/portal/_hooks/use-board-preferences";

type ViewToggleProps = {
  value: BoardView;
  onChange: (view: BoardView) => void;
};

export default function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="ml-auto flex h-10 items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
      <button
        onClick={() => onChange("table")}
        className={`flex h-8 items-center gap-2 rounded-lg px-4 text-sm font-semibold ${
          value === "table" ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"
        }`}
      >
        <List className="h-3.5 w-3.5" />
        Tabla
      </button>
      <button
        onClick={() => onChange("kanban")}
        className={`flex h-8 items-center gap-2 rounded-lg px-4 text-sm font-semibold ${
          value === "kanban" ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"
        }`}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Kanban
      </button>
    </div>
  );
}
