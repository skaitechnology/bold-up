import { clsx } from "clsx";
import { ShieldCheck, type LucideIcon } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

export type BadgeTone = "neutral" | "ink" | "gold" | "success" | "warn" | "danger" | "outline" | "glass";

export function Badge({
  tone = "neutral",
  icon: Icon,
  size = "md",
  className,
  children,
  ...rest
}: {
  tone?: BadgeTone;
  icon?: LucideIcon;
  size?: "sm" | "md";
  className?: string;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLSpanElement>, "className" | "children">) {
  return (
    <span
      {...rest}
      className={clsx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium",
        size === "sm" ? "h-6 px-2.5 text-[11.5px]" : "h-7 px-3 text-[12.5px]",
        tone === "neutral" && "bg-sand2 text-ink2",
        tone === "ink" && "bg-ink text-paper",
        tone === "gold" && "bg-gold-soft text-gold-ink ring-1 ring-inset ring-gold-line",
        tone === "success" && "bg-success-soft text-success",
        tone === "warn" && "bg-warn-soft text-warn",
        tone === "danger" && "bg-danger-soft text-danger",
        tone === "outline" && "border border-line2 text-ink2",
        tone === "glass" && "bg-white/14 text-white ring-1 ring-inset ring-white/25 backdrop-blur",
        className,
      )}
    >
      {Icon ? <Icon size={size === "sm" ? 12 : 13.5} aria-hidden /> : null}
      {children}
    </span>
  );
}

/** Shown only when the real verification workflow ended with a human approval. */
export function VerifiedBadge({ label, size = "md", glass }: { label: string; size?: "sm" | "md"; glass?: boolean }) {
  return (
    <Badge tone={glass ? "glass" : "gold"} icon={ShieldCheck} size={size}>
      {label}
    </Badge>
  );
}

/** Marks seeded, fictional content so it is never mistaken for a real professional. */
export function DemoBadge({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex h-5 items-center rounded-md border border-dashed border-line2 px-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-faint",
        className,
      )}
    >
      {label}
    </span>
  );
}
