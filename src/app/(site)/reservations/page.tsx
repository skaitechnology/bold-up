import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { CalendarCheck, History, Search } from "lucide-react";
import { BookingCard } from "@/components/booking/booking-card";
import { BookingsCalendar, type CalendarSession } from "@/components/calendar/bookings-calendar";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { bookingAnchor, parseCalendarView, parseDateKey } from "@/lib/calendar";
import { listBookings, partitionBookings } from "@/lib/data/bookings";
import { parisDateKey } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.account.bookings.title, robots: { index: false } };
}

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ vue?: string; cal?: string; date?: string }> }) {
  const user = await requireUser("/reservations");
  const [params, { t }, bookings] = await Promise.all([searchParams, getI18n(), listBookings("customer", user.id)]);
  const b = t.account.bookings;
  const now = new Date();
  const { upcoming, past } = partitionBookings(bookings, now);
  const view = params.vue === "passees" ? "past" : "upcoming";
  const list = view === "upcoming" ? upcoming : past;
  const tab = (active: boolean) => clsx("press inline-flex h-10 items-center gap-2 rounded-full px-5 text-[14px] font-semibold", active ? "bg-ink text-paper" : "text-muted hover:text-ink");

  // The calendar shows what took or will take place; each session points to its card below,
  // on whichever tab that card is.
  const sessions: CalendarSession[] = bookings
    .filter((booking) => booking.status === "requested" || booking.status === "accepted" || booking.status === "completed")
    .map((booking) => {
      const tabOfCard = upcoming.includes(booking) ? "upcoming" : "past";
      const anchor = `#${bookingAnchor(booking.id)}`;
      return {
        id: booking.id,
        startsAt: booking.starts_at,
        endsAt: booking.ends_at,
        durationMin: booking.duration_min,
        status: booking.status,
        expired: booking.status === "requested" && new Date(booking.starts_at) <= now,
        title: `${b.with} ${booking.coach.name}`,
        subtitle: booking.service_name,
        location: t.common.locations[booking.location_kind],
        href: tabOfCard === view ? anchor : `/reservations${tabOfCard === "past" ? "?vue=passees" : ""}${anchor}`,
        hrefLabel: t.calendar.sessions.seeBooking,
      };
    });

  return (
    <div className="mx-auto max-w-[880px] px-4 py-8 md:px-8 md:py-12">
      <PageHeader title={b.title} text={b.text} />
      {sessions.length > 0 ? (
        <BookingsCalendar
          className="mt-6"
          sessions={sessions}
          today={parisDateKey(new Date())}
          initialView={parseCalendarView(params.cal)}
          initialDate={parseDateKey(params.date)}
        />
      ) : null}
      <div className="mt-6 inline-flex rounded-full border border-line bg-paper p-1" role="tablist">
        <Link href="/reservations" role="tab" aria-selected={view === "upcoming"} className={tab(view === "upcoming")}>
          {b.upcoming} <span className="tabular text-[12.5px] opacity-65">{upcoming.length}</span>
        </Link>
        <Link href="/reservations?vue=passees" role="tab" aria-selected={view === "past"} className={tab(view === "past")}>
          {b.past} <span className="tabular text-[12.5px] opacity-65">{past.length}</span>
        </Link>
      </div>
      <div className="mt-6 space-y-3">
        {list.length === 0 ? (
          view === "upcoming" ? (
            <EmptyState
              icon={CalendarCheck}
              title={b.emptyUpcoming}
              text={b.emptyUpcomingText}
              action={
                <ButtonLink href="/coachs" variant="accent" icon={Search}>
                  {b.findCoach}
                </ButtonLink>
              }
            />
          ) : (
            <EmptyState icon={History} title={b.emptyPast} />
          )
        ) : (
          list.map((booking) => <BookingCard key={booking.id} booking={booking} as="customer" />)
        )}
      </div>
    </div>
  );
}
