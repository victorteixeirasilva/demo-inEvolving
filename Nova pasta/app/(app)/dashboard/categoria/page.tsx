"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  QueueListIcon,
} from "@heroicons/react/24/outline";
import { GlassCard } from "@/components/ui/GlassCard";
import { StaggerList } from "@/features/animations/StaggerList";
import { STORAGE_KEYS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Category, Objective } from "@/lib/types/models";

/* ─── Circular progress (SVG) ─── */
function CircularProgress({ pct }: { pct: number }) {
  const r = 26;
  const stroke = 5;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 1));
  const size = (r + stroke) * 2;

  const color =
    pct >= 1 ? "#34d399" : pct >= 0.5 ? "#00BCD4" : pct > 0 ? "#1976D2" : "#94a3b8";

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90" aria-hidden>
      {/* trilha */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-[var(--glass-border)]"
      />
      {/* progresso */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.16,1,0.3,1)" }}
      />
    </svg>
  );
}

/* ─── Análise de rendimento do objetivo ─── */
function ObjectiveAnalysis({ o }: { o: Objective }) {
  const total = o.totNumberTasks ?? 0;
  const done = o.numberTasksDone ?? 0;
  const inProgress = o.numberTasksInProgress ?? 0;
  const toDo = o.numberTasksToDo ?? 0;
  const overdue = o.numberTasksOverdue ?? 0;

  const pct = total > 0 ? done / total : o.statusObjective === "DONE" ? 1 : 0;
  const pctLabel = `${Math.round(pct * 100)}%`;

  const stats = [
    {
      label: "Concluídas",
      value: done,
      icon: CheckCircleIcon,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
    {
      label: "Em andamento",
      value: inProgress,
      icon: ClockIcon,
      color: "text-brand-cyan",
      bg: "bg-brand-cyan/10",
    },
    {
      label: "A fazer",
      value: toDo,
      icon: QueueListIcon,
      color: "text-brand-blue",
      bg: "bg-brand-blue/10",
    },
    ...(overdue > 0
      ? [
          {
            label: "Atrasadas",
            value: overdue,
            icon: ExclamationTriangleIcon,
            color: "text-brand-pink",
            bg: "bg-brand-pink/10",
          },
        ]
      : []),
  ];

  return (
    <div className="mt-4 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3">
      {/* progresso geral */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center">
          <CircularProgress pct={pct} />
          <span
            className={cn(
              "absolute text-[11px] font-bold tabular-nums",
              pct >= 1 ? "text-emerald-400" : "text-[var(--text-primary)]"
            )}
            style={{ transform: "rotate(90deg)" }}
          >
            {pctLabel}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[var(--text-primary)]">
            {pct >= 1
              ? "Objetivo concluído!"
              : pct > 0
              ? "Em progresso"
              : "Não iniciado"}
          </p>
          {total > 0 && (
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {done} de {total} tarefa{total !== 1 ? "s" : ""} concluída{done !== 1 ? "s" : ""}
            </p>
          )}

          {/* barra de progresso segmentada */}
          {total > 0 && (
            <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-[var(--glass-border)]">
              {done > 0 && (
                <div
                  className="h-full bg-emerald-400 transition-all duration-700"
                  style={{ width: `${(done / total) * 100}%` }}
                />
              )}
              {inProgress > 0 && (
                <div
                  className="h-full bg-brand-cyan transition-all duration-700"
                  style={{ width: `${(inProgress / total) * 100}%` }}
                />
              )}
              {overdue > 0 && (
                <div
                  className="h-full bg-brand-pink transition-all duration-700"
                  style={{ width: `${(overdue / total) * 100}%` }}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* stats pills */}
      {total > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {stats.map((s) => (
            <div
              key={s.label}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold",
                s.bg,
                s.color
              )}
            >
              <s.icon className="h-3 w-3" aria-hidden />
              {s.value} {s.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Page ─── */
export default function CategoriaPage() {
  const router = useRouter();
  const [cat, setCat] = useState<Category | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.categoriaAtual);
      if (!raw) {
        router.replace("/dashboard");
        return;
      }
      setCat(JSON.parse(raw) as Category);
    } catch {
      router.replace("/dashboard");
    }
  }, [router]);

  if (!cat) {
    return (
      <div className="mx-auto max-w-3xl pt-4">
        <p className="text-[var(--text-muted)]">Carregando categoria…</p>
      </div>
    );
  }

  const openObjective = (o: Objective) => {
    try {
      localStorage.setItem(STORAGE_KEYS.objetivoAtual, JSON.stringify(o));
    } catch {
      /* ignore */
    }
    router.push("/dashboard/categoria/objetivo");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pt-4 md:pt-6">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-brand-cyan underline-offset-4 transition-colors hover:underline"
        >
          ← Voltar ao dashboard
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">
          {cat.categoryName}
        </h1>
        {cat.categoryDescription && (
          <p className="mt-2 text-[var(--text-muted)]">{cat.categoryDescription}</p>
        )}
      </div>

      {cat.objectives.length === 0 && (
        <GlassCard>
          <p className="text-center text-sm text-[var(--text-muted)]">
            Nenhum objetivo vinculado a esta categoria.
          </p>
        </GlassCard>
      )}

      <StaggerList className="grid gap-4 md:grid-cols-2">
        {cat.objectives.map((o) => (
          <GlassCard key={o.id} className="flex flex-col">
            {/* cabeçalho */}
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] leading-snug">
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

            {/* análise de rendimento */}
            <ObjectiveAnalysis o={o} />

            {/* ação */}
            <button
              type="button"
              onClick={() => openObjective(o)}
              className="tap-target mt-4 w-full rounded-xl bg-brand-blue/15 py-3 text-sm font-semibold text-brand-cyan transition-all duration-[380ms] hover:shadow-glow"
            >
              Ver análises completas
            </button>
          </GlassCard>
        ))}
      </StaggerList>
    </div>
  );
}
