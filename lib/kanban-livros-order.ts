import { STORAGE_KEYS } from "@/lib/constants";
import type { Livro, LivroStatus } from "@/lib/types/models";

const COLS: LivroStatus[] = ["PENDENTE_LEITURA", "LENDO", "LEITURA_FINALIZADA"];

export function emptyLivrosKanbanOrder(): Record<LivroStatus, number[]> {
  return {
    PENDENTE_LEITURA: [],
    LENDO: [],
    LEITURA_FINALIZADA: [],
  };
}

export function loadLivrosKanbanOrder(): Record<LivroStatus, number[]> {
  if (typeof window === "undefined") return emptyLivrosKanbanOrder();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.livrosKanbanOrder);
    if (!raw) return emptyLivrosKanbanOrder();
    const parsed = JSON.parse(raw) as Partial<Record<string, unknown>>;
    const result = emptyLivrosKanbanOrder();
    for (const s of COLS) {
      const arr = parsed[s];
      result[s] = Array.isArray(arr)
        ? arr.map((x) => Number(x)).filter((n) => Number.isFinite(n))
        : [];
    }
    return result;
  } catch {
    return emptyLivrosKanbanOrder();
  }
}

export function saveLivrosKanbanOrder(order: Record<LivroStatus, number[]>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.livrosKanbanOrder, JSON.stringify(order));
  } catch {
    /* ignore */
  }
}

export function reconcileLivrosOrderWithBooks(
  order: Record<LivroStatus, number[]>,
  books: Pick<Livro, "id" | "status">[]
): Record<LivroStatus, number[]> {
  const next = emptyLivrosKanbanOrder();
  for (const status of COLS) {
    const validIds = new Set(books.filter((b) => b.status === status).map((b) => b.id));
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

export function orderedLivrosForStatus(
  status: LivroStatus,
  books: Livro[],
  order: Record<LivroStatus, number[]>
): Livro[] {
  const inColumn = books.filter((b) => b.status === status);
  const byId = new Map(inColumn.map((b) => [b.id, b]));
  const ids = order[status] ?? [];
  const out: Livro[] = [];
  for (const id of ids) {
    const b = byId.get(id);
    if (b) out.push(b);
  }
  if (out.length === 0 && inColumn.length > 0) {
    return [...inColumn].sort((a, b) => a.id - b.id);
  }
  return out;
}
