"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

export type TabItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: string[];
  badge?: number;
  exact?: boolean;
  /** The map: a raised, coloured button in the middle of the bar. */
  featured?: boolean;
};

/** Bottom navigation on phones. Hidden from tablet width up, where the header takes over. */
export function TabBar({ items, label }: { items: TabItem[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-safe backdrop-blur-md md:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1">
        {items.map((item) => {
          const bases = item.match ?? [item.href];
          const active = item.exact ? pathname === item.href : bases.some((base) => pathname === base || pathname.startsWith(`${base}/`));
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "press relative flex h-[60px] flex-col items-center justify-center gap-1 text-[10.5px] font-medium",
                  active ? "text-ink" : "text-faint",
                  item.featured && "!font-semibold !text-ink",
                )}
              >
                {item.featured ? (
                  <span
                    className={clsx(
                      "-mt-6 flex h-[50px] w-[50px] items-center justify-center rounded-full bg-bold text-white shadow-glow ring-4 ring-paper transition-transform duration-300 ease-spring",
                      active && "scale-110",
                    )}
                  >
                    <item.icon size={23} strokeWidth={2.3} aria-hidden />
                  </span>
                ) : (
                  <span className="relative">
                    <item.icon size={21} strokeWidth={active ? 2.4 : 1.9} aria-hidden />
                    {item.badge ? (
                      <span className="absolute -right-2 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-flame px-1 text-[9.5px] font-bold text-white">
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    ) : null}
                    {active ? <span aria-hidden className="absolute -bottom-[19px] left-1/2 h-[3px] w-5 -translate-x-1/2 rounded-full bg-bold" /> : null}
                  </span>
                )}
                <span className="max-w-full truncate px-1">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
