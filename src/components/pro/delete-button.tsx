"use client";

import { clsx } from "clsx";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/errors";
import { useI18n } from "@/lib/i18n/client";

/**
 * Trash button bound to a server action that takes one id.
 * Two taps: the first arms it and shows "Delete?", the second confirms. No pop-up.
 */
export function DeleteButton({
  action,
  id,
  label,
  success,
  onDone,
}: {
  action: (id: string) => Promise<ActionResult>;
  id: string;
  label: string;
  success: string;
  onDone?: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <button
      type="button"
      aria-label={armed ? `${t.common.actions.confirm} — ${label}` : label}
      title={label}
      disabled={pending}
      data-armed={armed ? "true" : "false"}
      data-testid="delete-button"
      onClick={() => {
        if (!armed) {
          setArmed(true);
          return;
        }
        startTransition(async () => {
          const result = await action(id);
          setArmed(false);
          if (!result.ok) toast.error(t.common.errors[result.error]);
          else toast.success(success);
          onDone?.();
          router.refresh();
        });
      }}
      className={clsx(
        "press inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold disabled:opacity-40",
        armed ? "bg-danger px-3.5 text-white" : "w-10 text-muted hover:bg-danger-soft hover:text-danger",
      )}
    >
      <Trash2 size={17} aria-hidden />
      {armed ? `${t.common.actions.delete} ?` : null}
    </button>
  );
}
