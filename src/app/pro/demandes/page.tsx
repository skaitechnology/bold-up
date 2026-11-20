import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { CalendarCheck, History, Inbox, Lock } from "lucide-react";
import { BookingCard } from "@/components/booking/booking-card";
import { EmptyState, Notice, PageHeader } from "@/components/ui/misc";
import { requireCoach } from "@/lib/auth/session";
import { listBookings } from "@/lib/data/bookings";
import { getOwnCoach } from "@/lib/data/pro";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.pro.requests.title };
}

export default async function ProRequestsPage({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const user = await requireCoach("/pro/demandes");
  const [params, { t }, coach, bookings] = await Promise.all([searchParams, getI18n(), getOwnCoach(user.id), listBookings("coach", user.id)]);
  const r = t.pro.requests;
  const now = new Date();
  const pending = bookings.filter((booking) => booking.status === "requested" && new Date(booking.starts_at) > now);
  const confirmed = bookings.filter((booking) => booking.status === "accepted" && new Date(booking.ends_at) > now);
  // "accepted" sessions whose end has passed stay actionable (mark as completed) at the top of the history.
  const history = bookings.filter((booking) => !pending.includes(booking) && !confirmed.includes(booking)).sort((a, b) => b.starts_at.localeCompare(a.starts_at));

  const view = params.vue === "confirmees" ? "confirmed" : params.vue === "historique" ? "history" : "pending";
  const tabs = [
    { key: "pending", href: "/pro/demandes", label: r.tabPending, count: pending.length },
    { key: "confirmed", href: "/pro/demandes?vue=confirmees", label: r.tabConfirmed, count: confirmed.length },
    { key: "history", href: "/pro/demandes?vue=historique", label: r.tabHistory, count: history.length },
  ] as const;
  const list = view === "pending" ? pending : view === "confirmed" ? confirmed : history;

  return (
    <div className="space-y-6">
      <PageHeader title={r.title} text={r.text} />
      {coach && coach.verification_status !== "approved" ? (
        <Notice tone="gold" icon={Lock}>
          {t.pro.dashboard.bookingsLocked}
        </Notice>
      ) : null}
      <div className="no-scrollbar -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="inline-flex rounded-full border border-line bg-paper p-1" role="tablist">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              role="tab"
              aria-selected={view === tab.key}
              data-testid={`tab-${tab.key}`}
              className={clsx(
                "press inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[14px] font-semibold",
                view === tab.key ? "bg-ink text-paper" : "text-muted hover:text-ink",
              )}
            >
              {tab.label}
              <span className={clsx("tabular text-[12.5px]", view === tab.key ? "text-white/65" : "text-faint")}>{tab.count}</span>
            </Link>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        view === "pending" ? (
          <EmptyState icon={Inbox} title={r.emptyPending} text={r.emptyPendingText} />
        ) : view === "confirmed" ? (
          <EmptyState icon={CalendarCheck} title={r.emptyConfirmed} />
        ) : (
          <EmptyState icon={History} title={r.emptyHistory} />
        )
      ) : (
        <div className="space-y-3">
          {list.map((booking) => (
            <BookingCard key={booking.id} booking={booking} as="coach" />
          ))}
        </div>
      )}
    </div>
  );
}
