"use client";

import { Calendar, User } from "lucide-react";
import type { TicketDto, WorkflowStateDto } from "@/lib/contracts/portal";
import { priorityBadge } from "@/app/portal/_utils/priority";

type KanbanBoardProps = {
  states: WorkflowStateDto[];
  groupedTickets: Map<string, TicketDto[]>;
  onOpenTicket: (ticketId: string) => void;
};

export default function KanbanBoard({ states, groupedTickets, onOpenTicket }: KanbanBoardProps) {
  return (
    <div className="space-y-4">
      <div className="flex gap-4 overflow-x-auto pb-4">
        {states.map((state) => (
          <div
            key={state.id}
            className="min-w-[260px] flex-1 rounded-2xl border border-gray-200 bg-white/70 p-4 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: state.color }} />
                {state.name}
              </div>
              <span className="text-xs text-gray-400">{groupedTickets.get(state.id)?.length || 0}</span>
            </div>
            <div className="space-y-3">
              {(groupedTickets.get(state.id) || []).map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => onOpenTicket(ticket.id)}
                  className="w-full rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40"
                >
                  <div className="text-xs font-semibold text-gray-400">{ticket.identifier}</div>
                  <div className="mt-1 font-semibold text-gray-900">{ticket.title}</div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                    <User className="h-3 w-3" />
                    {ticket.assigneeName || "Unassigned"}
                  </div>
                  {(() => {
                    const badge = priorityBadge(ticket.priority);
                    const Icon = badge.icon;
                    return (
                      <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
                        {Icon ? <Icon className="h-3 w-3" /> : null}
                        {badge.label}
                      </div>
                    );
                  })()}
                  {ticket.dueDate && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
                      <Calendar className="h-3 w-3" />
                      {new Date(ticket.dueDate).toLocaleDateString()}
                    </div>
                  )}
                </button>
              ))}
              {(groupedTickets.get(state.id) || []).length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white/60 px-3 py-6 text-center text-xs text-gray-400">
                  No requests
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
