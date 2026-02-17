"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getBoards } from "@/app/actions/boards";
import type { BoardDto, PortalMode } from "@/lib/contracts/portal";

type AccountOption = {
  id: string;
  name: string;
};

export function useBoardSelection() {
  const searchParams = useSearchParams();
  const [boards, setBoards] = useState<BoardDto[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [portalType, setPortalType] = useState<PortalMode>("SUPPORT");
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [loadingBoards, setLoadingBoards] = useState(true);

  const requestedAccountId = searchParams.get("account");
  const requestedType = searchParams.get("type");

  const scopedBoards = useMemo(
    () =>
      boards.filter((board) => {
        if (portalType === "RELEASES") return false;
        return board.accountId === selectedAccountId && board.type === portalType;
      }),
    [boards, selectedAccountId, portalType]
  );

  const selectedBoard = useMemo(
    () => boards.find((board) => board.id === selectedBoardId) || null,
    [boards, selectedBoardId]
  );

  const selectedAccountName = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId)?.name || "Soporte",
    [accounts, selectedAccountId]
  );

  useEffect(() => {
    async function loadBoards() {
      setLoadingBoards(true);
      const res = await getBoards();
      if (!res.success) {
        setLoadingBoards(false);
        return;
      }

      setBoards(res.data);
      const uniqueAccounts = new Map<string, AccountOption>();
      res.data.forEach((board) => {
        uniqueAccounts.set(board.account.id, board.account);
      });
      const sortedAccounts = [...uniqueAccounts.values()].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setAccounts(sortedAccounts);

      if (sortedAccounts.length > 0) {
        const hasRequested = requestedAccountId
          ? sortedAccounts.some((account) => account.id === requestedAccountId)
          : false;

        setSelectedAccountId((previous) =>
          hasRequested ? requestedAccountId || sortedAccounts[0].id : previous || sortedAccounts[0].id
        );
      }

      setLoadingBoards(false);
    }

    void loadBoards();
  }, [requestedAccountId]);

  useEffect(() => {
    if (
      requestedType === "PROJECT" ||
      requestedType === "SUPPORT" ||
      requestedType === "RELEASES"
    ) {
      setPortalType(requestedType);
    }
  }, [requestedType]);

  useEffect(() => {
    if (requestedType || !selectedAccountId) return;
    try {
      const stored = localStorage.getItem(`portal-mode:${selectedAccountId}`);
      if (stored === "SUPPORT" || stored === "PROJECT" || stored === "RELEASES") {
        setPortalType(stored);
      }
    } catch {
      // ignore storage errors
    }
  }, [requestedType, selectedAccountId]);

  useEffect(() => {
    if (!selectedAccountId) return;
    try {
      localStorage.setItem(`portal-mode:${selectedAccountId}`, portalType);
    } catch {
      // ignore storage errors
    }
  }, [selectedAccountId, portalType]);

  useEffect(() => {
    if (!selectedAccountId || scopedBoards.length === 0) {
      setSelectedBoardId(null);
      return;
    }

    const stillValid = scopedBoards.some((board) => board.id === selectedBoardId);
    if (!stillValid) {
      setSelectedBoardId(scopedBoards[0].id);
    }
  }, [selectedAccountId, selectedBoardId, scopedBoards]);

  return {
    boards,
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    portalType,
    setPortalType,
    selectedBoardId,
    setSelectedBoardId,
    selectedBoard,
    selectedAccountName,
    loadingBoards,
  };
}
