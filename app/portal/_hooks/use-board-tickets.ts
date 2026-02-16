"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getBoardTickets } from "@/app/actions/portal";
import type { TicketDto, WorkflowStateDto } from "@/lib/contracts/portal";

type CacheEntry = {
  tickets: TicketDto[];
  states: WorkflowStateDto[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  fetchedAt: number;
};

const DEFAULT_PAGE_INFO = { hasNextPage: false, endCursor: null as string | null };

export function useBoardTickets(selectedBoardId: string | null, cacheTtlMs = 30_000) {
  const [tickets, setTickets] = useState<TicketDto[]>([]);
  const [states, setStates] = useState<WorkflowStateDto[]>([]);
  const [pageInfo, setPageInfo] = useState(DEFAULT_PAGE_INFO);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);

  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  const loadTickets = useCallback(
    async (boardId: string, force = false) => {
      const cached = cacheRef.current.get(boardId);
      if (!force && cached && Date.now() - cached.fetchedAt < cacheTtlMs) {
        setTickets(cached.tickets);
        setStates(cached.states);
        setPageInfo(cached.pageInfo);
        setLoadingTickets(false);
        return;
      }

      setLoadingTickets(true);
      setTicketsError(null);
      const res = await getBoardTickets(boardId, { first: 150 });

      if (res.success) {
        setTickets(res.data.tickets);
        setStates(res.data.states);
        setPageInfo(res.data.pageInfo);
        cacheRef.current.set(boardId, {
          tickets: res.data.tickets,
          states: res.data.states,
          pageInfo: res.data.pageInfo,
          fetchedAt: Date.now(),
        });
      } else {
        setTickets([]);
        setStates([]);
        setPageInfo(DEFAULT_PAGE_INFO);
        setTicketsError(res.error);
      }

      setLoadingTickets(false);
    },
    [cacheTtlMs]
  );

  const reload = useCallback(async () => {
    if (!selectedBoardId) return;
    await loadTickets(selectedBoardId, true);
  }, [selectedBoardId, loadTickets]);

  useEffect(() => {
    if (!selectedBoardId) {
      setTickets([]);
      setStates([]);
      setPageInfo(DEFAULT_PAGE_INFO);
      setLoadingTickets(false);
      return;
    }

    void loadTickets(selectedBoardId);
  }, [selectedBoardId, loadTickets]);

  const invalidateBoardCache = useCallback((boardId: string) => {
    cacheRef.current.delete(boardId);
  }, []);

  return useMemo(
    () => ({
      tickets,
      states,
      pageInfo,
      loadingTickets,
      ticketsError,
      reload,
      invalidateBoardCache,
    }),
    [tickets, states, pageInfo, loadingTickets, ticketsError, reload, invalidateBoardCache]
  );
}
