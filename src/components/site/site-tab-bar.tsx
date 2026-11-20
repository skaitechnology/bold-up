"use client";

import { CalendarCheck, House, LayoutDashboard, MessageCircle, Search, ShieldCheck, UserRound } from "lucide-react";
import type { UserRole } from "@/lib/auth/session";
import { useI18n } from "@/lib/i18n/client";
import { TabBar, type TabItem } from "./tab-bar";

/** Phone navigation for the public site, adapted to who is signed in. */
export function SiteTabBar({ role, unreadMessages }: { role: UserRole | null; unreadMessages: number }) {
  const { t } = useI18n();
  const nav = t.common.nav;
  const home: TabItem = { href: "/", label: nav.home, icon: House, exact: true };
  const search: TabItem = { href: "/coachs", label: nav.search, icon: Search, match: ["/coachs", "/coach", "/salles", "/salle"] };

  let items: TabItem[];
  if (role === "coach") {
    items = [
      home,
      search,
      { href: "/pro/messages", label: nav.messages, icon: MessageCircle, badge: unreadMessages },
      { href: "/pro", label: nav.coachSpace, icon: LayoutDashboard, exact: true },
    ];
  } else if (role === "admin") {
    items = [home, search, { href: "/admin", label: nav.admin, icon: ShieldCheck }, { href: "/compte", label: nav.account, icon: UserRound }];
  } else {
    items = [
      home,
      search,
      { href: "/reservations", label: nav.bookings, icon: CalendarCheck },
      { href: "/messages", label: nav.messages, icon: MessageCircle, badge: unreadMessages },
      { href: role ? "/compte" : "/connexion", label: role ? nav.account : nav.login, icon: UserRound, match: ["/compte", "/connexion", "/inscription", "/favoris"] },
    ];
  }
  return <TabBar items={items} label={nav.menu} />;
}
