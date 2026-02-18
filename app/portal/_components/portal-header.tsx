"use client";

import { Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { logout } from "@/app/actions/auth";
import BoardTypeToggle from "@/app/portal/_components/board-type-toggle";
import RecentActivityPopover from "@/app/portal/_components/recent-activity-popover";
import type { ActivityItemDto, PortalMode } from "@/lib/contracts/portal";

type AccountOption = { id: string; name: string };

type PortalHeaderProps = {
  isAdmin: boolean;
  selectedAccountName: string;
  accounts: AccountOption[];
  selectedAccountId: string | null;
  onSelectAccount: (accountId: string | null) => void;
  portalType: PortalMode;
  onChangePortalType: (value: PortalMode) => void;
  activityOpen: boolean;
  onToggleActivity: () => void;
  activityItems: ActivityItemDto[];
  activityLoading: boolean;
  unreadActivityIds: Set<string>;
  onReadAll: () => void;
  onSelectActivityItem: (item: ActivityItemDto) => void;
};

export default function PortalHeader({
  isAdmin,
  selectedAccountName,
  accounts,
  selectedAccountId,
  onSelectAccount,
  portalType,
  onChangePortalType,
  activityOpen,
  onToggleActivity,
  activityItems,
  activityLoading,
  unreadActivityIds,
  onReadAll,
  onSelectActivityItem,
}: PortalHeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
        <div className="flex min-w-fit items-center text-lg font-semibold text-gray-900">
          {selectedAccountName}
        </div>

        <div className="flex flex-1 items-center justify-center">
          <BoardTypeToggle value={portalType} onChange={onChangePortalType} allowReleases={isAdmin} />
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <select
            value={selectedAccountId || ""}
            onChange={(e) => onSelectAccount(e.target.value || null)}
            className="h-10 min-w-[180px] rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm focus:outline-none"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>

          <RecentActivityPopover
            open={activityOpen}
            onToggle={onToggleActivity}
            items={activityItems}
            loading={activityLoading}
            unreadIds={unreadActivityIds}
            onReadAll={onReadAll}
            onSelectItem={onSelectActivityItem}
          />

          {isAdmin ? (
            <button
              onClick={() => router.push("/portal/settings")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-primary/40 hover:text-primary"
              title="Board settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          ) : null}

          <button
            onClick={() => {
              void logout();
            }}
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300"
            title="Cerrar sesion"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
