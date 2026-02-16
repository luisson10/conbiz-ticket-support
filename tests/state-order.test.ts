import { describe, expect, it } from "vitest";
import { orderWorkflowStates } from "@/app/portal/_utils/state-order";

const baseState = {
  type: "backlog",
  color: "#000000",
};

describe("orderWorkflowStates", () => {
  it("orders known workflow phases consistently", () => {
    const result = orderWorkflowStates([
      { id: "6", name: "Cancelado", ...baseState },
      { id: "1", name: "Nuevo", ...baseState },
      { id: "4", name: "Escalado", ...baseState },
      { id: "2", name: "Planeado", ...baseState },
      { id: "5", name: "Resuelto", ...baseState },
      { id: "3", name: "En progreso", ...baseState },
    ]);

    expect(result.map((state) => state.name)).toEqual([
      "Nuevo",
      "Planeado",
      "En progreso",
      "Escalado",
      "Resuelto",
      "Cancelado",
    ]);
  });
});
