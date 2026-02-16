"use client";

import { Plus, Search } from "lucide-react";
import type { Account } from "@/app/portal/settings/types";

type AccountsColumnProps = {
  search: string;
  onSearchChange: (value: string) => void;
  accounts: Account[];
  selectedAccountId: string | null;
  onSelectAccount: (accountId: string) => void;
  onCreateAccount: () => void;
};

export default function AccountsColumn({
  search,
  onSearchChange,
  accounts,
  selectedAccountId,
  onSelectAccount,
  onCreateAccount,
}: AccountsColumnProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
        <Search className="h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar cuenta..."
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      <button
        onClick={onCreateAccount}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
      >
        <Plus className="h-4 w-4" />
        Crear organizacion
      </button>

      <div className="mt-4 space-y-2">
        {accounts.map((account) => (
          <button
            key={account.id}
            onClick={() => onSelectAccount(account.id)}
            className={`w-full rounded-xl border p-3 text-left transition ${
              selectedAccountId === account.id
                ? "border-primary/40 bg-primary-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="text-sm font-semibold text-gray-900">{account.name}</div>
            <div className="mt-1 text-xs text-gray-500">ID: {account.id.slice(0, 10)}</div>
          </button>
        ))}
        {accounts.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-200 p-4 text-xs text-gray-500">
            No hay cuentas que coincidan.
          </div>
        )}
      </div>
    </section>
  );
}
