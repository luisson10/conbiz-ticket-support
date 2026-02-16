import type { WorkflowStateDto } from "@/lib/contracts/portal";

const PHASE_ORDER: Record<string, number> = {
  nuevo: 0,
  planned: 1,
  planeado: 1,
  "en progreso": 2,
  "in progress": 2,
  escalado: 3,
  resuelto: 4,
  cerrado: 5,
  cancelado: 6,
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function orderWorkflowStates(states: WorkflowStateDto[]): WorkflowStateDto[] {
  return [...states].sort((a, b) => {
    const rankA = PHASE_ORDER[normalize(a.name)];
    const rankB = PHASE_ORDER[normalize(b.name)];
    const valueA = rankA === undefined ? 999 : rankA;
    const valueB = rankB === undefined ? 999 : rankB;

    if (valueA !== valueB) return valueA - valueB;
    return a.name.localeCompare(b.name);
  });
}
