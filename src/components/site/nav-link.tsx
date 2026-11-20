"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Top navigation link that knows when it is the current section. */
export function NavLink({ href, match, children }: { href: string; match?: string; children: ReactNode }) {
  const pathname = usePathname();
  const base = match ?? href.split("?")[0] ?? href;
  const active = pathname === base || pathname.startsWith(`${base}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "press inline-flex h-10 items-center rounded-full px-4 text-[14.5px] font-medium",
        active ? "bg-sand text-ink" : "text-ink2 hover:bg-sand",
      )}
    >
      {children}
    </Link>
  );
}
