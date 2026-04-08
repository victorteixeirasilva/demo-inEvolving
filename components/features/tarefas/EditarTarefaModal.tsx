"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarDaysIcon, PlusCircleIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { DateField } from "@/components/ui/DateField";
import { RecurringTaskSwitch } from "@/components/ui/RecurringTaskSwitch";
import { EditarSubtarefaModal } from "@/components/features/tarefas/EditarSubtarefaModal";
import { SubtarefasKanbanBoard } from "@/components/features/tarefas/SubtarefasKanbanBoard";
import {
  getTopCancellationReasons,
  parseCancellationSegments,
  recordCancellationReasons,
} from "@/lib/cancel-reasons-storage";
import { buildGoogleCalendarEventEditUrl } from "@/lib/google-calendar-url";
import { migrateSubtasksFromParent, stripEmptySubtasks, syncSubtasksObjective } from "@/lib/subtarefas";
import { deleteCollaborativeTask, updateCollaborativeTask } from "@/lib/shared-category-tasks-storage";
import type { Objective, Tarefa, TarefaStatus, TarefaSubtarefa } from "@/lib/types/models";

const ease = [0.16, 1, 0.3, 1] as const;

const WEEK_DAYS = [
  { value: 0, label: "Dom" }, { value: 1, label: "Seg" },
  { value: 2, label: "Ter" }, { value: 3, label: "Qua" },
  { value: 4, label: "Qui" }, { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

const STATUS_OPTIONS: { value: TarefaStatus; label: string; color: string }[] = [
  { value: "PENDING",     label: "Pendente",      color: "text-brand-blue"         },
  { value: "IN_PROGRESS", label: "Em andamento",  color: "text-brand-cyan"         },
  { value: "DONE",        label: "Concluída",      color: "text-emerald-400"        },
  { value: "OVERDUE",     label: "Atrasada",       color: "text-brand-pink"         },
  { value: "CANCELLED",   label: "Cancelada",      color: "text-[var(--text-muted)]"},
];

const schema = z
  .object({
    nameTask: z.string().min(1, "Nome é obrigatório").max(100),
    descriptionTask: z.string().max(500).optional(),
    idObjective: z.coerce.number().min(1, "Selecione um objetivo"),
    dateTask: z.string().min(1, "Data é obrigatória"),
    status: z.enum(["PENDING", "IN_PROGRESS", "DONE", "OVERDUE", "CANCELLED"]),
    cancellationReason: z.string().optional(),
    isRecurring: z.boolean(),
    recurringDays: z.array(z.number()).optional(),
    recurringUntil: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isRecurring) {
      if (!data.recurringDays || data.recurringDays.length === 0)
        ctx.addIssue({ code: "custom", message: "Selecione ao menos um dia", path: ["recurringDays"] });
      if (!data.recurringUntil)
        ctx.addIssue({ code: "custom", message: "Informe a data final", path: ["recurringUntil"] });
    }
    if (data.status === "CANCELLED") {
      const segs = parseCancellationSegments(data.cancellationReason ?? "");
      if (segs.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Informe os motivos do cancelamento, separados por ;",
          path: ["cancellationReason"],
        });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

export type EditarTarefaModalProps = {
  open: boolean;
  task: Tarefa | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (updated: Tarefa) => void;
  /** Objetivos permitidos (tarefa colaborativa: só os da categoria compartilhada). `undefined` = todos (mock). */
  objectiveOptionsOverride?: Objective[];
  /** E-mail do usuário atual (excluir tarefa colaborativa só se for o autor). */
  viewerEmail?: string;
  onDeleted?: (taskId: number) => void;
};

export function EditarTarefaModal({
  open,
  task,
  onOpenChange,
  onSaved,
  objectiveOptionsOverride,
  viewerEmail,
  onDeleted,
}: EditarTarefaModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [topCancelReasons, setTopCancelReasons] = useState<{ reason: string; count: number }[]>([]);
  const [subtasksState, setSubtasksState] = useState<TarefaSubtarefa[]>([]);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [subModalMode, setSubModalMode] = useState<"create" | "edit">("create");
  const [subModalEditing, setSubModalEditing] = useState<TarefaSubtarefa | null>(null);
  const fetchedObjs = useRef(false);
  const subtasksSnapshotRef = useRef<string>("");

  const { register, handleSubmit, control, reset, watch, setValue, formState: { errors, isDirty } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        nameTask: "", descriptionTask: "", idObjective: 0,
        dateTask: "", status: "PENDING", cancellationReason: "", isRecurring: false,
        recurringDays: [], recurringUntil: "",
      },
    });

  const isRecurring = watch("isRecurring");
  const recurringDays = watch("recurringDays") ?? [];
  const watchStatus = watch("status");
  const watchObjective = watch("idObjective");
  const cancellationReasonVal = watch("cancellationReason") ?? "";
  const watchName = watch("nameTask");
  const watchDesc = watch("descriptionTask");
  const watchDate = watch("dateTask");

  useEffect(() => {
    if (!open) return;
    if (objectiveOptionsOverride !== undefined) {
      setObjectives(objectiveOptionsOverride);
      return;
    }
    if (fetchedObjs.current) return;
    fetchedObjs.current = true;
    fetch("/api/mock/objetivos")
      .then((r) => r.json())
      .then((d: Objective[]) => setObjectives(d))
      .catch(() => {});
  }, [open, objectiveOptionsOverride]);

  useEffect(() => {
    if (!open) { setApiError(null); return; }
    if (!task) return;
    reset({
      nameTask: task.nameTask,
      descriptionTask: task.descriptionTask ?? "",
      idObjective: task.idObjective,
      dateTask: task.dateTask,
      status: task.status,
      cancellationReason: task.cancellationReason ?? "",
      isRecurring: task.isRecurring ?? false,
      recurringDays: task.recurringDays ?? [],
      recurringUntil: task.recurringUntil ?? "",
    });
    const migrated = migrateSubtasksFromParent(task.subtasks, task);
    setSubtasksState(migrated);
    subtasksSnapshotRef.current = JSON.stringify(migrated);
    setApiError(null);
  }, [open, task, reset]);

  const subtasksDirty = JSON.stringify(subtasksState) !== subtasksSnapshotRef.current;

  useEffect(() => {
    if (!open || watchStatus !== "CANCELLED" || !watchObjective) {
      setTopCancelReasons([]);
      return;
    }
    setTopCancelReasons(getTopCancellationReasons(watchObjective));
  }, [open, watchStatus, watchObjective]);

  const appendCancelReason = (r: string) => {
    const seg = r.trim();
    if (!seg) return;
    const t = cancellationReasonVal.trim();
    setValue("cancellationReason", t ? `${t}; ${seg}` : seg, { shouldDirty: true, shouldValidate: true });
  };

  const toggleDay = (day: number) => {
    const cur = recurringDays;
    setValue("recurringDays", cur.includes(day) ? cur.filter(d => d !== day) : [...cur, day], { shouldDirty: true });
  };

  const googleAgendaUrl = buildGoogleCalendarEventEditUrl({
    text: watchName ?? "",
    details: watchDesc ?? "",
    date: watchDate ?? "",
  });

  const openGoogleAgenda = () => {
    if (!googleAgendaUrl) return;
    window.open(googleAgendaUrl, "_blank", "noopener,noreferrer");
  };

  const objectiveLabel =
    objectives.find((o) => o.id === watchObjective)?.nameObjective ?? "Objetivo da tarefa pai";

  const openNewSubtask = () => {
    setSubModalMode("create");
    setSubModalEditing(null);
    setSubModalOpen(true);
  };

  const openEditSubtask = (s: TarefaSubtarefa) => {
    setSubModalMode("edit");
    setSubModalEditing(s);
    setSubModalOpen(true);
  };

  const handleSubSave = (s: TarefaSubtarefa) => {
    const oid = watchObjective >= 1 ? watchObjective : s.idObjective;
    const next = { ...s, idObjective: oid };
    if (subModalMode === "create") {
      setSubtasksState((prev) => [...prev, next]);
    } else {
      setSubtasksState((prev) => prev.map((x) => (x.id === next.id ? next : x)));
    }
  };

  const handleSubDelete = (id: string) => {
    setSubtasksState((prev) => prev.filter((x) => x.id !== id));
  };

  const onSubmit = async (data: FormValues) => {
    if (!task) return;
    setApiError(null);
    if (objectiveOptionsOverride !== undefined) {
      if (objectiveOptionsOverride.length === 0) {
        setApiError("Nenhum objetivo disponível para esta categoria.");
        return;
      }
      const allowed = new Set(objectiveOptionsOverride.map((o) => o.id));
      if (!allowed.has(data.idObjective)) {
        setApiError("Escolha um objetivo desta categoria compartilhada.");
        return;
      }
    }
    setSubmitting(true);
    try {
      const cancelRaw =
        data.status === "CANCELLED" ? (data.cancellationReason ?? "").trim() : undefined;
      const subtasksClean = stripEmptySubtasks(syncSubtasksObjective(subtasksState, data.idObjective));

      if (task.sharedTask) {
        const updated = updateCollaborativeTask(task.id, {
          nameTask: data.nameTask.trim(),
          descriptionTask: (data.descriptionTask ?? "").trim(),
          idObjective: data.idObjective,
          dateTask: data.dateTask,
          status: data.status,
          cancellationReason: data.status === "CANCELLED" ? cancelRaw : undefined,
          isRecurring: data.isRecurring,
          recurringDays: data.isRecurring ? data.recurringDays : [],
          recurringUntil: data.isRecurring ? data.recurringUntil : undefined,
          subtasks: subtasksClean.length > 0 ? subtasksClean : undefined,
        });
        if (!updated) {
          setApiError("Não foi possível salvar a tarefa colaborativa.");
          return;
        }
        if (data.status === "CANCELLED" && cancelRaw) {
          recordCancellationReasons(data.idObjective, cancelRaw);
        }
        onSaved(updated);
        onOpenChange(false);
        return;
      }

      const res = await fetch(`/api/mock/tarefas/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameTask: data.nameTask.trim(),
          descriptionTask: (data.descriptionTask ?? "").trim(),
          idObjective: data.idObjective,
          dateTask: data.dateTask,
          status: data.status,
          ...(data.status === "CANCELLED" && cancelRaw ? { cancellationReason: cancelRaw } : {}),
          isRecurring: data.isRecurring,
          recurringDays: data.isRecurring ? data.recurringDays : [],
          recurringUntil: data.isRecurring ? data.recurringUntil : undefined,
          subtasks: subtasksClean,
        }),
      });
      const result = (await res.json()) as { ok?: boolean; message?: string };
      if (!result.ok) { setApiError(result.message ?? "Erro ao salvar."); return; }

      if (data.status === "CANCELLED" && cancelRaw) {
        recordCancellationReasons(data.idObjective, cancelRaw);
      }

      onSaved({
        ...task,
        nameTask: data.nameTask.trim(),
        descriptionTask: (data.descriptionTask ?? "").trim(),
        idObjective: data.idObjective,
        dateTask: data.dateTask,
        status: data.status,
        cancellationReason: data.status === "CANCELLED" ? cancelRaw : undefined,
        isRecurring: data.isRecurring,
        recurringDays: data.isRecurring ? (data.recurringDays ?? []) : [],
        recurringUntil: data.isRecurring ? data.recurringUntil : undefined,
        subtasks: subtasksClean.length > 0 ? subtasksClean : undefined,
      });
      onOpenChange(false);
    } catch {
      setApiError("Falha de conexão. Verifique sua internet.");
    } finally {
      setSubmitting(false);
    }
  };

  const canDeleteCollaborative =
    Boolean(
      task?.sharedTask &&
        viewerEmail &&
        task.sharedTask.createdByEmail === viewerEmail.trim().toLowerCase()
    );

  const handleDeleteCollaborative = () => {
    if (!task?.sharedTask || !viewerEmail) return;
    if (!window.confirm("Excluir esta tarefa? Esta ação não pode ser desfeita.")) return;
    const r = deleteCollaborativeTask(task.id, viewerEmail);
    if (!r.ok) {
      setApiError(r.message);
      return;
    }
    onDeleted?.(task.id);
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) setSubModalOpen(false);
  }, [open]);

  if (!task) return null;

  return (
    <>
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={cn(
          "fixed inset-0 z-[60] bg-navy/55 backdrop-blur-md transition-opacity duration-300",
          "data-[state=open]:opacity-100 data-[state=closed]:opacity-0 dark:bg-black/65"
        )} />
        <Dialog.Content
          className="fixed inset-0 z-[60] flex max-h-dvh items-start justify-center overflow-y-auto p-3 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-6 outline-none"
          aria-describedby="edit-tarefa-desc"
        >
          <motion.div
            className={cn(
              "relative my-auto w-full max-w-[min(100%,72rem)] overflow-hidden rounded-2xl border border-[var(--glass-border)]",
              "bg-[var(--glass-bg)] shadow-glass-lg backdrop-blur-glass",
              "dark:shadow-[0_18px_50px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.06)_inset]"
            )}
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease }}
          >
            <div className="h-1 w-full bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-pink" />

            <div className="p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <Dialog.Title className="text-lg font-extrabold text-[var(--text-primary)]">Editar tarefa</Dialog.Title>
                  <p id="edit-tarefa-desc" className="mt-0.5 text-xs text-[var(--text-muted)] font-mono">{task.uuid}</p>
                </div>
                <Dialog.Close type="button"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                  aria-label="Fechar">
                  <XMarkIcon className="h-6 w-6" />
                </Dialog.Close>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
                {apiError && (
                  <p className="rounded-xl border border-brand-pink/40 bg-brand-pink/10 px-3 py-2 text-sm text-brand-pink" role="alert">{apiError}</p>
                )}

                {task.sharedTask && (
                  <div className="rounded-xl border border-brand-cyan/30 bg-brand-cyan/[0.08] px-3 py-2 text-xs text-[var(--text-muted)]">
                    <span className="font-semibold text-brand-cyan">Categoria compartilhada</span>
                    {" · "}
                    Criada por{" "}
                    <span className="font-medium text-[var(--text-primary)]">
                      {task.sharedTask.createdByName?.trim() || task.sharedTask.createdByEmail}
                    </span>
                  </div>
                )}

                {/* Nome */}
                <div>
                  <label htmlFor="et-name" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Nome <span className="text-brand-pink" aria-hidden>*</span></label>
                  <Input id="et-name" placeholder="Ex.: Estudar módulo IAM" {...register("nameTask")} />
                  {errors.nameTask && <p className="mt-1 text-sm text-brand-pink">{errors.nameTask.message}</p>}
                </div>

                {/* Descrição */}
                <div>
                  <label htmlFor="et-desc" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Descrição <span className="text-xs text-[var(--text-muted)]">(opcional)</span></label>
                  <textarea id="et-desc" rows={3} placeholder="Detalhes sobre a tarefa…"
                    className={cn(
                      "w-full resize-none rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3",
                      "text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                      "transition-[box-shadow,border-color] duration-[380ms] ease-liquid",
                      "focus:border-brand-cyan focus:shadow-[0_0_0_3px_rgba(0,188,212,0.25)] focus:outline-none"
                    )}
                    {...register("descriptionTask")} />
                </div>

                {/* Objetivo */}
                <div>
                  <label htmlFor="et-obj" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Objetivo <span className="text-brand-pink" aria-hidden>*</span></label>
                  <GlassSelect id="et-obj" {...register("idObjective")}>
                    <option value={0}>Selecione um objetivo…</option>
                    {objectives.map((o) => (
                      <option key={o.id} value={o.id}>{o.nameObjective}</option>
                    ))}
                  </GlassSelect>
                  {errors.idObjective && <p className="mt-1 text-sm text-brand-pink">{errors.idObjective.message}</p>}
                </div>

                {/* Data + Status (lado a lado) */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="et-date" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Data <span className="text-brand-pink" aria-hidden>*</span></label>
                    <DateField id="et-date" {...register("dateTask")} />
                    {errors.dateTask && <p className="mt-1 text-sm text-brand-pink">{errors.dateTask.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="et-status" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Status</label>
                    <GlassSelect id="et-status" {...register("status")}>
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </GlassSelect>
                  </div>
                </div>

                <div className="rounded-2xl border border-brand-cyan/25 bg-brand-cyan/[0.06] p-4">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Subtarefas</p>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        Mesmo formato das tarefas simples; objetivo sempre o da tarefa pai (
                        <span className="font-medium text-brand-cyan">{objectiveLabel}</span>
                        ). Quadro sem filtro por objetivo. Só é possível criar subtarefas aqui, após a tarefa existir.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full shrink-0 sm:w-auto"
                      disabled={watchObjective < 1}
                      onClick={openNewSubtask}
                    >
                      <PlusCircleIcon className="h-5 w-5" aria-hidden />
                      Nova subtarefa
                    </Button>
                  </div>
                  <SubtarefasKanbanBoard
                    subtasks={subtasksState}
                    onSubtasksChange={setSubtasksState}
                    onEditSubtask={openEditSubtask}
                  />
                </div>

                <div className="rounded-xl border border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--glass-bg)_70%,transparent)] px-4 py-3">
                  <p className="mb-2 text-xs text-[var(--text-muted)]">
                    Abre o Google Agenda com título, descrição e data deste formulário (mesmo antes de salvar).
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    disabled={!googleAgendaUrl}
                    onClick={openGoogleAgenda}
                  >
                    <CalendarDaysIcon className="h-5 w-5" aria-hidden />
                    Adicionar ao Google Agenda
                  </Button>
                </div>

                {watchStatus === "CANCELLED" && (
                  <div className="rounded-xl border border-brand-pink/30 bg-brand-pink/5 p-4">
                    <label htmlFor="et-cancel-reasons" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                      Motivos do cancelamento <span className="text-brand-pink">*</span>
                    </label>
                    <p className="mb-2 text-xs text-[var(--text-muted)]">
                      Separe os motivos por <span className="font-mono text-brand-cyan">;</span> (ex.: Imprevisto; Trabalho; Amway)
                    </p>
                    <textarea
                      id="et-cancel-reasons"
                      rows={3}
                      placeholder="Imprevisto; Trabalho; Amway"
                      className={cn(
                        "w-full resize-none rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3",
                        "text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                        "focus:border-brand-cyan focus:shadow-[0_0_0_3px_rgba(0,188,212,0.2)] focus:outline-none"
                      )}
                      {...register("cancellationReason")}
                    />
                    {errors.cancellationReason && (
                      <p className="mt-1 text-sm text-brand-pink">{errors.cancellationReason.message}</p>
                    )}
                    {topCancelReasons.length > 0 && (
                      <div className="mt-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                          Mais usados neste objetivo
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {topCancelReasons.map(({ reason, count }) => (
                            <button
                              key={reason}
                              type="button"
                              onClick={() => appendCancelReason(reason)}
                              className={cn(
                                "inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[var(--glass-border)]",
                                "px-2.5 py-1.5 text-left text-xs font-medium text-[var(--text-primary)]",
                                "transition-colors hover:border-brand-cyan/50 hover:bg-brand-cyan/10"
                              )}
                              title={`Usado ${count} vez(es)`}
                            >
                              <span className="truncate">{reason}</span>
                              <span className="shrink-0 rounded-md bg-[var(--glass-border)] px-1 py-0.5 text-[10px] text-[var(--text-muted)]">
                                {count}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <Controller
                  control={control}
                  name="isRecurring"
                  render={({ field }) => (
                    <RecurringTaskSwitch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />

                {isRecurring && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.28, ease }} className="overflow-hidden">
                    <div className="flex flex-col gap-4 rounded-xl border border-brand-cyan/20 bg-brand-cyan/5 p-4">
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-cyan">Repete nos dias</p>
                        <div className="flex flex-wrap gap-2">
                          {WEEK_DAYS.map(d => (
                            <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
                              className={cn(
                                "rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200",
                                recurringDays.includes(d.value)
                                  ? "bg-brand-cyan text-white shadow-glow"
                                  : "border border-[var(--glass-border)] text-[var(--text-muted)] hover:border-brand-cyan/40"
                              )}>
                              {d.label}
                            </button>
                          ))}
                        </div>
                        {errors.recurringDays && <p className="mt-1 text-sm text-brand-pink">{errors.recurringDays.message}</p>}
                      </div>
                      <div>
                        <label htmlFor="et-until" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-brand-cyan">Repetir até</label>
                        <DateField id="et-until" {...register("recurringUntil")} />
                        {errors.recurringUntil && <p className="mt-1 text-sm text-brand-pink">{errors.recurringUntil.message}</p>}
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="flex flex-col gap-2 border-t border-[var(--glass-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                  {canDeleteCollaborative ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="order-2 border-brand-pink/40 text-brand-pink hover:bg-brand-pink/10 sm:order-1"
                      onClick={handleDeleteCollaborative}
                    >
                      <TrashIcon className="h-5 w-5" aria-hidden />
                      Excluir tarefa
                    </Button>
                  ) : (
                    <span className="order-2 hidden sm:order-1 sm:block" />
                  )}
                  <div className="order-1 flex gap-2 sm:order-2 sm:ml-auto">
                    <Dialog.Close asChild>
                      <Button type="button" variant="outline" className="flex-1 sm:flex-none">
                        Cancelar
                      </Button>
                    </Dialog.Close>
                    <Button
                      type="submit"
                      className="flex-1 sm:flex-none"
                      disabled={submitting || (!isDirty && !subtasksDirty)}
                    >
                      {submitting ? "Salvando…" : "Salvar alterações"}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>

    <EditarSubtarefaModal
      open={subModalOpen}
      onOpenChange={setSubModalOpen}
      mode={subModalMode}
      subtask={subModalEditing}
      defaultDateTask={watchDate || task.dateTask}
      idObjective={watchObjective >= 1 ? watchObjective : task.idObjective}
      objectiveName={objectiveLabel}
      onSave={handleSubSave}
      onDelete={subModalMode === "edit" ? handleSubDelete : undefined}
    />
    </>
  );
}
