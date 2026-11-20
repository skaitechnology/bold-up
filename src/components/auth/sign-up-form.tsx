"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { ArrowRight, Dumbbell, Search } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/misc";
import { signUpAction, type AuthFormState } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import { AuthSide } from "./auth-side";
import { GoogleButton } from "./google-button";

type Role = "customer" | "coach";

/**
 * Sign-up in three actions: pick "I'm a coach", fill three fields, submit.
 * Everything else about a coach profile is completed later from the dashboard.
 */
export function SignUpForm({ initialRole, next, googleEnabled }: { initialRole: Role | null; next: string | null; googleEnabled: boolean }) {
  const { t } = useI18n();
  const a = t.account.auth;
  const [role, setRole] = useState<Role | null>(initialRole);
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(signUpAction, {});

  const side = role === "coach" ? <AuthSide title={a.sideTitleCoach} text={a.sideTextCoach} /> : <AuthSide title={a.sideTitleCustomer} text={a.sideTextCustomer} />;

  if (!role) {
    const options: { role: Role; title: string; text: string; icon: typeof Search }[] = [
      { role: "customer", title: a.roleCustomer, text: a.roleCustomerText, icon: Search },
      { role: "coach", title: a.roleCoach, text: a.roleCoachText, icon: Dumbbell },
    ];
    return (
      <div className="animate-fade-up">
        {side}
        <h1 className="display text-[36px] text-ink md:text-[44px]">{a.signupTitle}</h1>
        <p className="mt-3 text-[15.5px] text-muted">{a.signupText}</p>
        <p className="eyebrow mt-9 text-muted">{a.roleQuestion}</p>
        <div className="mt-3 space-y-3">
          {options.map((option) => (
            <button
              key={option.role}
              type="button"
              onClick={() => setRole(option.role)}
              data-testid={`role-${option.role}`}
              className="press group flex w-full items-center gap-4 rounded-[24px] border border-line2 bg-paper p-5 text-left hover:border-ink"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sand text-ink group-hover:bg-ink group-hover:text-paper">
                <option.icon size={21} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-semibold tracking-tight text-ink">{option.title}</span>
                <span className="mt-0.5 block text-[14px] leading-snug text-muted">{option.text}</span>
              </span>
              <ArrowRight size={18} aria-hidden className="shrink-0 text-faint group-hover:text-ink" />
            </button>
          ))}
        </div>
        <p className="mt-8 text-[14px] text-muted">
          {a.haveAccount}{" "}
          <Link href={next ? `/connexion?next=${encodeURIComponent(next)}` : "/connexion"} className="font-semibold text-ink underline underline-offset-4">
            {t.common.nav.login}
          </Link>
        </p>
      </div>
    );
  }

  const coach = role === "coach";
  return (
    <div className="animate-fade-up">
      {side}
      <button
        type="button"
        onClick={() => setRole(null)}
        className={clsx(
          "press inline-flex h-8 items-center gap-2 rounded-full pl-1 pr-3 text-[12.5px] font-semibold",
          coach ? "bg-gold-soft text-gold-ink ring-1 ring-inset ring-gold-line" : "bg-sand2 text-ink2",
        )}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-paper">
          {coach ? <Dumbbell size={13} aria-hidden /> : <Search size={13} aria-hidden />}
        </span>
        {coach ? a.roleCoach : a.roleCustomer}
        <span className="font-normal underline underline-offset-2">{a.changeRole}</span>
      </button>
      <h1 className="display mt-5 text-[34px] text-ink md:text-[42px]">{coach ? a.coachSignupTitle : a.customerSignupTitle}</h1>
      <p className="mt-3 text-[15.5px] leading-relaxed text-muted">{coach ? a.coachSignupText : a.customerSignupText}</p>

      {googleEnabled ? (
        <div className="mt-8">
          <GoogleButton label={a.google} role={role} next={next} />
          <div className="my-6 flex items-center gap-4 text-[12.5px] text-faint">
            <span className="h-px flex-1 bg-line" />
            {a.or}
            <span className="h-px flex-1 bg-line" />
          </div>
        </div>
      ) : null}

      <form action={formAction} className={clsx("space-y-4", !googleEnabled && "mt-8")} noValidate>
        <input type="hidden" name="role" value={role} />
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <Field label={a.fullName}>
          <Input name="fullName" autoComplete="name" required minLength={2} maxLength={80} defaultValue={state.values?.fullName} placeholder={a.fullNamePlaceholder} autoFocus />
        </Field>
        <Field label={a.email}>
          <Input name="email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" required defaultValue={state.values?.email} placeholder={a.emailPlaceholder} />
        </Field>
        <Field label={a.password} hint={a.passwordHint}>
          <Input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} />
        </Field>
        {state.error ? <Notice tone="danger">{t.common.errors[state.error]}</Notice> : null}
        <Button type="submit" size="lg" block loading={pending} iconRight={ArrowRight} data-testid="signup-submit">
          {coach ? a.createCoachAccount : a.createAccount}
        </Button>
      </form>

      <p className="mt-5 text-[12.5px] leading-relaxed text-faint">
        {a.consent}{" "}
        <Link href="/conditions" className="underline underline-offset-2 hover:text-ink">
          {a.consentTerms}
        </Link>{" "}
        {a.consentAnd}{" "}
        <Link href="/confidentialite" className="underline underline-offset-2 hover:text-ink">
          {a.consentPrivacy}
        </Link>
        .
      </p>
      <p className="mt-6 text-[14px] text-muted">
        {a.haveAccount}{" "}
        <Link href={next ? `/connexion?next=${encodeURIComponent(next)}` : "/connexion"} className="font-semibold text-ink underline underline-offset-4">
          {t.common.nav.login}
        </Link>
      </p>
    </div>
  );
}
