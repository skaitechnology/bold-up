"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { Building2, CalendarDays, LayoutDashboard, Settings, UserCheck, Users, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";

/** Back-office navigation: a sidebar on desktop, a scrollable row of pills on phones. */
export function AdminNav({ pending, orientation }: { pending: number; orientation: "vertical" | "horizontal" }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const nav = t.admin.nav;
  const items: { href: string; label: string; icon: LucideIcon; badge?: number; exact?: boolean }[] = [
    { href: "/admin", label: nav.dashboard, icon: LayoutDashboard, exact: true },
    { href: "/admin/coachs", label: nav.coaches, icon: UserCheck, badge: pending },
    { href: "/admin/salles", label: nav.venues, icon: Building2 },
    { href: "/admin/evenements", label: t.events.admin.nav, icon: CalendarDays },
    { href: "/admin/utilisateurs", label: nav.users, icon: Users },
    { href: "/admin/reglages", label: nav.settings, icon: Settings },
  ];
  return (
    <nav className={orientation === "vertical" ? "space-y-1" : "no-scrollbar flex gap-2 overflow-x-auto px-4 py-2.5"}>
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "press flex shrink-0 items-center gap-2.5 font-medium",
              orientation === "vertical" ? "h-11 rounded-2xl px-3.5 text-[14.5px]" : "h-10 rounded-full border px-4 text-[13.5px]",
              orientation === "vertical"
                ? active
                  ? "bg-white text-ink"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
                : active
                  ? "border-ink bg-ink text-paper"
                  : "border-line2 bg-paper text-ink2",
            )}
          >
            <item.icon size={orientation === "vertical" ? 18 : 15} aria-hidden />
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[11px] font-bold text-ink">{item.badge}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
