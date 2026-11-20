"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { CalendarDays, FileCheck2, Inbox, LayoutDashboard, MessageCircle, UserRound, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { TabBar, type TabItem } from "@/components/site/tab-bar";
import { useI18n } from "@/lib/i18n/client";

type Counts = { requests: number; messages: number; documents: number };

function useItems(counts: Counts): (TabItem & { icon: LucideIcon })[] {
  const { t } = useI18n();
  const nav = t.pro.nav;
  return [
    { href: "/pro", label: nav.dashboard, icon: LayoutDashboard, exact: true },
    { href: "/pro/agenda", label: nav.agenda, icon: CalendarDays },
    { href: "/pro/demandes", label: nav.requests, icon: Inbox, badge: counts.requests },
    { href: "/pro/messages", label: nav.messages, icon: MessageCircle, badge: counts.messages },
    { href: "/pro/profil", label: nav.profile, icon: UserRound },
    { href: "/pro/documents", label: nav.documents, icon: FileCheck2, badge: counts.documents },
  ];
}

/** Desktop sidebar navigation of the coach area. */
export function ProSidebarNav({ counts }: { counts: Counts }) {
  const items = useItems(counts);
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "press flex h-11 items-center gap-3 rounded-2xl px-3.5 text-[14.5px] font-medium",
              active ? "bg-white text-ink" : "text-white/70 hover:bg-white/10 hover:text-white",
            )}
          >
            <item.icon size={18} aria-hidden />
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

/** Phone navigation: the five everyday destinations. Documents live in the profile screen. */
export function ProTabBar({ counts }: { counts: Counts }) {
  const { t } = useI18n();
  const items = useItems(counts);
  const phone = items.filter((item) => item.href !== "/pro/documents").map((item) => (item.href === "/pro" ? { ...item, label: t.pro.nav.home } : item));
  phone[4] = { ...phone[4]!, match: ["/pro/profil", "/pro/documents"] };
  return <TabBar items={phone} label={t.common.nav.menu} />;
}
