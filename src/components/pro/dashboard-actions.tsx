"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { Switch } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { setVisibilityAction, submitProfileAction } from "@/lib/actions/pro";
import { useI18n } from "@/lib/i18n/client";

/** Sends the completed profile to the human review queue. */
export function SubmitProfileButton({
  label,
  disabled,
  variant = "primary",
  size = "lg",
}: {
  label: string;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant={variant}
      size={size}
      icon={Send}
      disabled={disabled}
      loading={pending}
      data-testid="submit-profile"
      onClick={() =>
        startTransition(async () => {
          const result = await submitProfileAction();
          if (!result.ok) toast.error(t.common.errors[result.error]);
          else toast.success(t.pro.dashboard.submitted);
          router.refresh();
        })
      }
    >
      {label}
    </Button>
  );
}

/** Lets an approved coach hide or show their listing. */
export function VisibilityToggle({ published }: { published: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className={pending ? "opacity-60" : undefined}>
      <Switch
        checked={published}
        onChange={(checked) =>
          startTransition(async () => {
            const result = await setVisibilityAction(checked);
            if (!result.ok) toast.error(t.common.errors[result.error]);
            else toast.success(checked ? t.pro.dashboard.visibilityOn : t.pro.dashboard.visibilityOff);
            router.refresh();
          })
        }
        label={t.pro.dashboard.visibility}
      />
    </div>
  );
}
