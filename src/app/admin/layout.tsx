import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLink, LogOut } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { Logo } from "@/components/brand/logo";
import { LanguageSwitch } from "@/components/site/language-switch";
import { signOutAction } from "@/lib/actions/auth";
import { requireAdmin } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: { default: t.common.nav.admin, template: `%s · ${t.common.nav.admin} · Bold Up` }, robots: { index: false, follow: false } };
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Server-side gate: anyone who is not an admin gets a 404 before anything renders.
  const user = await requireAdmin();
  const [{ t }, supabase] = await Promise.all([getI18n(), createClient()]);
  const { count } = await supabase.from("coach_profiles").select("id", { count: "exact", head: true }).eq("verification_status", "awaiting_review");
  const pending = count ?? 0;

  return (
    <div className="min-h-dvh bg-sand lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="on-dark sticky top-0 hidden h-dvh flex-col bg-ink px-4 py-6 text-paper lg:flex">
        <div className="px-2">
          <Logo href="/admin" inverse />
          <p className="eyebrow mt-2 text-gold">{t.common.nav.admin}</p>
        </div>
        <div className="mt-8 flex-1">
          <AdminNav pending={pending} orientation="vertical" />
        </div>
        <Link href="/" className="press mb-3 flex h-11 items-center gap-2.5 rounded-2xl px-3.5 text-[14px] text-white/70 hover:bg-white/10 hover:text-white">
          <ExternalLink size={16} aria-hidden />
          {t.admin.nav.backToSite}
        </Link>
        <p className="truncate px-3.5 text-[12.5px] text-white/50">{user.email}</p>
        <div className="mt-3 flex items-center justify-between px-1">
          <LanguageSwitch inverse />
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
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 border-b border-line bg-paper/92 backdrop-blur-md lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Logo href="/admin" size="sm" />
            <div className="flex items-center gap-1.5">
              <LanguageSwitch />
              <form action={signOutAction}>
                <button type="submit" aria-label={t.common.nav.logout} className="press inline-flex h-10 w-10 items-center justify-center rounded-full text-ink2 hover:bg-sand">
                  <LogOut size={18} aria-hidden />
                </button>
              </form>
            </div>
          </div>
          <AdminNav pending={pending} orientation="horizontal" />
        </header>
        <main id="contenu" className="mx-auto w-full max-w-[1240px] px-4 pb-16 pt-6 md:px-8 md:pt-10">
          {children}
        </main>
      </div>
    </div>
  );
}
