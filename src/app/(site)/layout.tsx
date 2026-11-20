import type { ReactNode } from "react";
import { Settings } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteTabBar } from "@/components/site/site-tab-bar";
import { EmptyState } from "@/components/ui/misc";
import { getShellData } from "@/lib/data/shell";
import { isSupabaseConfigured } from "@/lib/env";
import { getI18n } from "@/lib/i18n/server";

/** Chrome of the public site and the customer area: header on top, tab bar on phones. */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured) {
    const { t } = await getI18n();
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl items-center px-4">
        <EmptyState icon={Settings} title={t.common.setup.title} text={t.common.setup.text} className="w-full" />
      </main>
    );
  }
  const { user, unreadMessages } = await getShellData();
  return (
    <>
      <SiteHeader />
      <main id="contenu" className="min-h-[calc(100dvh-64px)] pb-[calc(60px+env(safe-area-inset-bottom))] md:min-h-[calc(100dvh-72px)] md:pb-0">
        {children}
      </main>
      <SiteTabBar role={user?.role ?? null} unreadMessages={unreadMessages} />
    </>
  );
}
