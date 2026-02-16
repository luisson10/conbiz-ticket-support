"use client";

import { Loader2, X } from "lucide-react";

type NewTicketForm = {
  title: string;
  description: string;
  priority: string;
};

type NewTicketModalProps = {
  open: boolean;
  boardName?: string;
  value: NewTicketForm;
  onChange: (value: NewTicketForm) => void;
  onClose: () => void;
  onSubmit: () => void;
  saving: boolean;
  error: string | null;
};

export default function NewTicketModal({
  open,
  boardName,
  value,
  onChange,
  onClose,
  onSubmit,
  saving,
  error,
}: NewTicketModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-8 animate-fade-in sm:py-16">
      <div className="w-[min(92vw,42rem)] shrink-0 rounded-2xl bg-white p-6 shadow-xl animate-slide-up">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Nuevo Ticket</h2>
          <button onClick={onClose} className="rounded-md p-2 text-gray-500 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-500">Create a new ticket for {boardName || "this board"}.</p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500">Title</label>
            <input
              value={value.title}
              onChange={(e) => onChange({ ...value, title: e.target.value })}
              placeholder="Brief summary"
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">Description</label>
            <textarea
              value={value.description}
              onChange={(e) => onChange({ ...value, description: e.target.value })}
              rows={4}
              placeholder="Add context, steps, and screenshots"
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">Priority</label>
            <select
              value={value.priority}
              onChange={(e) => onChange({ ...value, priority: e.target.value })}
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
            >
              <option value="0">None</option>
              <option value="1">Urgent</option>
              <option value="2">High</option>
              <option value="3">Normal</option>
              <option value="4">Low</option>
            </select>
          </div>

          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}

          <button
            onClick={onSubmit}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create ticket
          </button>
        </div>
      </div>
    </div>
  );
}
