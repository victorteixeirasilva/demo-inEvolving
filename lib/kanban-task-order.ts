import { STORAGE_KEYS } from "@/lib/constants";
import type { Tarefa, TarefaStatus } from "@/lib/types/models";

const COLS: TarefaStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "DONE",
  "OVERDUE",
  "CANCELLED",
];

export function emptyKanbanOrder(): Record<TarefaStatus, number[]> {
  return {
    PENDING: [],
    IN_PROGRESS: [],
    DONE: [],
    OVERDUE: [],
    CANCELLED: [],
  };
}

export function loadKanbanOrder(): Record<TarefaStatus, number[]> {
  if (typeof window === "undefined") return emptyKanbanOrder();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.tarefasKanbanOrder);
    if (!raw) return emptyKanbanOrder();
    const parsed = JSON.parse(raw) as Partial<Record<string, unknown>>;
    const result = emptyKanbanOrder();
    for (const s of COLS) {
      const arr = parsed[s];
      result[s] = Array.isArray(arr)
        ? arr.map((x) => Number(x)).filter((n) => Number.isFinite(n))
        : [];
    }
    return result;
  } catch {
    return emptyKanbanOrder();
  }
}

export function saveKanbanOrder(order: Record<TarefaStatus, number[]>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.tarefasKanbanOrder, JSON.stringify(order));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Mantém a ordem salva para ids ainda na coluna; ids novos entram ao final (estável por id). */
export function reconcileOrderWithTasks(
  order: Record<TarefaStatus, number[]>,
  tasks: Pick<Tarefa, "id" | "status">[]
): Record<TarefaStatus, number[]> {
  const next = emptyKanbanOrder();
  for (const status of COLS) {
    const validIds = new Set(
      tasks.filter((t) => t.status === status).map((t) => t.id)
    );
    const prev = order[status] ?? [];
    const merged: number[] = [];
    for (const id of prev) {
      if (validIds.has(id)) {
        merged.push(id);
        validIds.delete(id);
      }
    }
    const rest = Array.from(validIds).sort((a, b) => a - b);
    next[status] = [...merged, ...rest];
  }
  return next;
}

export function orderedTasksForStatus(
  status: TarefaStatus,
  tasks: Tarefa[],
  order: Record<TarefaStatus, number[]>
): Tarefa[] {
  const inColumn = tasks.filter((t) => t.status === status);
  const byId = new Map(inColumn.map((t) => [t.id, t]));
  const ids = order[status] ?? [];
  const out: Tarefa[] = [];
  for (const id of ids) {
    const t = byId.get(id);
    if (t) out.push(t);
  }
  if (out.length === 0 && inColumn.length > 0) {
    return [...inColumn].sort((a, b) => a.id - b.id);
  }
  return out;
}
