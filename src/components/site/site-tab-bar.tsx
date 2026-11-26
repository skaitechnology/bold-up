"use client";

import { CalendarCheck, House, LayoutDashboard, Map as MapIcon, MessageCircle, Search, ShieldCheck, Trophy, UserRound } from "lucide-react";
import type { UserRole } from "@/lib/auth/session";
import { useI18n } from "@/lib/i18n/client";
import { TabBar, type TabItem } from "./tab-bar";

/**
 * Phone navigation for the public site, adapted to who is signed in. The map sits in the
 * middle for everyone. Whatever is not a tab stays one tap away in the header menu.
 */
export function SiteTabBar({ role, unreadMessages }: { role: UserRole | null; unreadMessages: number }) {
  const { t } = useI18n();
  const nav = t.common.nav;
  const home: TabItem = { href: "/", label: nav.home, icon: House, exact: true };
  const search: TabItem = { href: "/coachs", label: nav.coaches, icon: Search, match: ["/coachs", "/coach"] };
  const map: TabItem = { href: "/carte", label: nav.map, icon: MapIcon, featured: true };

  let items: TabItem[];
  if (role === "coach") {
    items = [home, search, map, { href: "/pro/messages", label: nav.messages, icon: MessageCircle, badge: unreadMessages }, { href: "/pro", label: nav.coachSpace, icon: LayoutDashboard, exact: true }];
  } else if (role === "admin") {
    items = [home, search, map, { href: "/admin", label: nav.admin, icon: ShieldCheck }, { href: "/compte", label: nav.account, icon: UserRound }];
  } else if (role) {
    // signed-in customer: the account lives in the header menu, next to the notifications
    items = [home, search, map, { href: "/reservations", label: nav.bookings, icon: CalendarCheck }, { href: "/messages", label: nav.messages, icon: MessageCircle, badge: unreadMessages }];
  } else {
    items = [
      home,
      search,
      map,
      { href: "/evenements", label: nav.events, icon: Trophy, match: ["/evenements", "/evenement"] },
      { href: "/connexion", label: nav.login, icon: UserRound, match: ["/connexion", "/inscription"] },
    ];
  }
  return <TabBar items={items} label={nav.menu} />;
}
