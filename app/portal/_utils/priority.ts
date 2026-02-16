import { AlertTriangle, SignalHigh, SignalLow, SignalMedium, type LucideIcon } from "lucide-react";

export type PriorityBadge = {
  label: string;
  icon: LucideIcon | null;
};

export function priorityBadge(priority?: number | null): PriorityBadge {
  if (!priority || priority <= 0) {
    return { label: "No priority", icon: null };
  }
  if (priority === 1) return { label: "Urgent", icon: AlertTriangle };
  if (priority === 2) return { label: "High", icon: SignalHigh };
  if (priority === 3) return { label: "Medium", icon: SignalMedium };
  return { label: "Low", icon: SignalLow };
}

export function comparePriority(
  a: number | null | undefined,
  b: number | null | undefined,
  direction: "asc" | "desc"
): number {
  const pa = a ?? 0;
  const pb = b ?? 0;

  if (direction === "asc") {
    // No priority must stay at the bottom for ascending order.
    if (pa === 0 && pb === 0) return 0;
    if (pa === 0) return 1;
    if (pb === 0) return -1;
    return pa - pb;
  }

  return pb - pa;
}
