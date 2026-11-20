"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "@/components/ui/toast";
import type { FormState } from "@/lib/actions/pro";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "./button";

/**
 * A <form> wired to a server action, with a toast on success or failure.
 * Lets server components build real forms without any client state of their own.
 */
export function ActionForm({
  action,
  success,
  resetOnSuccess,
  onSuccess,
  className,
  children,
  ...rest
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  success?: string;
  resetOnSuccess?: boolean;
  onSuccess?: () => void;
  className?: string;
  children: ReactNode;
} & Omit<React.FormHTMLAttributes<HTMLFormElement>, "action" | "children">) {
  const { t } = useI18n();
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });

  useEffect(() => {
    if (state.ok) {
      toast.success(success ?? t.common.actions.saved);
      if (resetOnSuccess) formRef.current?.reset();
      onSuccessRef.current?.();
    } else if (state.error) {
      toast.error(t.common.errors[state.error]);
    }
    // `state` is a new object after every submission: that is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form {...rest} ref={formRef} action={formAction} className={className}>
      {children}
    </form>
  );
}

export function SubmitButton({ children, ...rest }: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} {...rest}>
      {children}
    </Button>
  );
}
