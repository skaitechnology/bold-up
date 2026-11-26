import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { CalendarDays, CalendarOff } from "lucide-react";
import { BookingsCalendar, type CalendarSession } from "@/components/calendar/bookings-calendar";
import { AvailabilityEditor } from "@/components/pro/availability-editor";
import { DeleteButton } from "@/components/pro/delete-button";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Switch } from "@/components/ui/field";
import { Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { addDayOffAction, deleteDayOffAction, saveBookingSettingsAction } from "@/lib/actions/pro";
import { requireCoach } from "@/lib/auth/session";
import { listBookings } from "@/lib/data/bookings";
import { getOwnCoach, listDaysOff } from "@/lib/data/pro";
import { bookingAnchor, parseCalendarView, parseDateKey } from "@/lib/calendar";
import { formatDateKey, formatDuration, parisDateKey } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.pro.agenda.title };
}

export default async function ProAgendaPage({ searchParams }: { searchParams: Promise<{ vue?: string; semaine?: string; cal?: string; date?: string }> }) {
  const user = await requireCoach("/pro/agenda");
  const [params, { t, locale }, coach, bookings, daysOff] = await Promise.all([
    searchParams,
    getI18n(),
    getOwnCoach(user.id),
    listBookings("coach", user.id),
    listDaysOff(user.id),
  ]);
  if (!coach) return null;
  const a = t.pro.agenda;
  const view = params.vue === "disponibilites" ? "availability" : "sessions";
  const todayKey = parisDateKey(new Date());
  const now = new Date();

  // Sessions that took or will take place. Each one points to its card in "Demandes",
  // on the tab where that page files it.
  const sessions: CalendarSession[] = bookings
    .filter((booking) => booking.status === "requested" || booking.status === "accepted" || booking.status === "completed")
    .map((booking) => {
      const pending = booking.status === "requested" && new Date(booking.starts_at) > now;
      const confirmed = booking.status === "accepted" && new Date(booking.ends_at) > now;
      const tabOfCard = pending ? "" : confirmed ? "?vue=confirmees" : "?vue=historique";
      return {
        id: booking.id,
        startsAt: booking.starts_at,
        endsAt: booking.ends_at,
        durationMin: booking.duration_min,
        status: booking.status,
        expired: booking.status === "requested" && !pending,
        title: booking.customer.name,
        subtitle: booking.service_name,
        location: t.common.locations[booking.location_kind],
        href: `/pro/demandes${tabOfCard}#${bookingAnchor(booking.id)}`,
        hrefLabel: pending ? t.calendar.sessions.seeRequest : t.calendar.sessions.seeRequests,
      };
    });

  const tabClass = (active: boolean) =>
    clsx("press inline-flex h-10 items-center rounded-full px-5 text-[14px] font-semibold", active ? "bg-ink text-paper" : "text-muted hover:text-ink");

  return (
    <div className="space-y-6">
      <PageHeader title={a.title} text={a.text} />
      <div className="inline-flex rounded-full border border-line bg-paper p-1" role="tablist">
        <Link href="/pro/agenda" role="tab" aria-selected={view === "sessions"} className={tabClass(view === "sessions")}>
          {a.tabSessions}
        </Link>
        <Link href="/pro/agenda?vue=disponibilites" role="tab" aria-selected={view === "availability"} className={tabClass(view === "availability")} data-testid="tab-availability">
          {a.tabAvailability}
        </Link>
      </div>

      {view === "sessions" ? (
        <>
          {/* day / week / month; `?semaine=` (links from before the calendar) still opens that week */}
          <BookingsCalendar
            sessions={sessions}
            today={todayKey}
            initialView={parseCalendarView(params.cal)}
            initialDate={parseDateKey(params.date) ?? parseDateKey(params.semaine)}
            daysOff={daysOff.map((item) => ({ from: item.starts_on, to: item.ends_on }))}
            pendingLabel={a.pending}
            sessionTestId="agenda-session"
          />
          {sessions.length === 0 ? <EmptyState icon={CalendarDays} title={a.empty} text={a.emptyText} /> : null}
        </>
      ) : (
        <div className="space-y-5">
          <Card id="disponibilites" className="p-5 md:p-8">
            <h2 className="display text-[22px] text-ink md:text-[26px]">{a.availabilityTitle}</h2>
            <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-muted">{a.availabilityText}</p>
            <div className="mt-4">
              <AvailabilityEditor initial={coach.availability_rules} />
            </div>
          </Card>

          <Card className="p-5 md:p-8">
            <h2 className="display text-[22px] text-ink md:text-[26px]">{a.settingsTitle}</h2>
            <ActionForm action={saveBookingSettingsAction} className="mt-5 max-w-xl space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={a.slotStep}>
                  <Select name="slot_step_min" defaultValue={coach.slot_step_min}>
                    {[15, 30, 60].map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {formatDuration(minutes)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={a.minNotice}>
                  <Select name="min_notice_hours" defaultValue={coach.min_notice_hours}>
                    {[...new Set([0, 2, 6, 12, 24, 48, 72, coach.min_notice_hours])]
                      .sort((x, y) => x - y)
                      .map((hours) => (
                        <option key={hours} value={hours}>
                          {a.hours(hours)}
                        </option>
                      ))}
                  </Select>
                </Field>
              </div>
              <Switch name="accepting_bookings" defaultChecked={coach.accepting_bookings} label={a.accepting} description={a.acceptingText} />
              <SubmitButton>{t.common.actions.save}</SubmitButton>
            </ActionForm>
          </Card>

          <Card className="p-5 md:p-8">
            <h2 className="display text-[22px] text-ink md:text-[26px]">{a.daysOffTitle}</h2>
            <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-muted">{a.daysOffText}</p>
            {daysOff.length === 0 ? (
              <p className="mt-5 rounded-2xl bg-sand px-4 py-3.5 text-[14px] text-muted">{a.dayOffEmpty}</p>
            ) : (
              <ul className="mt-5 space-y-2">
                {daysOff.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3" data-testid="day-off">
                    <CalendarOff size={18} aria-hidden className="shrink-0 text-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14.5px] font-medium capitalize-first text-ink">
                        {formatDateKey(item.starts_on, locale)}
                        {item.ends_on !== item.starts_on ? ` → ${formatDateKey(item.ends_on, locale)}` : ""}
                      </p>
                      {item.reason ? <p className="text-[13px] text-muted">{item.reason}</p> : null}
                    </div>
                    {item.ends_on < todayKey ? (
                      <Badge tone="neutral" size="sm">
                        {t.account.bookings.past}
                      </Badge>
                    ) : null}
                    <DeleteButton action={deleteDayOffAction} id={item.id} label={t.common.actions.delete} success={a.dayOffDeleted} />
                  </li>
                ))}
              </ul>
            )}
            <ActionForm action={addDayOffAction} resetOnSuccess className="mt-5 grid gap-4 rounded-[22px] bg-sand p-4 sm:grid-cols-[1fr_1fr] md:grid-cols-[1fr_1fr_1.4fr_auto] md:items-end md:p-5">
              <Field label={a.dayOffFrom}>
                <Input name="starts_on" type="date" required min={todayKey} />
              </Field>
              <Field label={a.dayOffTo}>
                <Input name="ends_on" type="date" min={todayKey} />
              </Field>
              <Field label={a.dayOffReason} optional={t.common.optional}>
                <Input name="reason" maxLength={120} />
              </Field>
              <SubmitButton variant="secondary" className="!h-12" data-testid="day-off-add">
                {a.dayOffAdd}
              </SubmitButton>
            </ActionForm>
          </Card>
        </div>
      )}
    </div>
  );
}
