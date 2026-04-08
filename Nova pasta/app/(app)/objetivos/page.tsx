"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PlusCircleIcon } from "@heroicons/react/24/outline";
import { GlassCard } from "@/components/ui/GlassCard";
import { StaggerList } from "@/features/animations/StaggerList";
import { FadeInView } from "@/components/layout/ScrollReveal";
import { NovoObjetivoModal } from "@/components/features/objetivos/NovoObjetivoModal";
import { EditarObjetivoModal } from "@/components/features/objetivos/EditarObjetivoModal";
import { allObjectives as initialPool, mockDashboard } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { Objective } from "@/lib/types/models";

type Filter = "IN_PROGRESS" | "DONE" | "ALL";

type ObjectiveWithCategory = Objective & { categoryName: string };

function buildBaseList(): ObjectiveWithCategory[] {
  return mockDashboard.categoryDTOList.flatMap((c) =>
    c.objectives.map((o) => ({ ...o, categoryName: c.categoryName }))
  );
}

const FILTERS: { value: Filter; label: string }[] = [
  { value: "IN_PROGRESS", label: "Em andamento" },
  { value: "DONE", label: "Concluídos" },
  { value: "ALL", label: "Todos" },
];

export default function ObjetivosPage() {
  const [list, setList] = useState<ObjectiveWithCategory[]>(buildBaseList);
  const [filter, setFilter] = useState<Filter>("IN_PROGRESS");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<ObjectiveWithCategory | null>(null);

  const filtered = filter === "ALL" ? list : list.filter((o) => o.statusObjective === filter);

  const handleCreated = (obj: Objective) =>
    setList((prev) => [{ ...obj, categoryName: "Sem categoria" }, ...prev]);

  const handleSaved = (
    updated: Pick<Objective, "id" | "nameObjective" | "descriptionObjective" | "statusObjective">
  ) =>
    setList((prev) =>
      prev.map((o) =>
        o.id === updated.id
          ? { ...o, ...updated }
          : o
      )
    );

  return (
    <>
      <NovoObjetivoModal
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={handleCreated}
      />
      <EditarObjetivoModal
        open={editing !== null}
        objective={editing}
        onOpenChange={(open) => { if (!open) setEditing(null); }}
        onSaved={handleSaved}
      />

      <div className="mx-auto max-w-5xl space-y-6 pt-4 md:pt-6">
        {/* ── Cabeçalho ── */}
        <FadeInView>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Objetivos</h1>
              {/* <p className="mt-1 text-sm text-[var(--text-muted)]">
                Lista mock —{" "}
                <code className="rounded bg-black/5 px-1 text-xs dark:bg-white/10">
                  /auth/api/objectives/user
                </code>
              </p> */}
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-cyan px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition-all duration-[380ms] hover:shadow-glass-lg active:scale-95 dark:from-brand-purple dark:to-brand-pink"
            >
              <PlusCircleIcon className="h-5 w-5" aria-hidden />
              Novo objetivo
            </button>
          </div>
        </FadeInView>

        {/* ── Filtros ── */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-300",
                filter === value
                  ? "bg-gradient-to-r from-brand-blue to-brand-cyan text-white shadow-glow dark:from-brand-purple dark:to-brand-pink"
                  : "border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-muted)] hover:border-brand-cyan/40 hover:text-[var(--text-primary)]"
              )}
            >
              {label}
              {/* contador */}
              <span
                className={cn(
                  "ml-2 rounded-full px-1.5 py-0.5 text-[11px] font-bold",
                  filter === value
                    ? "bg-white/20 text-white"
                    : "bg-[var(--glass-border)] text-[var(--text-muted)]"
                )}
              >
                {value === "ALL"
                  ? list.length
                  : list.filter((o) => o.statusObjective === value).length}
              </span>
            </button>
          ))}
        </div>

        {/* ── Lista ── */}
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <GlassCard className="border-dashed border-brand-cyan/25">
                <p className="py-6 text-center text-sm text-[var(--text-muted)]">
                  {filter === "IN_PROGRESS"
                    ? "Nenhum objetivo em andamento."
                    : filter === "DONE"
                    ? "Nenhum objetivo concluído ainda."
                    : "Nenhum objetivo cadastrado."}
                  {filter !== "ALL" && (
                    <button
                      type="button"
                      onClick={() => setFilter("ALL")}
                      className="ml-1 text-brand-cyan underline-offset-2 hover:underline"
                    >
                      Ver todos
                    </button>
                  )}
                </p>
              </GlassCard>
            </motion.div>
          ) : (
            <motion.div
              key={filter}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <StaggerList className="grid gap-4 md:grid-cols-2">
                {filtered.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setEditing(o)}
                    className="group h-full w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 rounded-2xl"
                    aria-label={`Editar objetivo: ${o.nameObjective}`}
                  >
                    <GlassCard className="flex h-full flex-col transition-all duration-[380ms] group-hover:border-brand-cyan/40 group-hover:shadow-glow">
                      {/* categoria */}
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-cyan">
                        {o.categoryName}
                      </p>

                      {/* nome + badge */}
                      <div className="mt-2 flex items-start justify-between gap-2">
                        <h2 className="text-lg font-semibold leading-snug text-[var(--text-primary)]">
                          {o.nameObjective}
                        </h2>
                        <span
                          className={cn(
                            "shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                            o.statusObjective === "DONE"
                              ? "bg-emerald-400/15 text-emerald-400"
                              : "bg-brand-cyan/15 text-brand-cyan"
                          )}
                        >
                          {o.statusObjective === "DONE" ? "Concluído" : "Em andamento"}
                        </span>
                      </div>

                      {o.descriptionObjective && (
                        <p className="mt-2 flex-1 text-sm text-[var(--text-muted)]">
                          {o.descriptionObjective}
                        </p>
                      )}

                      {/* barra de progresso */}
                      {(o.totNumberTasks ?? 0) > 0 && (
                        <div className="mt-4">
                          <div className="mb-1 flex items-center justify-between text-xs text-[var(--text-muted)]">
                            <span>
                              {o.numberTasksDone ?? 0} de {o.totNumberTasks} tarefas concluídas
                            </span>
                            <span className="font-semibold text-[var(--text-primary)]">
                              {Math.round(
                                ((o.numberTasksDone ?? 0) / (o.totNumberTasks ?? 1)) * 100
                              )}
                              %
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--glass-border)]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-cyan transition-all duration-700"
                              style={{
                                width: `${Math.round(
                                  ((o.numberTasksDone ?? 0) / (o.totNumberTasks ?? 1)) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* hint de edição */}
                      <p className="mt-3 text-[11px] text-[var(--text-muted)] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        Clique para editar
                      </p>
                    </GlassCard>
                  </button>
                ))}
              </StaggerList>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
