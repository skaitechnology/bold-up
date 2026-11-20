import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { Bell, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { markNotificationsReadAction } from "@/lib/actions/messages";
import { requireUser, safeNext } from "@/lib/auth/session";
import { listDocumentTypes } from "@/lib/data/pro";
import { formatDateTimeCompact } from "@/lib/format";
import { localizedName } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { notificationText } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.common.notifications.title, robots: { index: false } };
}

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const [{ t, locale }, supabase, types] = await Promise.all([getI18n(), createClient(), listDocumentTypes()]);
  const { data: rows } = await supabase
    .from("notifications")
    .select("id, kind, data, link, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(60);
  const notifications = rows ?? [];
  const unread = notifications.filter((item) => !item.read_at).length;
  const documentName = (code: string) => {
    const type = types.find((item) => item.code === code);
    return type ? localizedName(type, locale) : code;
  };

  return (
    <div className="mx-auto max-w-[760px] px-4 py-8 md:px-8 md:py-12">
      <PageHeader
        title={t.common.notifications.title}
        right={
          unread > 0 ? (
            <form action={markNotificationsReadAction}>
              <Button type="submit" variant="secondary" size="sm">
                {t.common.actions.markAllRead}
              </Button>
            </form>
          ) : undefined
        }
      />
      {notifications.length === 0 ? (
        <EmptyState className="mt-8" icon={Bell} title={t.common.notifications.empty} />
      ) : (
        <ul className="mt-6 overflow-hidden rounded-[24px] border border-line bg-paper">
          {notifications.map((item) => {
            const href = safeNext(item.link) ?? "#";
            return (
              <li key={item.id} className="border-t border-line first:border-t-0">
                <Link href={href} className="flex items-center gap-3.5 px-4 py-4 hover:bg-sand md:px-5" data-testid="notification">
                  <span className={clsx("h-2.5 w-2.5 shrink-0 rounded-full", item.read_at ? "bg-transparent" : "bg-gold")} />
                  <span className="min-w-0 flex-1">
                    <span className={clsx("block text-[14.5px] leading-snug", item.read_at ? "text-ink2" : "font-semibold text-ink")}>
                      {notificationText(item, t, documentName)}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] text-faint">{formatDateTimeCompact(item.created_at, locale)}</span>
                  </span>
                  <ChevronRight size={17} aria-hidden className="shrink-0 text-faint" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
