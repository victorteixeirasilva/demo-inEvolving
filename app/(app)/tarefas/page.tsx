"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  PlusCircleIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowsUpDownIcon,
  FunnelIcon,
  Squares2X2Icon,
  FlagIcon,
  TagIcon,
  ViewColumnsIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { FadeInView } from "@/components/layout/ScrollReveal";
import { NovaTarefaModal } from "@/components/features/tarefas/NovaTarefaModal";
import { EditarTarefaModal } from "@/components/features/tarefas/EditarTarefaModal";
import { KanbanBoard } from "@/components/features/tarefas/KanbanBoard";
import { CancelarTarefaModal } from "@/components/features/tarefas/CancelarTarefaModal";
import { DateField } from "@/components/ui/DateField";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { allObjectives, mockDashboard, mockTarefas } from "@/lib/mock-data";
import { recordCancellationReasons } from "@/lib/cancel-reasons-storage";
import { loadAcceptedSharedCategories } from "@/lib/category-share-storage";
import { STORAGE_KEYS } from "@/lib/constants";
import { loadAjustesProfile } from "@/lib/ajustes-storage";
import {
  loadCollaborativeTasksForViewer,
  tryMirrorNewOwnerTaskToCollaborativeStore,
  updateCollaborativeTask,
} from "@/lib/shared-category-tasks-storage";
import { getObjectivesForSharedCollaborativeTask } from "@/lib/shared-task-objectives";
import { cn } from "@/lib/utils";
import type { Category, Objective, ResponseDashboard, Tarefa, TarefaStatus } from "@/lib/types/models";

/* ─── helpers ─── */
const today = new Date().toISOString().slice(0, 10);

const STATUS_META_PAGE: Record<TarefaStatus, { label: string; color: string; bg: string }> = {
  PENDING:     { label: "Pendente",     color: "text-brand-blue",         bg: "bg-brand-blue/10"    },
  IN_PROGRESS: { label: "Em andamento", color: "text-brand-cyan",         bg: "bg-brand-cyan/10"    },
  DONE:        { label: "Concluída",    color: "text-emerald-400",        bg: "bg-emerald-400/10"   },
  OVERDUE:     { label: "Atrasada",     color: "text-brand-pink",         bg: "bg-brand-pink/10"    },
  CANCELLED:   { label: "Cancelada",    color: "text-[var(--text-muted)]",bg: "bg-[var(--glass-bg)]"},
};

type View = "kanban" | "overdue" | "search";
type SortOverdue = "custom" | "name-asc" | "name-desc" | "date-asc" | "date-desc";

/** Escopo do quadro Kanban na aba Hoje */
type KanbanScope = "today" | "date" | "objective" | "category";

/* ─── Overdue list row ─── */
function viewerEmailTarefas(): string {
  const p = loadAjustesProfile().email.trim().toLowerCase();
  try {
    const login = String(localStorage.getItem(STORAGE_KEYS.email) ?? "").trim().toLowerCase();
    return p || login;
  } catch {
    return p;
  }
}

function mergeBaseWithCollaborative(base: Tarefa[]): Tarefa[] {
  const em = viewerEmailTarefas();
  const collab = loadCollaborativeTasksForViewer(em);
  const byId = new Map<number, Tarefa>();
  for (const t of base) byId.set(t.id, t);
  for (const t of collab) byId.set(t.id, t);
  return Array.from(byId.values());
}

function OverdueRow({ task, onEdit }: { task: Tarefa; onEdit: (t: Tarefa) => void }) {
  const daysLate = Math.max(
    0,
    Math.floor((Date.now() - new Date(task.dateTask + "T12:00:00").getTime()) / 86_400_000)
  );
  return (
    <button
      type="button"
      onClick={() => onEdit(task)}
      className="group flex w-full items-start gap-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 text-left transition-all duration-200 hover:border-brand-pink/40 hover:shadow-[0_0_0_1px_rgba(255,0,110,0.2)]"
    >
      <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-pink" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-[var(--text-primary)] group-hover:text-brand-pink transition-colors">{task.nameTask}</p>
        {task.descriptionTask && (
          <p className="mt-0.5 truncate text-sm text-[var(--text-muted)]">{task.descriptionTask}</p>
        )}
        {task.sharedTask && (
          <p className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-brand-cyan">
            <UserGroupIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>Compartilhada</span>
            <span className="text-[var(--text-muted)]">·</span>
            <span className="truncate text-[var(--text-muted)]">
              Por {task.sharedTask.createdByName?.trim() || task.sharedTask.createdByEmail}
            </span>
          </p>
        )}
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
          <span>Prevista: {new Date(task.dateTask + "T12:00:00").toLocaleDateString("pt-BR")}</span>
          {task.isRecurring && <span className="text-brand-pink">recorrente</span>}
        </div>
      </div>
      <span className="shrink-0 rounded-lg bg-brand-pink/15 px-2 py-1 text-xs font-bold text-brand-pink">
        {daysLate}d atraso
      </span>
    </button>
  );
}

/* ─── Page ─── */
export default function TarefasPage() {
  const [tasks, setTasks] = useState<Tarefa[]>([]);
  const [view, setView] = useState<View>("kanban");
  const [showCreate, setShowCreate] = useState(false);
  const [editingTask, setEditingTask] = useState<Tarefa | null>(null);
  const [sortOverdue, setSortOverdue] = useState<SortOverdue>("custom");
  const [searchQuery, setSearchQuery] = useState("");
  const [cancelPendingId, setCancelPendingId] = useState<number | null>(null);

  const [kanbanScope, setKanbanScope] = useState<KanbanScope>("today");
  const [scopeDate, setScopeDate] = useState(today);
  const [scopeObjectiveId, setScopeObjectiveId] = useState(0);
  const [scopeCategoryId, setScopeCategoryId] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const tasksRef = useRef<Tarefa[]>([]);
  tasksRef.current = tasks;

  /* load */
  useEffect(() => {
    fetch("/api/mock/tarefas")
      .then((r) => r.json())
      .then((d: Tarefa[]) => setTasks(mergeBaseWithCollaborative(d)))
      .catch(() => setTasks(mergeBaseWithCollaborative(mockTarefas)));
  }, []);

  useEffect(() => {
    const onCollabTasks = () => {
      setTasks((prev) => {
        const base = prev.filter((t) => !t.sharedTask);
        return mergeBaseWithCollaborative(base);
      });
    };
    window.addEventListener("inevolving:shared-tasks-changed", onCollabTasks);
    return () => window.removeEventListener("inevolving:shared-tasks-changed", onCollabTasks);
  }, []);

  useEffect(() => {
    const refreshTasksMerge = () => {
      fetch("/api/mock/tarefas")
        .then((r) => r.json())
        .then((d: Tarefa[]) => setTasks(mergeBaseWithCollaborative(d)))
        .catch(() => setTasks(mergeBaseWithCollaborative(mockTarefas)));
    };
    window.addEventListener("inevolving:shared-categories-changed", refreshTasksMerge);
    return () => window.removeEventListener("inevolving:shared-categories-changed", refreshTasksMerge);
  }, []);

  const refreshCategories = useCallback(() => {
    fetch("/api/mock/dashboard")
      .then((r) => r.json())
      .then((d: ResponseDashboard) => {
        const base = d.categoryDTOList ?? [];
        const shared = loadAcceptedSharedCategories().map((x) => x.category);
        setCategories([...base, ...shared]);
      })
      .catch(() => {
        const shared = loadAcceptedSharedCategories().map((x) => x.category);
        setCategories([...mockDashboard.categoryDTOList, ...shared]);
      });
  }, []);

  useEffect(() => {
    refreshCategories();
  }, [refreshCategories]);

  useEffect(() => {
    const onSharedChanged = () => refreshCategories();
    window.addEventListener("inevolving:shared-categories-changed", onSharedChanged);
    return () => window.removeEventListener("inevolving:shared-categories-changed", onSharedChanged);
  }, [refreshCategories]);

  useEffect(() => {
    fetch("/api/mock/objetivos")
      .then((r) => r.json())
      .then((d: Objective[]) => setObjectives(d))
      .catch(() => setObjectives(allObjectives));
  }, []);

  const applyStatusChange = async (
    id: number,
    status: TarefaStatus,
    cancellationReason?: string
  ) => {
    const current = tasksRef.current.find((x) => x.id === id);
    if (current?.sharedTask) {
      const updated = updateCollaborativeTask(id, {
        status,
        ...(status === "CANCELLED" && cancellationReason !== undefined && cancellationReason !== ""
          ? { cancellationReason }
          : {}),
        ...(status !== "CANCELLED" ? { cancellationReason: undefined } : {}),
      });
      if (updated) {
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      }
      return;
    }

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next: Tarefa = { ...t, status };
        if (status === "CANCELLED" && cancellationReason !== undefined) {
          next.cancellationReason = cancellationReason;
        } else if (status !== "CANCELLED") {
          delete next.cancellationReason;
        }
        return next;
      })
    );
    try {
      await fetch(`/api/mock/tarefas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(status === "CANCELLED" && cancellationReason !== undefined && cancellationReason !== ""
            ? { cancellationReason }
            : {}),
        }),
      });
    } catch {
      /* silencioso */
    }
  };

  const changeStatus = (id: number, status: TarefaStatus) => {
    if (status === "CANCELLED") {
      setCancelPendingId(id);
      return;
    }
    void applyStatusChange(id, status);
  };

  const taskPendingCancel = cancelPendingId != null ? tasks.find((t) => t.id === cancelPendingId) : null;

  const objectivesForOwnerNova = useMemo(() => {
    const ids = new Set<number>();
    for (const c of categories) {
      if (c.sharedFrom) continue;
      c.objectives.forEach((o) => ids.add(o.id));
    }
    return objectives.filter((o) => ids.has(o.id));
  }, [categories, objectives]);

  const handleCreated = (task: Tarefa) => {
    const profile = loadAjustesProfile();
    const em = viewerEmailTarefas();
    const owned = categories
      .filter((c) => !c.sharedFrom)
      .map((c) => ({ id: c.id, objectives: c.objectives }));
    const mirrored = tryMirrorNewOwnerTaskToCollaborativeStore(task, em, profile.name, owned);
    if (mirrored) {
      setTasks((prev) => [mirrored, ...prev]);
      return;
    }
    setTasks((prev) => [task, ...prev]);
  };

  const handleSaved = (updated: Tarefa) =>
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));

  const handleDeletedTask = (taskId: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const editObjectiveOverride = useMemo((): Objective[] | undefined => {
    if (!editingTask?.sharedTask) return undefined;
    const obs = getObjectivesForSharedCollaborativeTask(editingTask, categories);
    if (obs && obs.length > 0) return obs;
    const one = objectives.find((o) => o.id === editingTask.idObjective);
    return one ? [one] : [];
  }, [editingTask, categories, objectives]);

  const objectiveIdsForCategory = useMemo(() => {
    const cat = categories.find((c) => c.id === scopeCategoryId);
    if (!cat) return new Set<number>();
    return new Set(cat.objectives.map((o) => o.id));
  }, [categories, scopeCategoryId]);

  const kanbanTasks = useMemo(() => {
    switch (kanbanScope) {
      case "today":
        return tasks.filter((t) => t.dateTask <= today);
      case "date":
        return tasks.filter((t) => t.dateTask === scopeDate);
      case "objective":
        if (!scopeObjectiveId) return [];
        return tasks.filter((t) => t.idObjective === scopeObjectiveId);
      case "category":
        if (!scopeCategoryId || objectiveIdsForCategory.size === 0) return [];
        return tasks.filter((t) => objectiveIdsForCategory.has(t.idObjective));
      default:
        return tasks.filter((t) => t.dateTask <= today);
    }
  }, [tasks, kanbanScope, scopeDate, scopeObjectiveId, scopeCategoryId, objectiveIdsForCategory]);

  const kanbanFilterHint = useMemo(() => {
    switch (kanbanScope) {
      case "today":
        return `Tarefas com data até hoje (${new Date(today + "T12:00:00").toLocaleDateString("pt-BR")})`;
      case "date":
        return `Tarefas na data ${new Date(scopeDate + "T12:00:00").toLocaleDateString("pt-BR")}`;
      case "objective": {
        const o = objectives.find((x) => x.id === scopeObjectiveId);
        return scopeObjectiveId && o
          ? `Todas as tarefas do objetivo «${o.nameObjective}»`
          : "Selecione um objetivo para listar as tarefas";
      }
      case "category": {
        const c = categories.find((x) => x.id === scopeCategoryId);
        return scopeCategoryId && c
          ? `Todas as tarefas da categoria «${c.categoryName}»`
          : "Selecione uma categoria para listar as tarefas";
      }
      default:
        return "";
    }
  }, [kanbanScope, today, scopeDate, scopeObjectiveId, scopeCategoryId, objectives, categories]);

  const scopeTabs: { key: KanbanScope; label: string; icon: React.ElementType }[] = [
    { key: "today", label: "Hoje", icon: CalendarDaysIcon },
    { key: "date", label: "Por data", icon: CalendarDaysIcon },
    { key: "objective", label: "Por objetivo", icon: FlagIcon },
    { key: "category", label: "Por categoria", icon: Squares2X2Icon },
  ];

  /* overdue tasks */
  const overdueTasks = useMemo(() => {
    const base = tasks.filter((t) => t.status === "OVERDUE");
    switch (sortOverdue) {
      case "name-asc":  return [...base].sort((a, b) => a.nameTask.localeCompare(b.nameTask));
      case "name-desc": return [...base].sort((a, b) => b.nameTask.localeCompare(a.nameTask));
      case "date-asc":  return [...base].sort((a, b) => a.dateTask.localeCompare(b.dateTask));
      case "date-desc": return [...base].sort((a, b) => b.dateTask.localeCompare(a.dateTask));
      default:          return base;
    }
  }, [tasks, sortOverdue]);

  /* search */
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return tasks.filter((t) => t.uuid.toLowerCase().includes(q));
  }, [tasks, searchQuery]);

  const viewTabs: { key: View; label: string; icon: React.ElementType }[] = [
    { key: "kanban",  label: "Quadro",    icon: ViewColumnsIcon },
    { key: "overdue", label: "Atrasadas", icon: ExclamationTriangleIcon },
    { key: "search",  label: "Buscar",    icon: MagnifyingGlassIcon },
  ];

  return (
    <>
      <NovaTarefaModal
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={handleCreated}
        objectivesForSelect={objectivesForOwnerNova}
        contextSubtitle={
          objectivesForOwnerNova.length === 0
            ? "Você só pode criar tarefas aqui para objetivos das suas categorias próprias. Para categorias compartilhadas, use a página da categoria (Dashboard → Ver detalhes)."
            : "Apenas objetivos das suas categorias próprias. Tarefas em categorias que você compartilhou também ficam visíveis aos convidados."
        }
      />
      <EditarTarefaModal
        open={editingTask !== null}
        task={editingTask}
        onOpenChange={(open) => {
          if (!open) setEditingTask(null);
        }}
        onSaved={handleSaved}
        objectiveOptionsOverride={editObjectiveOverride}
        viewerEmail={viewerEmailTarefas()}
        onDeleted={handleDeletedTask}
      />

      <CancelarTarefaModal
        open={taskPendingCancel != null}
        onOpenChange={(open) => {
          if (!open) setCancelPendingId(null);
        }}
        taskName={taskPendingCancel?.nameTask ?? ""}
        idObjective={taskPendingCancel?.idObjective ?? 0}
        onConfirm={(reasonsRaw) => {
          if (taskPendingCancel == null) return;
          recordCancellationReasons(taskPendingCancel.idObjective, reasonsRaw);
          void applyStatusChange(taskPendingCancel.id, "CANCELLED", reasonsRaw);
          setCancelPendingId(null);
        }}
      />

      <div className="mx-auto max-w-7xl space-y-5 pt-4 md:pt-6">
        {/* ── Cabeçalho ── */}
        <FadeInView>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Tarefas</h1>
              {/* <p className="mt-1 text-sm text-[var(--text-muted)]">
                Mock —{" "}
                <code className="rounded bg-black/5 px-1 text-xs dark:bg-white/10">GET /auth/api/tasks/{"{data}"}</code>
              </p> */}
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-cyan px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition-all duration-[380ms] hover:shadow-glass-lg active:scale-95 dark:from-brand-purple dark:to-brand-pink"
            >
              <PlusCircleIcon className="h-5 w-5" aria-hidden />
              Nova tarefa
            </button>
          </div>
        </FadeInView>

        {/* ── Tabs de view ── */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {viewTabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-300",
                view === key
                  ? "bg-gradient-to-r from-brand-blue to-brand-cyan text-white shadow-glow dark:from-brand-purple dark:to-brand-pink"
                  : "border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-muted)] hover:border-brand-cyan/40 hover:text-[var(--text-primary)]"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
              {key === "overdue" && overdueTasks.length > 0 && (
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] font-bold",
                  view === key ? "bg-white/20 text-white" : "bg-brand-pink/20 text-brand-pink"
                )}>
                  {overdueTasks.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ══════════ KANBAN ══════════ */}
          {view === "kanban" && (
            <motion.div
              key="kanban"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)]/80 p-4 backdrop-blur-glass">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <FunnelIcon className="h-4 w-4 shrink-0 text-brand-cyan" aria-hidden />
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Filtro do quadro
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {scopeTabs.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setKanbanScope(key);
                        if (key === "date" && !scopeDate) setScopeDate(today);
                      }}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all duration-200",
                        kanbanScope === key
                          ? "bg-gradient-to-r from-brand-blue to-brand-cyan text-white shadow-glow dark:from-brand-purple dark:to-brand-pink"
                          : "border border-[var(--glass-border)] text-[var(--text-muted)] hover:border-brand-cyan/40 hover:text-[var(--text-primary)]"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                      {label}
                    </button>
                  ))}
                </div>

                {kanbanScope === "date" && (
                  <div className="mt-4 max-w-xs">
                    <label htmlFor="kanban-scope-date" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                      Data das tarefas
                    </label>
                    <DateField
                      id="kanban-scope-date"
                      value={scopeDate}
                      onChange={(e) => setScopeDate(e.target.value)}
                    />
                  </div>
                )}

                {kanbanScope === "objective" && (
                  <div className="mt-4 max-w-md">
                    <label htmlFor="kanban-scope-obj" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                      Objetivo
                    </label>
                    <GlassSelect
                      id="kanban-scope-obj"
                      value={scopeObjectiveId ? String(scopeObjectiveId) : ""}
                      onChange={(e) =>
                        setScopeObjectiveId(e.target.value === "" ? 0 : Number(e.target.value))
                      }
                    >
                      <option value="">Selecione um objetivo…</option>
                      {objectives.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.nameObjective}
                        </option>
                      ))}
                    </GlassSelect>
                  </div>
                )}

                {kanbanScope === "category" && (
                  <div className="mt-4 max-w-md">
                    <label htmlFor="kanban-scope-cat" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                      Categoria
                    </label>
                    <GlassSelect
                      id="kanban-scope-cat"
                      value={scopeCategoryId ? String(scopeCategoryId) : ""}
                      onChange={(e) =>
                        setScopeCategoryId(e.target.value === "" ? 0 : Number(e.target.value))
                      }
                    >
                      <option value="">Selecione uma categoria…</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.categoryName}
                        </option>
                      ))}
                    </GlassSelect>
                  </div>
                )}

                <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                  <TagIcon className="h-3.5 w-3.5 shrink-0 text-brand-cyan/80" aria-hidden />
                  {kanbanFilterHint}
                  <span className="ml-auto font-mono text-[var(--text-primary)]">
                    {kanbanTasks.length} tarefa(s)
                  </span>
                </p>
              </div>

              <KanbanBoard
                tasks={kanbanTasks}
                onStatusChange={changeStatus}
                onEdit={setEditingTask}
              />
            </motion.div>
          )}

          {/* ══════════ ATRASADAS ══════════ */}
          {view === "overdue" && (
            <motion.div
              key="overdue"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* ordenação */}
              <div className="flex flex-wrap items-center gap-2">
                <ArrowsUpDownIcon className="h-4 w-4 text-[var(--text-muted)]" aria-hidden />
                <span className="text-xs font-medium text-[var(--text-muted)]">Ordenar:</span>
                {(
                  [
                    { v: "custom"    as SortOverdue, l: "Padrão"      },
                    { v: "name-asc"  as SortOverdue, l: "Nome A→Z"    },
                    { v: "name-desc" as SortOverdue, l: "Nome Z→A"    },
                    { v: "date-asc"  as SortOverdue, l: "Data (mais antiga)" },
                    { v: "date-desc" as SortOverdue, l: "Data (mais recente)" },
                  ] as const
                ).map(({ v, l }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setSortOverdue(v)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                      sortOverdue === v
                        ? "bg-brand-pink/20 text-brand-pink"
                        : "border border-[var(--glass-border)] text-[var(--text-muted)] hover:border-brand-pink/30 hover:text-brand-pink"
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>

              {overdueTasks.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-emerald-400/30 py-14 text-center">
                  <CheckCircleIcon className="h-10 w-10 text-emerald-400/60" aria-hidden />
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Nenhuma tarefa atrasada!</p>
                  <p className="text-xs text-[var(--text-muted)]">Você está em dia com todas as tarefas.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <AnimatePresence initial={false}>
                    {overdueTasks.map((t) => (
                      <motion.div
                        key={t.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 6 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <OverdueRow task={t} onEdit={setEditingTask} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}

          {/* ══════════ BUSCAR ══════════ */}
          {view === "search" && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* input de busca */}
              <div className="flex items-center gap-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 transition-[box-shadow,border-color] duration-[380ms] focus-within:border-brand-cyan focus-within:shadow-[0_0_0_3px_rgba(0,188,212,0.2)]">
                <MagnifyingGlassIcon className="h-5 w-5 shrink-0 text-[var(--text-muted)]" aria-hidden />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Digite o UUID da tarefa…"
                  className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <XCircleIcon className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>

              {/* resultados */}
              {!searchQuery && (
                <p className="text-center text-sm text-[var(--text-muted)]">
                  Digite um UUID para localizar a tarefa.
                </p>
              )}

              {searchQuery && searchResults.length === 0 && (
                <p className="text-center text-sm text-[var(--text-muted)]">
                  Nenhuma tarefa encontrada para{" "}
                  <code className="rounded bg-black/5 px-1 dark:bg-white/10">{searchQuery}</code>.
                </p>
              )}

              {searchResults.length > 0 && (
                <div className="flex flex-col gap-3">
                  {searchResults.map((t) => {
                    const meta = STATUS_META_PAGE[t.status];
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setEditingTask(t)}
                        className="flex w-full flex-col gap-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 text-left transition-all duration-200 hover:border-brand-cyan/40"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h2 className="font-semibold text-[var(--text-primary)]">{t.nameTask}</h2>
                          <span className={cn("rounded-lg px-2 py-0.5 text-[11px] font-bold", meta.bg, meta.color)}>
                            {meta.label}
                          </span>
                        </div>
                        {t.descriptionTask && (
                          <p className="text-sm text-[var(--text-muted)]">{t.descriptionTask}</p>
                        )}
                        <p className="font-mono text-xs text-[var(--text-muted)]">
                          UUID: <span className="text-brand-cyan">{t.uuid}</span>
                        </p>
                        <div className="flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
                          <span>Data: {new Date(t.dateTask + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                          {t.isRecurring && (
                            <span className="flex items-center gap-1 text-brand-purple dark:text-brand-pink">
                              <ArrowPathIcon className="h-3 w-3" aria-hidden />
                              recorrente
                            </span>
                          )}
                        </div>
                        </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
