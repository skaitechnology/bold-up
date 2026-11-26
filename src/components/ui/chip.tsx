import Link from "next/link";
import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Filter chip. Give it a `tone` (a sport slug, a place category or an event kind) and the
 * selected state takes that colour; without one it falls back to ink.
 */
export function chipClass({ active, size = "md", className }: { active?: boolean; size?: "sm" | "md"; className?: string } = {}) {
  return clsx(
    "press inline-flex shrink-0 select-none items-center gap-2 whitespace-nowrap rounded-full border font-medium",
    size === "sm" ? "h-9 px-3.5 text-[13px]" : "h-10 px-4 text-[13.5px]",
    active ? "tone-solid tone-border shadow-card" : "border-line2 bg-paper text-ink2 hover:border-ink",
    className,
  );
}

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  active?: boolean;
  tone?: string;
  size?: "sm" | "md";
  className?: string;
  children: ReactNode;
};

export function Chip({ active, tone, size, className, children, type = "button", ...rest }: ChipProps) {
  return (
    <button {...rest} type={type} aria-pressed={active} data-tone={tone} className={chipClass({ active, size, className })}>
      {children}
    </button>
  );
}

/** Same look, as a link (for filters that live in the URL and are rendered on the server). */
export function ChipLink({
  href,
  active,
  tone,
  size,
  className,
  children,
  ...rest
}: {
  href: string;
  active?: boolean;
  tone?: string;
  size?: "sm" | "md";
  className?: string;
  children: ReactNode;
  "data-testid"?: string;
}) {
  return (
    <Link {...rest} href={href} scroll={false} aria-current={active ? "true" : undefined} data-tone={tone} className={chipClass({ active, size, className })}>
      {children}
    </Link>
  );
}
