"use client";

import { Bell, Loader2 } from "lucide-react";
import type { ActivityItemDto } from "@/lib/contracts/portal";

type RecentActivityPopoverProps = {
  open: boolean;
  onToggle: () => void;
  items: ActivityItemDto[];
  loading: boolean;
  unreadIds: Set<string>;
  onReadAll: () => void;
  onSelectItem: (item: ActivityItemDto) => void;
};

export default function RecentActivityPopover({
  open,
  onToggle,
  items,
  loading,
  unreadIds,
  onReadAll,
  onSelectItem,
}: RecentActivityPopoverProps) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 shadow-sm transition hover:border-primary/40 hover:text-primary"
      >
        <span className="relative">
          <Bell className="h-4 w-4" />
          {unreadIds.size > 0 && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-sm bg-red-500" />}
        </span>
        Actividad Reciente
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 animate-fade-in rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Actividad Reciente</div>
            <button
              onClick={onReadAll}
              className="text-xs font-semibold text-gray-500 hover:text-gray-900"
            >
              Read all
            </button>
          </div>
          {loading ? (
            <div className="mt-3 flex items-center justify-center text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="mt-3 text-sm text-gray-500">No recent updates.</div>
          ) : (
            <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className="w-full rounded-lg border border-gray-100 px-3 py-2 text-left text-sm text-gray-700 hover:border-primary/40"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-400">
                    <span>{item.issueIdentifier}</span>
                    {unreadIds.has(item.id) && <span className="h-2 w-2 rounded-sm bg-red-500" />}
                  </div>
                  <div className="font-medium text-gray-900">{item.issueTitle}</div>
                  <div className="text-xs text-gray-500">
                    {item.type === "comment" ? "New comment" : "Issue updated"}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
