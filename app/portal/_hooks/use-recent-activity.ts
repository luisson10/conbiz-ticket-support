"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getRecentActivity } from "@/app/actions/portal";
import type { ActivityItemDto } from "@/lib/contracts/portal";

function getLatestTimestamp(items: ActivityItemDto[]): string | null {
  if (items.length === 0) return null;
  return items.reduce<string | null>((latest, item) => {
    if (!latest) return item.createdAt;
    return item.createdAt > latest ? item.createdAt : latest;
  }, null);
}

export function useRecentActivity(selectedBoardId: string | null) {
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activity, setActivity] = useState<ActivityItemDto[]>([]);
  const [seenActivityIds, setSeenActivityIds] = useState<Set<string>>(new Set());
  const [lastSeenTimestamp, setLastSeenTimestamp] = useState<string | null>(null);

  const unreadActivityIds = useMemo(
    () => new Set(activity.map((item) => item.id).filter((id) => !seenActivityIds.has(id))),
    [activity, seenActivityIds]
  );

  useEffect(() => {
    if (!selectedBoardId) {
      setSeenActivityIds(new Set());
      setLastSeenTimestamp(null);
      setActivity([]);
      return;
    }

    try {
      const seenRaw = localStorage.getItem(`activity-seen:${selectedBoardId}`);
      if (seenRaw) {
        const parsed = JSON.parse(seenRaw);
        if (Array.isArray(parsed)) {
          setSeenActivityIds(new Set(parsed));
        }
      } else {
        setSeenActivityIds(new Set());
      }

      const timestamp = localStorage.getItem(`activity-last-seen-ts:${selectedBoardId}`);
      setLastSeenTimestamp(timestamp || null);
    } catch {
      setSeenActivityIds(new Set());
      setLastSeenTimestamp(null);
    }
  }, [selectedBoardId]);

  const markAsSeen = useCallback(
    (ids: string[]) => {
      if (!selectedBoardId || ids.length === 0) return;

      setSeenActivityIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        try {
          localStorage.setItem(`activity-seen:${selectedBoardId}`, JSON.stringify([...next]));
        } catch {
          // ignore storage errors
        }
        return next;
      });

      const latest = getLatestTimestamp(activity);
      if (latest) {
        setLastSeenTimestamp(latest);
        try {
          localStorage.setItem(`activity-last-seen-ts:${selectedBoardId}`, latest);
        } catch {
          // ignore storage errors
        }
      }
    },
    [selectedBoardId, activity]
  );

  const refreshActivity = useCallback(
    async (showLoader: boolean, since?: string | null) => {
      if (!selectedBoardId) return;
      if (showLoader) setActivityLoading(true);

      const res = await getRecentActivity(selectedBoardId, {
        limit: 40,
        since: since ?? lastSeenTimestamp,
      });

      if (res.success) {
        setActivity((prev) => {
          const map = new Map<string, ActivityItemDto>();
          [...res.data, ...prev].forEach((item) => map.set(item.id, item));
          return [...map.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        });
      }

      if (showLoader) setActivityLoading(false);
    },
    [selectedBoardId, lastSeenTimestamp]
  );

  useEffect(() => {
    if (!selectedBoardId) return;

    let cancelled = false;

    const refresh = async () => {
      if (cancelled) return;
      if (document.visibilityState !== "visible") return;
      await refreshActivity(false, lastSeenTimestamp);
    };

    void refreshActivity(false, lastSeenTimestamp);
    const intervalId = window.setInterval(refresh, 45_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [selectedBoardId, lastSeenTimestamp, refreshActivity]);

  useEffect(() => {
    if (!selectedBoardId || !activityOpen) return;
    void refreshActivity(true, lastSeenTimestamp);
  }, [selectedBoardId, activityOpen, refreshActivity, lastSeenTimestamp]);

  const clearAll = useCallback(() => {
    const allIds = activity.map((item) => item.id);
    markAsSeen(allIds);
    setActivity([]);
  }, [activity, markAsSeen]);

  const removeActivityAndMarkSeen = useCallback(
    (id: string) => {
      markAsSeen([id]);
      setActivity((prev) => prev.filter((entry) => entry.id !== id));
    },
    [markAsSeen]
  );

  return {
    activityOpen,
    setActivityOpen,
    activity,
    activityLoading,
    unreadActivityIds,
    clearAll,
    removeActivityAndMarkSeen,
  };
}
