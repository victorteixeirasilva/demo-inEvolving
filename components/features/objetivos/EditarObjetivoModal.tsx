"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Objective } from "@/lib/types/models";

const ease = [0.16, 1, 0.3, 1] as const;

const schema = z.object({
  nameObjective: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(100, "Máximo 100 caracteres"),
  descriptionObjective: z.string().max(300, "Máximo 300 caracteres").optional(),
  statusObjective: z.enum(["IN_PROGRESS", "DONE"]),
});

type FormValues = z.infer<typeof schema>;

export type EditarObjetivoModalProps = {
  open: boolean;
  objective: Objective | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (updated: Pick<Objective, "id" | "nameObjective" | "descriptionObjective" | "statusObjective">) => void;
};

export function EditarObjetivoModal({
  open,
  objective,
  onOpenChange,
  onSaved,
}: EditarObjetivoModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nameObjective: "",
      descriptionObjective: "",
      statusObjective: "IN_PROGRESS",
    },
  });

  useEffect(() => {
    if (!open) { setApiError(null); return; }
    reset({
      nameObjective: objective?.nameObjective ?? "",
      descriptionObjective: objective?.descriptionObjective ?? "",
      statusObjective: objective?.statusObjective ?? "IN_PROGRESS",
    });
    setApiError(null);
  }, [open, objective, reset]);

  const onSubmit = async (data: FormValues) => {
    if (!objective) return;
    setApiError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/mock/objetivos/${objective.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameObjective: data.nameObjective.trim(),
          descriptionObjective: (data.descriptionObjective ?? "").trim(),
          statusObjective: data.statusObjective,
        }),
      });
      const result = (await res.json()) as { ok?: boolean; message?: string };
      if (!result.ok) {
        setApiError(result.message ?? "Não foi possível salvar. Tente novamente.");
        return;
      }
      onSaved({
        id: objective.id,
        nameObjective: data.nameObjective.trim(),
        descriptionObjective: (data.descriptionObjective ?? "").trim(),
        statusObjective: data.statusObjective,
      });
      onOpenChange(false);
    } catch {
      setApiError("Falha de conexão. Verifique sua internet.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!objective) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-[60] bg-navy/55 backdrop-blur-md transition-opacity duration-300",
            "data-[state=open]:opacity-100 data-[state=closed]:opacity-0 dark:bg-black/65"
          )}
        />
        <Dialog.Content
          className="fixed inset-0 z-[60] flex max-h-dvh items-start justify-center overflow-y-auto p-3 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-6 outline-none"
          aria-describedby="editar-obj-desc"
        >
          <motion.div
            className={cn(
              "relative my-auto w-full max-w-[min(100%,30rem)] overflow-hidden rounded-2xl border border-[var(--glass-border)]",
              "bg-[var(--glass-bg)] shadow-glass-lg backdrop-blur-glass",
              "dark:shadow-[0_18px_50px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.06)_inset]"
            )}
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease }}
          >
            {/* accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-pink" />

            <div className="p-6">
              {/* header */}
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <Dialog.Title className="text-lg font-extrabold text-[var(--text-primary)]">
                    Editar objetivo
                  </Dialog.Title>
                  <p id="editar-obj-desc" className="mt-0.5 text-sm text-[var(--text-muted)]">
                    Altere nome, descrição ou status do objetivo.
                  </p>
                </div>
                <Dialog.Close
                  type="button"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                  aria-label="Fechar"
                >
                  <XMarkIcon className="h-6 w-6" />
                </Dialog.Close>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
                {apiError && (
                  <p
                    className="rounded-xl border border-brand-pink/40 bg-brand-pink/10 px-3 py-2 text-sm text-brand-pink"
                    role="alert"
                  >
                    {apiError}
                  </p>
                )}

                {/* Nome */}
                <div>
                  <label
                    htmlFor="edit-obj-name"
                    className="mb-1 block text-sm font-medium text-[var(--text-primary)]"
                  >
                    Nome <span className="text-brand-pink" aria-hidden>*</span>
                  </label>
                  <Input
                    id="edit-obj-name"
                    placeholder="Ex.: Conquistar certificação AWS"
                    {...register("nameObjective")}
                  />
                  {errors.nameObjective && (
                    <p className="mt-1 text-sm text-brand-pink" role="alert">
                      {errors.nameObjective.message}
                    </p>
                  )}
                </div>

                {/* Descrição */}
                <div>
                  <label
                    htmlFor="edit-obj-desc"
                    className="mb-1 block text-sm font-medium text-[var(--text-primary)]"
                  >
                    Descrição{" "}
                    <span className="text-xs text-[var(--text-muted)]">(opcional)</span>
                  </label>
                  <textarea
                    id="edit-obj-desc"
                    rows={4}
                    placeholder="Descreva o objetivo, critérios de sucesso ou contexto relevante…"
                    className={cn(
                      "w-full resize-none rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3",
                      "text-sm text-[var(--text-primary)] backdrop-blur-glass placeholder:text-[var(--text-muted)]",
                      "transition-[box-shadow,border-color] duration-[380ms] ease-liquid",
                      "focus:border-brand-cyan focus:shadow-[0_0_0_3px_rgba(0,188,212,0.25)] focus:outline-none"
                    )}
                    {...register("descriptionObjective")}
                  />
                  {errors.descriptionObjective && (
                    <p className="mt-1 text-sm text-brand-pink" role="alert">
                      {errors.descriptionObjective.message}
                    </p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">Status</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["IN_PROGRESS", "DONE"] as const).map((s) => {
                      const isActive = s === (register("statusObjective") as unknown as { value: string })?.value;
                      return (
                        <label
                          key={s}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-300",
                            "border-[var(--glass-border)] hover:border-brand-cyan/40",
                            "has-[:checked]:border-brand-cyan has-[:checked]:bg-brand-cyan/10 has-[:checked]:text-brand-cyan"
                          )}
                        >
                          <input
                            type="radio"
                            value={s}
                            className="sr-only"
                            {...register("statusObjective")}
                          />
                          <span
                            className={cn(
                              "h-3 w-3 shrink-0 rounded-full",
                              s === "DONE" ? "bg-emerald-400" : "bg-brand-cyan"
                            )}
                          />
                          {s === "DONE" ? "Concluído" : "Em andamento"}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Rodapé */}
                <div className="flex gap-2 border-t border-[var(--glass-border)] pt-4 sm:justify-end">
                  <Dialog.Close asChild>
                    <Button type="button" variant="outline" className="flex-1 sm:flex-none">
                      Cancelar
                    </Button>
                  </Dialog.Close>
                  <Button
                    type="submit"
                    className="flex-1 sm:flex-none"
                    disabled={submitting || !isDirty}
                  >
                    {submitting ? "Salvando…" : "Salvar"}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
