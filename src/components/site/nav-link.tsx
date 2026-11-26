"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Top navigation link that knows when it is the current section. */
export function NavLink({
  href,
  match,
  featured,
  className,
  children,
}: {
  href: string;
  /** Path prefixes that count as "this section" (defaults to the link's own path). */
  match?: string | string[];
  /** The map: the one entry that wears the brand gradient. */
  featured?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const bases = match ? (Array.isArray(match) ? match : [match]) : [href.split("?")[0] ?? href];
  const active = bases.some((base) => pathname === base || pathname.startsWith(`${base}/`));
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "press inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[14.5px] font-medium",
        featured
          ? "bg-bold font-semibold text-white shadow-glow hover:brightness-110"
          : active
            ? "bg-ink text-paper"
            : "text-ink2 hover:bg-sand",
        className,
      )}
    >
      {children}
    </Link>
  );
}
