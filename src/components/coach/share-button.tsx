"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/client";

/** Shares the profile with the native share sheet when there is one, otherwise copies the link. */
export function ShareButton({ url, title, variant = "icon" }: { url: string; title: string; variant?: "icon" | "full" }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const absolute = url.startsWith("http") ? url : `${window.location.origin}${url}`;
    try {
      if (variant === "icon" && navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title, url: absolute });
        return;
      }
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      toast.success(t.common.actions.copied);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // the visitor closed the share sheet, or clipboard access was refused
    }
  };

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={share}
        className="press inline-flex h-11 items-center gap-2 rounded-full border border-line2 bg-paper px-5 text-[14px] font-semibold text-ink hover:border-ink"
        data-testid="copy-link"
      >
        {copied ? <Check size={16} aria-hidden /> : <Link2 size={16} aria-hidden />}
        {copied ? t.common.actions.copied : t.common.actions.copy}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={share}
      aria-label={t.common.actions.share}
      title={t.common.actions.share}
      className="press inline-flex h-11 w-11 items-center justify-center rounded-full border border-line2 bg-paper text-ink hover:border-ink"
    >
      {copied ? <Check size={18} aria-hidden /> : <Link2 size={18} aria-hidden />}
    </button>
  );
}
