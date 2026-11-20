import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Bell, ExternalLink, LogOut } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ProSidebarNav, ProTabBar } from "@/components/pro/pro-nav";
import { LanguageSwitch } from "@/components/site/language-switch";
import { Avatar } from "@/components/ui/misc";
import { signOutAction } from "@/lib/actions/auth";
import { requireCoach } from "@/lib/auth/session";
import { getOwnCoach } from "@/lib/data/pro";
import { getShellData } from "@/lib/data/shell";
import { documentNeedsAction } from "@/lib/domain";
import { getI18n } from "@/lib/i18n/server";
import { mediaUrl } from "@/lib/media";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: { default: t.common.nav.coachSpace, template: `%s · ${t.common.nav.coachSpace} · Bold Up` }, robots: { index: false } };
}

export default async function ProLayout({ children }: { children: ReactNode }) {
  const user = await requireCoach();
  const [{ t }, coach, shell, supabase] = await Promise.all([getI18n(), getOwnCoach(user.id), getShellData(), createClient()]);
  const [requests, documents] = await Promise.all([
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("coach_id", user.id)
      .eq("status", "requested")
      .gt("starts_at", new Date().toISOString()),
    supabase.from("coach_documents").select("status").eq("coach_id", user.id),
  ]);
  const counts = {
    requests: requests.count ?? 0,
    messages: shell.unreadMessages,
    documents: (documents.data ?? []).filter((document) => documentNeedsAction(document.status)).length,
  };
  const name = coach?.display_name || user.fullName || user.email;

  return (
    <div className="min-h-dvh bg-sand lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      {/* desktop sidebar */}
      <aside className="on-dark sticky top-0 hidden h-dvh flex-col bg-ink px-4 py-6 text-paper lg:flex">
        <div className="px-2">
          <Logo href="/pro" inverse />
          <p className="eyebrow mt-2 text-gold">{t.common.nav.coachSpace}</p>
        </div>
        <div className="mt-8 flex-1">
          <ProSidebarNav counts={counts} />
        </div>
        {coach ? (
          <Link
            href={`/coach/${coach.slug}`}
            className="press mb-3 flex items-center gap-3 rounded-2xl bg-white/8 p-3 hover:bg-white/12"
            data-testid="public-profile-link"
          >
            <Avatar src={mediaUrl(coach.photo_path)} name={name} size={40} className="!bg-white/15 !text-white" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold">{name}</span>
              <span className="flex items-center gap-1 text-[12px] text-white/60">
                {t.pro.nav.publicProfile}
                <ExternalLink size={11} aria-hidden />
              </span>
            </span>
          </Link>
        ) : null}
        <div className="flex items-center justify-between gap-2 px-1">
          <LanguageSwitch inverse />
          <div className="flex items-center gap-1">
            <Link
              href="/notifications"
              aria-label={t.common.nav.notifications}
              className="press relative inline-flex h-10 w-10 items-center justify-center rounded-full text-white/75 hover:bg-white/10 hover:text-white"
            >
              <Bell size={18} aria-hidden />
              {shell.unreadNotifications > 0 ? <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-gold" /> : null}
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                aria-label={t.common.nav.logout}
                title={t.common.nav.logout}
                className="press inline-flex h-10 w-10 items-center justify-center rounded-full text-white/75 hover:bg-white/10 hover:text-white"
                data-testid="logout"
              >
                <LogOut size={18} aria-hidden />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        {/* phone top bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-line bg-paper/92 px-4 backdrop-blur-md lg:hidden">
          <Logo href="/pro" />
          <div className="flex items-center gap-1.5">
            <LanguageSwitch />
            <Link
              href="/notifications"
              aria-label={t.common.nav.notifications}
              className="press relative inline-flex h-10 w-10 items-center justify-center rounded-full text-ink2 hover:bg-sand"
            >
              <Bell size={19} aria-hidden />
              {shell.unreadNotifications > 0 ? <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-gold" /> : null}
            </Link>
            <form action={signOutAction}>
              <button type="submit" aria-label={t.common.nav.logout} className="press inline-flex h-10 w-10 items-center justify-center rounded-full text-ink2 hover:bg-sand">
                <LogOut size={18} aria-hidden />
              </button>
            </form>
          </div>
        </header>
        <main id="contenu" className="mx-auto w-full max-w-[1120px] px-4 pb-[calc(92px+env(safe-area-inset-bottom))] pt-6 md:px-8 md:pt-10 lg:pb-16">
          {children}
        </main>
      </div>
      <ProTabBar counts={counts} />
    </div>
  );
}
