"use client";

import { useState } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { WHATSAPP_HELP_URL } from "@/lib/constants";
import {
  applyCategoryShareDemoMocks,
  DEMO_INVITEE_EMAIL,
  DEMO_OWNER_EMAIL,
  DEMO_SHARE_PENDING_TOKEN,
  setDemoProfileAsInvitee,
  setDemoProfileAsOwner,
} from "@/lib/category-share-demo-mocks";

export default function AjudaPage() {
  const [demoUrl, setDemoUrl] = useState<string | null>(null);
  const [demoMsg, setDemoMsg] = useState<string | null>(null);

  const handleSeedDemo = () => {
    setDemoMsg(null);
    const r = applyCategoryShareDemoMocks();
    setDemoUrl(r.pendingInviteUrl);
    setDemoMsg(
      "Mocks aplicados: amigos, convite pendente (Carreira → Ricardo) e uma categoria já aceita (Bem-estar de Paulo) no dashboard."
    );
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Ajuda</h1>
      <GlassCard>
        <p className="text-[var(--text-muted)]">
          Fale conosco pelo WhatsApp.
          {/* <code className="rounded bg-black/5 px-1 text-xs dark:bg-white/10">NEXT_PUBLIC_WHATSAPP_URL</code>. */}
        </p>
        <a href={WHATSAPP_HELP_URL} target="_blank" rel="noopener noreferrer" className="mt-6 block">
          <Button type="button" className="w-full">
            Abrir WhatsApp
          </Button>
        </a>
      </GlassCard>

      <GlassCard className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Demonstração — compartilhar categoria</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Carrega dados fictícios no navegador (localStorage): amigos em Ajustes, um convite pendente com link fixo e
            uma categoria já aceita para aparecer no dashboard com o selo &quot;Compartilhada&quot;.
          </p>
        </div>
        <Button type="button" variant="outline" className="w-full" onClick={handleSeedDemo}>
          Aplicar mocks de compartilhamento
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setDemoProfileAsOwner()}>
            Perfil: dona (Marina)
          </Button>
          <Button type="button" variant="outline" className="flex-1" onClick={() => setDemoProfileAsInvitee()}>
            Perfil: convidado (Ricardo)
          </Button>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Dona: <code className="rounded bg-black/5 px-1 dark:bg-white/10">{DEMO_OWNER_EMAIL}</code> · Convidado:{" "}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">{DEMO_INVITEE_EMAIL}</code>
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          Token do convite pendente:{" "}
          <code className="break-all rounded bg-black/5 px-1 dark:bg-white/10">{DEMO_SHARE_PENDING_TOKEN}</code>
        </p>
        {demoMsg && <p className="text-sm text-brand-cyan">{demoMsg}</p>}
        {demoUrl && (
          <div className="space-y-2 rounded-xl border border-brand-cyan/25 bg-brand-cyan/[0.06] p-3 text-sm">
            <p className="font-medium text-[var(--text-primary)]">Link do convite (simula o e-mail)</p>
            <p className="break-all text-xs text-[var(--text-muted)]">{demoUrl}</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/dashboard/convite-categoria?token=${encodeURIComponent(DEMO_SHARE_PENDING_TOKEN)}`}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-brand-blue to-brand-cyan px-4 py-2 text-xs font-semibold text-white"
              >
                Abrir convite
              </Link>
              <Button
                type="button"
                variant="outline"
                className="text-xs"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(demoUrl);
                    setDemoMsg("Link copiado.");
                  } catch {
                    setDemoMsg("Não foi possível copiar; selecione o link acima.");
                  }
                }}
              >
                Copiar link
              </Button>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Use o perfil <strong className="font-semibold text-[var(--text-primary)]">convidado</strong> antes de
              aceitar. Depois, confira o dashboard e a lista por categoria em Tarefas.
            </p>
          </div>
        )}
        <Link href="/dashboard" className="inline-block text-sm font-semibold text-brand-cyan hover:underline">
          Ir ao dashboard
        </Link>
      </GlassCard>
    </div>
  );
}
