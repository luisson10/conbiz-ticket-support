"use client";

import { ArrowUpDown, ChevronDown, GripVertical, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { SortRuleDto } from "@/lib/contracts/portal";

const SORT_FIELD_OPTIONS: Array<{ value: SortRuleDto["field"]; label: string }> = [
  { value: "createdAt", label: "Fecha creación" },
  { value: "updatedAt", label: "Fecha modificación" },
  { value: "priority", label: "Prioridad" },
  { value: "title", label: "Título" },
  { value: "owner", label: "Owner" },
  { value: "state", label: "Estado" },
];

type SortPopoverProps = {
  disabled: boolean;
  sorts: SortRuleDto[];
  onChange: (updater: SortRuleDto[] | ((prev: SortRuleDto[]) => SortRuleDto[])) => void;
};

export default function SortPopover({ disabled, sorts, onChange }: SortPopoverProps) {
  const [open, setOpen] = useState(false);

  const sortCount = useMemo(() => sorts.length, [sorts]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <ArrowUpDown className="h-4 w-4" />
        Ordenar
        {sortCount > 0 && (
          <span className="inline-flex min-w-5 items-center justify-center rounded-md bg-gray-900 px-1.5 py-0.5 text-xs font-semibold text-white">
            {sortCount}
          </span>
        )}
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-11 z-20 w-96 animate-fade-in rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
          <div className="space-y-2">
            {sorts.map((rule, idx) => (
              <div
                key={rule.id}
                className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50/60 p-2"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-white text-xs font-semibold text-gray-500">
                  {idx + 1}
                </span>
                <GripVertical className="h-4 w-4 text-gray-300" />
                <select
                  value={rule.field}
                  onChange={(e) =>
                    onChange((prev) =>
                      prev.map((item) =>
                        item.id === rule.id
                          ? { ...item, field: e.target.value as SortRuleDto["field"] }
                          : item
                      )
                    )
                  }
                  className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 focus:outline-none"
                >
                  {SORT_FIELD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={rule.direction}
                  onChange={(e) =>
                    onChange((prev) =>
                      prev.map((item) =>
                        item.id === rule.id
                          ? { ...item, direction: e.target.value as SortRuleDto["direction"] }
                          : item
                      )
                    )
                  }
                  className="w-32 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 focus:outline-none"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
                <button
                  onClick={() => onChange((prev) => prev.filter((item) => item.id !== rule.id))}
                  className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  title="Delete sort"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 border-t border-gray-100 pt-2">
            <button
              onClick={() =>
                onChange((prev) => [
                  ...prev,
                  {
                    id: `sort-${Date.now()}`,
                    field: "updatedAt",
                    direction: "desc",
                  },
                ])
              }
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
              Add sort
            </button>
            <button
              onClick={() => onChange([])}
              className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete sort
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
