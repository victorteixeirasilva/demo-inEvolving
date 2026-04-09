"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AnimatedLink } from "@/components/ui/AnimatedLink";
import { GlassCard } from "@/components/ui/GlassCard";
import { STORAGE_KEYS } from "@/lib/constants";
import authStyles from "@/styles/auth-card.module.css";
import { ObrigadoCadastroModal } from "@/components/features/auth/ObrigadoCadastroModal";

const schema = z
  .object({
    email: z.string().email("E-mail inválido"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
    confirm: z.string(),
  })
  .superRefine((data, ctx) => {
    if (!data.confirm.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Confirme sua senha",
        path: ["confirm"],
      });
      return;
    }
    if (data.password !== data.confirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "As senhas não coincidem",
        path: ["confirm"],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

export default function CadastroPage() {
  const [thanksOpen, setThanksOpen] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors, touchedFields },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const passwordValue = watch("password");

  useEffect(() => {
    if (!touchedFields.confirm) return;
    void trigger("confirm");
  }, [passwordValue, touchedFields.confirm, trigger]);

  const onSubmit = (data: FormValues) => {
    try {
      localStorage.setItem(STORAGE_KEYS.email, data.email);
    } catch {
      /* ignore */
    }
    setThanksOpen(true);
  };

  return (
    <>
    <ObrigadoCadastroModal open={thanksOpen} onOpenChange={setThanksOpen} />
    <div className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className={`w-full max-w-md ${authStyles.wrap}`}>
        <GlassCard className={`${authStyles.inner} !rounded-[1.2rem] border-0 p-6 sm:p-8`}>
          <h1 className="text-center text-2xl font-bold text-[var(--text-primary)]">Cadastro</h1>
          {/* <p className="mt-2 text-center text-sm text-[var(--text-muted)]">
            Fluxo mock — em produção usará{" "}
            <code className="rounded bg-black/5 px-1 py-0.5 text-xs dark:bg-white/10">
              POST /api/authentication/register
            </code>
            .
          </p> */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-8 flex flex-col gap-4"
            noValidate
          >
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                E-mail
              </label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              {errors.email && (
                <p className="mt-1 text-sm text-brand-pink" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                Senha
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-brand-pink" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                Confirmar senha
              </label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                {...register("confirm")}
              />
              {errors.confirm && (
                <p className="mt-1 text-sm text-brand-pink" role="alert">
                  {errors.confirm.message}
                </p>
              )}
            </div>
            <Button type="submit" className="mt-2 w-full">
              Criar conta
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
            Já tem conta? <AnimatedLink href="/login">Entrar</AnimatedLink>
          </p>
          <p className="mt-2 text-center">
            <AnimatedLink href="/">← Voltar ao início</AnimatedLink>
          </p>
        </GlassCard>
      </div>
    </div>
    </>
  );
}
