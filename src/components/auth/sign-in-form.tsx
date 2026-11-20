"use client";

import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { useActionState, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/misc";
import { magicLinkAction, signInAction, type AuthFormState } from "@/lib/actions/auth";
import type { ErrorCode } from "@/lib/errors";
import { useI18n } from "@/lib/i18n/client";
import { AuthSide } from "./auth-side";
import { GoogleButton } from "./google-button";

export function SignInForm({ next, googleEnabled, initialError }: { next: string | null; googleEnabled: boolean; initialError: ErrorCode | "link" | null }) {
  const { t } = useI18n();
  const a = t.account.auth;
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(signInAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const [magic, setMagic] = useState<AuthFormState>({});
  const [sendingMagic, startMagic] = useTransition();

  const sendMagicLink = () => {
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    if (!String(data.get("email") ?? "").trim()) {
      setMagic({ error: "invalid_input" });
      return;
    }
    startMagic(async () => setMagic(await magicLinkAction({}, data)));
  };

  const error = state.error ?? (initialError && initialError !== "link" ? initialError : null);
  return (
    <div className="animate-fade-up">
      <AuthSide title={a.sideTitleCustomer} text={a.sideTextCustomer} />
      <h1 className="display text-[36px] text-ink md:text-[44px]">{a.loginTitle}</h1>
      <p className="mt-3 text-[15.5px] text-muted">{a.loginText}</p>

      {googleEnabled ? (
        <div className="mt-8">
          <GoogleButton label={a.google} next={next} />
          <div className="my-6 flex items-center gap-4 text-[12.5px] text-faint">
            <span className="h-px flex-1 bg-line" />
            {a.or}
            <span className="h-px flex-1 bg-line" />
          </div>
        </div>
      ) : null}

      <form ref={formRef} action={formAction} className={googleEnabled ? "space-y-4" : "mt-8 space-y-4"} noValidate>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <Field label={a.email}>
          <Input name="email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" required defaultValue={state.values?.email} placeholder={a.emailPlaceholder} autoFocus />
        </Field>
        <Field label={a.password}>
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        {initialError === "link" && !state.error ? <Notice tone="warn">{a.linkExpired}</Notice> : null}
        {error ? <Notice tone="danger">{t.common.errors[error]}</Notice> : null}
        <Button type="submit" size="lg" block loading={pending} iconRight={ArrowRight} data-testid="login-submit">
          {a.login}
        </Button>
      </form>

      <div className="mt-5 flex flex-col gap-3 text-[14px]">
        <button
          type="button"
          onClick={sendMagicLink}
          disabled={sendingMagic}
          className="inline-flex items-center gap-2 self-start font-medium text-ink underline underline-offset-4 disabled:opacity-50"
        >
          <Mail size={15} aria-hidden />
          {a.magicLink}
        </button>
        {magic.notice === "magic_sent" ? <Notice tone="success">{a.magicSent}</Notice> : null}
        {magic.error ? <Notice tone="warn">{magic.error === "invalid_input" ? a.magicNeedEmail : t.common.errors[magic.error]}</Notice> : null}
        <Link href="/mot-de-passe-oublie" className="self-start text-muted underline underline-offset-4 hover:text-ink">
          {a.forgot}
        </Link>
      </div>

      <p className="mt-8 text-[14px] text-muted">
        {a.noAccount}{" "}
        <Link href={next ? `/inscription?next=${encodeURIComponent(next)}` : "/inscription"} className="font-semibold text-ink underline underline-offset-4">
          {t.common.nav.signup}
        </Link>
      </p>
    </div>
  );
}
