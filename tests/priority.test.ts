import { describe, expect, it } from "vitest";
import { comparePriority, priorityBadge } from "@/app/portal/_utils/priority";

describe("priority utils", () => {
  it("keeps no-priority at bottom for ascending", () => {
    const values = [0, 2, 4, 1, 3];
    const sorted = [...values].sort((a, b) => comparePriority(a, b, "asc"));
    expect(sorted).toEqual([1, 2, 3, 4, 0]);
  });

  it("returns expected badge labels", () => {
    expect(priorityBadge(0).label).toBe("No priority");
    expect(priorityBadge(1).label).toBe("Urgent");
    expect(priorityBadge(2).label).toBe("High");
    expect(priorityBadge(3).label).toBe("Medium");
    expect(priorityBadge(4).label).toBe("Low");
  });
});
