"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  InformationCircleIcon,
  PhotoIcon,
  PlusCircleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { SonhoFormModal, type SonhoFormSavePayload } from "@/components/features/motivacao/SonhoFormModal";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { StaggerList } from "@/features/animations/StaggerList";
import { sonhoMotivacaoInsight } from "@/lib/motivacao-sonhos-messages";
import { loadSonhos, normalizeSonho, saveSonhos } from "@/lib/sonhos-storage";
import type { Sonho } from "@/lib/types/models";
import { cn } from "@/lib/utils";

function DreamImageArea({ url, title }: { url?: string; title: string }) {
  const [failed, setFailed] = useState(false);
  const showImg = Boolean(url) && !failed;

  return (
    <div className="relative aspect-video w-full shrink-0 bg-gradient-to-br from-brand-purple/25 to-brand-pink/15">
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={title}
          className="h-full w-full object-contain p-4 opacity-95"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full min-h-[140px] w-full flex-col items-center justify-center gap-2 px-4 text-center">
          <PhotoIcon className="h-12 w-12 text-[var(--text-muted)]/45" aria-hidden />
          <span className="text-xs text-[var(--text-muted)]">
            {url && failed ? "Não foi possível carregar a imagem" : "Sem imagem — toque para editar"}
          </span>
        </div>
      )}
    </div>
  );
}

export type MotivacaoSonhosSectionProps = {
  seedSonhos: Sonho[];
};

export function MotivacaoSonhosSection({ seedSonhos }: MotivacaoSonhosSectionProps) {
  const normalizedSeed = useMemo(() => seedSonhos.map((s) => normalizeSonho(s)), [seedSonhos]);
  const [sonhos, setSonhos] = useState<Sonho[]>(normalizedSeed);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Sonho | null>(null);
  const dataHydrated = useRef(false);

  useLayoutEffect(() => {
    const stored = loadSonhos();
    if (stored && stored.length > 0) {
      setSonhos(stored.map((s) => normalizeSonho(s)));
    }
    dataHydrated.current = true;
  }, []);

  useEffect(() => {
    if (!dataHydrated.current) return;
    saveSonhos(sonhos);
  }, [sonhos]);

  const count = sonhos.length;
  const insight = useMemo(() => sonhoMotivacaoInsight(count), [count]);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (s: Sonho) => {
    setEditing(s);
    setFormOpen(true);
  };

  const handleSave = (payload: SonhoFormSavePayload) => {
    if (payload.id != null) {
      setSonhos((prev) =>
        prev.map((s) =>
          s.id === payload.id
            ? normalizeSonho({
                id: payload.id,
                name: payload.name,
                description: payload.description,
                urlImage: payload.urlImage,
              })
            : s
        )
      );
      return;
    }
    const nextId = sonhos.length === 0 ? 1 : Math.max(...sonhos.map((s) => s.id)) + 1;
    setSonhos((prev) => [
      ...prev,
      normalizeSonho({
        id: nextId,
        name: payload.name,
        description: payload.description,
        urlImage: payload.urlImage,
      }),
    ]);
  };

  const handleDelete = (id: number) => {
    setSonhos((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-base leading-relaxed text-[var(--text-primary)] sm:text-[1.05rem]">
          Acompanhe e organize seus sonhos para que ganhem vida no seu{" "}
          <span className="font-semibold text-brand-cyan">Vision Board</span>. Atualmente você possui{" "}
          <span className="font-bold tabular-nums text-brand-pink">{count}</span>{" "}
          {count === 1 ? "sonho cadastrado" : "sonhos cadastrados"}.
        </p>
        <p className="text-sm text-[var(--text-muted)]">
          Toque ou clique em um card para editar ou excluir. Use imagens que te inspirem — elas aparecem aqui e podem
          compor seu board.
        </p>
      </div>

      <div
        className={cn(
          "flex gap-3 rounded-2xl border p-4 sm:p-5",
          insight.panelClass
        )}
        role="status"
      >
        <InformationCircleIcon className="mt-0.5 h-6 w-6 shrink-0 text-brand-cyan" aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold text-[var(--text-primary)]">{insight.title}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">{insight.body}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <SparklesIcon className="h-5 w-5 text-brand-purple" aria-hidden />
          <span>
            Total no dispositivo: <strong className="tabular-nums text-[var(--text-primary)]">{count}</strong>
          </span>
        </div>
        <Button type="button" variant="outline" className="w-full shrink-0 sm:w-auto" onClick={openNew}>
          <PlusCircleIcon className="h-5 w-5" aria-hidden />
          Novo sonho
        </Button>
      </div>

      {count === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <SparklesIcon className="h-14 w-14 text-[var(--text-muted)]/40" aria-hidden />
          <div className="max-w-md space-y-2 px-4">
            <p className="text-lg font-semibold text-[var(--text-primary)]">Nenhum sonho ainda</p>
            <p className="text-sm text-[var(--text-muted)]">
              Cadastre o primeiro com nome, descrição e, se quiser, o link de uma imagem. Assim começamos a te lembrar
              do que importa.
            </p>
          </div>
          <Button type="button" onClick={openNew}>
            <PlusCircleIcon className="h-5 w-5" aria-hidden />
            Adicionar primeiro sonho
          </Button>
        </GlassCard>
      ) : (
        <StaggerList className="grid grid-cols-2 gap-x-2 gap-y-3 sm:gap-x-2 sm:gap-y-4">
          {sonhos.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Abrir sonho: ${s.name}. Editar ou excluir.`}
              onClick={() => openEdit(s)}
              className={cn(
                "group flex h-full min-h-0 min-w-0 flex-col text-left transition-all duration-200",
                "rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-sm",
                "overflow-hidden outline-none hover:border-brand-cyan/35 hover:shadow-glass-lg",
                "focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
              )}
            >
              <DreamImageArea url={s.urlImage} title={s.name} />
              <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
                <h2 className="line-clamp-2 shrink-0 text-base font-semibold leading-snug text-[var(--text-primary)] transition-colors group-hover:text-brand-cyan sm:text-lg">
                  {s.name}
                </h2>
                <div className="mt-2 min-h-[4.5rem] flex-1 sm:min-h-[5.25rem]">
                  <p className="line-clamp-4 text-xs leading-relaxed text-[var(--text-muted)] sm:text-sm">{s.description}</p>
                </div>
                <p className="mt-auto shrink-0 pt-2 text-[0.65rem] font-medium text-brand-purple/90 sm:text-xs">
                  Toque para editar ou excluir
                </p>
              </div>
            </button>
          ))}
        </StaggerList>
      )}

      <SonhoFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        editingSonho={editing}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
