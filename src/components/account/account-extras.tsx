"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { requestDeletionAction } from "@/lib/actions/account";
import { updatePasswordAction, type AuthFormState } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/client";

export function PasswordForm() {
  const { t } = useI18n();
  const p = t.account.profile;
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(updatePasswordAction, {});
  useEffect(() => {
    if (state.notice === "password_updated") toast.success(p.passwordChanged);
    else if (state.error) toast.error(t.common.errors[state.error]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <form action={formAction} className="flex max-w-md flex-col gap-3 sm:flex-row sm:items-end">
      <Field label={p.newPassword} hint={t.account.auth.passwordHint} className="flex-1">
        <Input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} />
      </Field>
      <Button type="submit" variant="secondary" loading={pending} className="!h-12 sm:mb-[26px]">
        {p.changePassword}
      </Button>
    </form>
  );
}

/** Account deletion request, with an inline confirmation step. */
export function DeletionRequest() {
  const { t } = useI18n();
  const p = t.account.profile;
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button variant="danger" onClick={() => setConfirming(true)}>
        {p.deleteCta}
      </Button>
    );
  }
  return (
    <div className="rounded-2xl bg-danger-soft p-4">
      <p className="text-[14.5px] font-semibold text-danger">{p.deleteConfirm}</p>
      <p className="mt-1 text-[13.5px] leading-relaxed text-ink2">{p.deleteConfirmText}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
          {t.common.actions.cancel}
        </Button>
        <Button
          variant="danger"
          size="sm"
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await requestDeletionAction();
              if (!result.ok) toast.error(t.common.errors[result.error]);
              else toast.success(p.deleteRequested);
              setConfirming(false);
              router.refresh();
            })
          }
        >
          {t.common.actions.confirm}
        </Button>
      </div>
    </div>
  );
}
