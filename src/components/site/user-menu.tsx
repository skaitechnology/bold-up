"use client";

import Link from "next/link";
import {
  CalendarCheck,
  Heart,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { signOutAction } from "@/lib/actions/auth";
import type { UserRole } from "@/lib/auth/session";
import { initials } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";

type Item = { href: string; label: string; icon: LucideIcon; badge?: number };

export function UserMenu({ name, email, role, unreadMessages }: { name: string; email: string; role: UserRole; unreadMessages: number }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const nav = t.common.nav;
  const items: Item[] =
    role === "coach"
      ? [
          { href: "/pro", label: nav.coachSpace, icon: LayoutDashboard },
          { href: "/pro/messages", label: nav.messages, icon: MessageCircle, badge: unreadMessages },
          { href: "/compte", label: nav.account, icon: UserRound },
        ]
      : role === "admin"
        ? [
            { href: "/admin", label: nav.admin, icon: ShieldCheck },
            { href: "/compte", label: nav.account, icon: UserRound },
          ]
        : [
            { href: "/reservations", label: nav.bookings, icon: CalendarCheck },
            { href: "/messages", label: nav.messages, icon: MessageCircle, badge: unreadMessages },
            { href: "/favoris", label: nav.favorites, icon: Heart },
            { href: "/compte", label: nav.account, icon: UserRound },
          ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={nav.account}
        onClick={() => setOpen((value) => !value)}
        className="press relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-paper"
      >
        {initials(name || email)}
        {unreadMessages > 0 ? <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-paper bg-gold" /> : null}
      </button>
      {open ? (
        <div
          role="menu"
          className="animate-pop absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-3xl border border-line bg-paper p-2 shadow-pop"
        >
          <div className="px-3 pb-2 pt-2.5">
            <p className="truncate text-[14.5px] font-semibold text-ink">{name || email}</p>
            <p className="truncate text-[12.5px] text-muted">{email}</p>
          </div>
          <div className="my-1 h-px bg-line" />
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex h-11 items-center gap-3 rounded-2xl px-3 text-[14.5px] text-ink2 hover:bg-sand"
            >
              <item.icon size={17} aria-hidden className="text-muted" />
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1.5 text-[11px] font-semibold text-paper">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          ))}
          <div className="my-1 h-px bg-line" />
          <form action={signOutAction}>
            <button type="submit" role="menuitem" className="flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-[14.5px] text-ink2 hover:bg-sand">
              <LogOut size={17} aria-hidden className="text-muted" />
              {nav.logout}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
