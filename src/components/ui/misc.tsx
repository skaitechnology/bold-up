import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { initials } from "@/lib/format";

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={clsx("rounded-[24px] border border-line bg-paper", className)}>
      {children}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  text?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-col items-center rounded-[24px] border border-dashed border-line2 bg-sand/60 px-6 py-12 text-center", className)}>
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-paper text-ink shadow-card">
        <Icon size={22} aria-hidden />
      </span>
      <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-ink">{title}</h3>
      {text ? <p className="mt-1.5 max-w-sm text-[14px] leading-relaxed text-muted">{text}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ProgressBar({ value, className, label }: { value: number; className?: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={clsx("h-2 w-full overflow-hidden rounded-full bg-sand2", className)}
    >
      <div className="h-full rounded-full bg-ink transition-[width] duration-700 ease-out-soft" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ProgressRing({ value, size = 92, stroke = 8, children }: { value: number; size?: number; stroke?: number; children?: ReactNode }) {
  const pct = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-white/15" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
          className="stroke-gold transition-[stroke-dashoffset] duration-700 ease-out-soft"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

export function Avatar({ src, name, size = 44, className }: { src?: string | null; name: string; size?: number; className?: string }) {
  return (
    <span
      className={clsx("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-sand2 font-semibold text-ink2", className)}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.36) }}
    >
      {src ? <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" /> : initials(name)}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  text,
  right,
  className,
}: {
  eyebrow?: string;
  title: string;
  text?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-2 text-gold-ink">{eyebrow}</p> : null}
        <h1 className="display text-[30px] text-ink md:text-[40px]">{title}</h1>
        {text ? <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-muted">{text}</p> : null}
      </div>
      {right ? <div className="flex shrink-0 flex-wrap items-center gap-2">{right}</div> : null}
    </div>
  );
}

export function Notice({
  tone = "neutral",
  icon: Icon,
  title,
  children,
  className,
}: {
  tone?: "neutral" | "gold" | "success" | "warn" | "danger";
  icon?: LucideIcon;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex gap-3 rounded-2xl px-4 py-3.5 text-[14px] leading-relaxed",
        tone === "neutral" && "bg-sand text-ink2",
        tone === "gold" && "bg-gold-soft text-gold-ink",
        tone === "success" && "bg-success-soft text-success",
        tone === "warn" && "bg-warn-soft text-warn",
        tone === "danger" && "bg-danger-soft text-danger",
        className,
      )}
    >
      {Icon ? <Icon size={18} className="mt-0.5 shrink-0" aria-hidden /> : null}
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={clsx(title && "mt-0.5", "text-current/90")}>{children}</div> : null}
      </div>
    </div>
  );
}
