"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useActionState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/misc";
import { forgotPasswordAction, updatePasswordAction, type AuthFormState } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/client";

export function ForgotPasswordForm() {
  const { t } = useI18n();
  const a = t.account.auth;
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(forgotPasswordAction, {});
  return (
    <div className="animate-fade-up">
      <h1 className="display text-[34px] text-ink md:text-[42px]">{a.forgotTitle}</h1>
      <p className="mt-3 text-[15.5px] leading-relaxed text-muted">{a.forgotText}</p>
      <form action={formAction} className="mt-8 space-y-4" noValidate>
        <Field label={a.email}>
          <Input name="email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" required defaultValue={state.values?.email} placeholder={a.emailPlaceholder} autoFocus />
        </Field>
        {state.notice === "reset_sent" ? <Notice tone="success">{a.forgotSent}</Notice> : null}
        {state.error ? <Notice tone="danger">{t.common.errors[state.error]}</Notice> : null}
        <Button type="submit" size="lg" block loading={pending}>
          {a.forgotCta}
        </Button>
      </form>
      <Link href="/connexion" className="mt-6 inline-flex items-center gap-2 text-[14px] font-medium text-ink underline underline-offset-4">
        <ArrowLeft size={15} aria-hidden />
        {a.backToLogin}
      </Link>
    </div>
  );
}

export function NewPasswordForm({ home }: { home: string }) {
  const { t } = useI18n();
  const a = t.account.auth;
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(updatePasswordAction, {});
  if (state.notice === "password_updated") {
    return (
      <div className="animate-fade-up">
        <h1 className="display text-[34px] text-ink md:text-[42px]">{a.resetDone}</h1>
        <ButtonLink href={home} size="lg" className="mt-8">
          {t.common.actions.continue}
        </ButtonLink>
      </div>
    );
  }
  return (
    <div className="animate-fade-up">
      <h1 className="display text-[34px] text-ink md:text-[42px]">{a.resetTitle}</h1>
      <p className="mt-3 text-[15.5px] leading-relaxed text-muted">{a.resetText}</p>
      <form action={formAction} className="mt-8 space-y-4" noValidate>
        <Field label={a.password} hint={a.passwordHint}>
          <Input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} autoFocus />
        </Field>
        {state.error ? <Notice tone="danger">{state.error === "not_authenticated" ? a.linkExpired : t.common.errors[state.error]}</Notice> : null}
        <Button type="submit" size="lg" block loading={pending}>
          {a.resetCta}
        </Button>
      </form>
    </div>
  );
}
