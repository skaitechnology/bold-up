"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/errors";
import { useI18n } from "@/lib/i18n/client";

/** A button that runs one server action and refreshes the page. */
export function ActionButton({
  action,
  label,
  success,
  variant = "secondary",
  testId,
}: {
  action: () => Promise<ActionResult>;
  label: string;
  success: string;
  variant?: ButtonVariant;
  testId?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant={variant}
      size="sm"
      loading={pending}
      data-testid={testId}
      onClick={() =>
        startTransition(async () => {
          const result = await action();
          if (!result.ok) toast.error(t.common.errors[result.error]);
          else toast.success(success);
          router.refresh();
        })
      }
    >
      {label}
    </Button>
  );
}
