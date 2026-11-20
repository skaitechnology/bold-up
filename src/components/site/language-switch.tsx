"use client";

import { clsx } from "clsx";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocaleAction } from "@/lib/i18n/actions";
import { useI18n } from "@/lib/i18n/client";
import { LOCALES } from "@/lib/i18n/config";

/** FR / EN toggle. The choice is remembered in a cookie (and on the profile when signed in). */
export function LanguageSwitch({ inverse, className }: { inverse?: boolean; className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={t.common.switchLanguage}
      className={clsx(
        "inline-flex h-9 items-center rounded-full border p-0.5 text-[12px] font-semibold",
        inverse ? "border-white/25" : "border-line2",
        pending && "opacity-60",
        className,
      )}
    >
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={active}
            disabled={pending}
            onClick={() => {
              if (active) return;
              startTransition(async () => {
                await setLocaleAction(code);
                router.refresh();
              });
            }}
            className={clsx(
              "press inline-flex h-7 min-w-9 items-center justify-center rounded-full px-2.5 uppercase tracking-wide",
              active
                ? inverse
                  ? "bg-paper text-ink"
                  : "bg-ink text-paper"
                : inverse
                  ? "text-white/75 hover:text-white"
                  : "text-muted hover:text-ink",
            )}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}
