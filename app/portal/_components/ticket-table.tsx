"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SortRuleDto, TicketDto } from "@/lib/contracts/portal";
import { priorityBadge } from "@/app/portal/_utils/priority";

type TicketTableProps = {
  tickets: TicketDto[];
  sorts: SortRuleDto[];
  onOpenTicket: (ticketId: string) => void;
};

type ColumnKey = "title" | "owner" | "state" | "createdAt" | "dueDate";

type ResizeState = {
  key: ColumnKey;
  startX: number;
  startWidth: number;
};

const DEFAULT_WIDTHS: Record<ColumnKey, number> = {
  title: 280,
  owner: 180,
  state: 140,
  createdAt: 160,
  dueDate: 140,
};

export default function TicketTable({ tickets, sorts, onOpenTicket }: TicketTableProps) {
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(DEFAULT_WIDTHS);
  const [isResizing, setIsResizing] = useState(false);
  const resizeState = useRef<ResizeState | null>(null);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!resizeState.current) return;
      const { key, startX, startWidth } = resizeState.current;
      const delta = event.clientX - startX;
      setColumnWidths((prev) => ({
        ...prev,
        [key]: Math.max(120, startWidth + delta),
      }));
    };

    const onUp = () => {
      resizeState.current = null;
      setIsResizing(false);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const sortByField = useMemo(() => {
    const map = new Map<SortRuleDto["field"], SortRuleDto>();
    sorts.forEach((rule) => map.set(rule.field, rule));
    return map;
  }, [sorts]);

  const onResizeStart = (key: ColumnKey, startX: number) => {
    resizeState.current = {
      key,
      startX,
      startWidth: columnWidths[key] || 160,
    };
    setIsResizing(true);
  };

  const sortIconFor = (field: SortRuleDto["field"]) => {
    const activeSort = sortByField.get(field);
    if (!activeSort) return null;

    return (
      <span className="inline-flex items-center gap-0.5">
        <ArrowUp className={`h-3.5 w-3.5 ${activeSort.direction === "asc" ? "text-gray-900" : "text-gray-300"}`} />
        <ArrowDown className={`h-3.5 w-3.5 ${activeSort.direction === "desc" ? "text-gray-900" : "text-gray-300"}`} />
      </span>
    );
  };

  return (
    <div className="space-y-3">
      <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${isResizing ? "cursor-col-resize" : ""}`}>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full table-fixed text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                {[
                  { key: "title" as const, label: "Title", sortField: "title" as const },
                  { key: "owner" as const, label: "Owner", sortField: "owner" as const },
                  { key: "state" as const, label: "State", sortField: "state" as const },
                  { key: "createdAt" as const, label: "Created", sortField: "createdAt" as const },
                  { key: "dueDate" as const, label: "Due date", sortField: null },
                ].map((col) => (
                  <th
                    key={col.key}
                    className="relative select-none px-5 py-3 font-medium"
                    style={{ width: columnWidths[col.key] || undefined }}
                  >
                    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {col.label}
                      {col.sortField ? sortIconFor(col.sortField) : null}
                    </span>
                    <span
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onResizeStart(col.key, e.clientX);
                      }}
                      className="absolute right-0 top-0 h-full w-2 cursor-col-resize"
                    >
                      <span className="absolute right-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded bg-gray-200" />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="cursor-pointer transition hover:bg-gray-50/70"
                  onClick={() => onOpenTicket(ticket.id)}
                >
                  <td className="px-5 py-4" style={{ width: columnWidths.title }}>
                    <div className="text-xs font-semibold text-gray-400">{ticket.identifier}</div>
                    <div className="font-semibold text-gray-900">{ticket.title}</div>
                  </td>
                  <td className="px-5 py-4 text-gray-600" style={{ width: columnWidths.owner }}>
                    <div className="flex flex-col gap-1">
                      <span>{ticket.assigneeName || "Unassigned"}</span>
                      {(() => {
                        const badge = priorityBadge(ticket.priority);
                        const Icon = badge.icon;
                        return (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                            {badge.label}
                          </span>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="px-5 py-4" style={{ width: columnWidths.state }}>
                    <span
                      className="inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold"
                      style={{
                        backgroundColor: `${ticket.stateColor}20`,
                        borderColor: `${ticket.stateColor}40`,
                        color: ticket.stateColor || "#4b5563",
                      }}
                    >
                      {ticket.state}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-600" style={{ width: columnWidths.createdAt }}>
                    {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-4 text-gray-600" style={{ width: columnWidths.dueDate }}>
                    {ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-gray-400">
                    No tickets found for this board.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
