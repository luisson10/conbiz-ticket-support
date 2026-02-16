"use client";

import { useEffect, useState } from "react";
import type { SortRuleDto } from "@/lib/contracts/portal";

export type BoardView = "table" | "kanban";

const EMPTY_SORTS: SortRuleDto[] = [];

function normalizeSortRules(input: unknown): SortRuleDto[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((rule) => {
      if (!rule || typeof rule !== "object") return false;
      const value = rule as Record<string, unknown>;
      return typeof value.field === "string" && typeof value.direction === "string";
    })
    .map((rule, index) => {
      const value = rule as Record<string, string>;
      return {
        id: value.id || `sort-${index}-${Date.now()}`,
        field: value.field as SortRuleDto["field"],
        direction: value.direction as SortRuleDto["direction"],
      };
    });
}

export function useBoardPreferences(selectedBoardId: string | null) {
  const [viewByBoard, setViewByBoard] = useState<Record<string, BoardView>>({});
  const [sortsByBoard, setSortsByBoard] = useState<Record<string, SortRuleDto[]>>({});

  const view = selectedBoardId ? (viewByBoard[selectedBoardId] ?? "kanban") : "kanban";
  const sorts = selectedBoardId ? (sortsByBoard[selectedBoardId] ?? EMPTY_SORTS) : EMPTY_SORTS;

  useEffect(() => {
    if (!selectedBoardId) return;
    const boardId = selectedBoardId;
    const storageKey = `portal-board-pref:${selectedBoardId}`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { view?: BoardView; sorts?: unknown };

      if (parsed.view === "table" || parsed.view === "kanban") {
        const parsedView: BoardView = parsed.view;
        setViewByBoard((prev) => ({ ...prev, [boardId]: parsedView }));
      }

      setSortsByBoard((prev) => ({
        ...prev,
        [boardId]: normalizeSortRules(parsed.sorts),
      }));
    } catch {
      // ignore storage errors
    }
  }, [selectedBoardId]);

  useEffect(() => {
    if (!selectedBoardId) return;
    try {
      localStorage.setItem(
        `portal-board-pref:${selectedBoardId}`,
        JSON.stringify({ view, sorts })
      );
    } catch {
      // ignore storage errors
    }
  }, [selectedBoardId, view, sorts]);

  const updateBoardView = (nextView: BoardView) => {
    if (!selectedBoardId) return;
    setViewByBoard((prev) => ({ ...prev, [selectedBoardId]: nextView }));
  };

  const updateBoardSorts = (updater: SortRuleDto[] | ((previous: SortRuleDto[]) => SortRuleDto[])) => {
    if (!selectedBoardId) return;
    setSortsByBoard((prev) => {
      const current = prev[selectedBoardId] ?? [];
      const next = typeof updater === "function" ? updater(current) : updater;
      return {
        ...prev,
        [selectedBoardId]: next,
      };
    });
  };

  return { view, sorts, updateBoardView, updateBoardSorts };
}
