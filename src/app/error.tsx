"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-danger-soft text-danger">
        <TriangleAlert size={26} aria-hidden />
      </span>
      <h1 className="display mt-6 text-[30px] text-ink md:text-[38px]">{t.common.errorPage.title}</h1>
      <p className="mt-3 max-w-sm text-[15px] text-muted">{t.common.errorPage.text}</p>
      <Button onClick={reset} icon={RotateCcw} size="lg" className="mt-8">
        {t.common.actions.retry}
      </Button>
    </main>
  );
}
