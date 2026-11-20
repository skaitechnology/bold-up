import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { CalendarDays, CalendarOff, ChevronLeft, ChevronRight } from "lucide-react";
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
import { addDaysToKey, formatDateKey, formatDuration, formatTime, parisDateKey } from "@/lib/format";
import { intlLocale } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.pro.agenda.title };
}

/** Monday (as YYYY-MM-DD) of the week containing `key`. */
function mondayOf(key: string): string {
  const day = new Date(`${key}T12:00:00Z`).getUTCDay();
  return addDaysToKey(key, -((day + 6) % 7));
}

export default async function ProAgendaPage({ searchParams }: { searchParams: Promise<{ vue?: string; semaine?: string }> }) {
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
  const week = /^\d{4}-\d{2}-\d{2}$/.test(params.semaine ?? "") ? mondayOf(params.semaine as string) : mondayOf(todayKey);
  const days = Array.from({ length: 7 }, (_, index) => addDaysToKey(week, index));
  const live = bookings.filter((booking) => booking.status === "requested" || booking.status === "accepted");
  const inWeek = live.filter((booking) => days.includes(parisDateKey(booking.starts_at)));
  const offOn = (key: string) => daysOff.some((item) => item.starts_on <= key && key <= item.ends_on);
  const rangeLabel = `${new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${days[0]}T12:00:00Z`))} – ${new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${days[6]}T12:00:00Z`))}`;

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
          <div className="flex items-center justify-between gap-3">
            <p className="text-[17px] font-semibold tracking-tight text-ink">
              {week === mondayOf(todayKey) ? a.thisWeek : a.week} <span className="font-normal text-muted">· {rangeLabel}</span>
            </p>
            <div className="flex items-center gap-1.5">
              <Link
                href={`/pro/agenda?semaine=${addDaysToKey(week, -7)}`}
                aria-label={a.previous}
                className="press inline-flex h-10 w-10 items-center justify-center rounded-full border border-line2 bg-paper text-ink hover:border-ink"
              >
                <ChevronLeft size={18} aria-hidden />
              </Link>
              <Link
                href={`/pro/agenda?semaine=${addDaysToKey(week, 7)}`}
                aria-label={a.next}
                className="press inline-flex h-10 w-10 items-center justify-center rounded-full border border-line2 bg-paper text-ink hover:border-ink"
              >
                <ChevronRight size={18} aria-hidden />
              </Link>
            </div>
          </div>

          {/* calendar overview: seven columns on desktop, a day-by-day list on phones */}
          <div className="grid gap-3 lg:grid-cols-7 lg:gap-2">
            {days.map((key) => {
              const sessions = inWeek.filter((booking) => parisDateKey(booking.starts_at) === key);
              const isToday = key === todayKey;
              const off = offOn(key);
              if (sessions.length === 0 && !isToday) {
                // keep quiet days compact on phones
              }
              return (
                <section
                  key={key}
                  className={clsx(
                    "rounded-[20px] border bg-paper p-3.5 lg:min-h-[260px] lg:p-3",
                    isToday ? "border-ink" : "border-line",
                    sessions.length === 0 && "max-lg:py-3",
                  )}
                >
                  <h2 className="flex items-baseline justify-between gap-2 lg:block">
                    <span className={clsx("inline-block text-[13px] font-semibold capitalize-first", isToday ? "text-ink" : "text-muted")}>{formatDateKey(key, locale, "short")}</span>
                    {off ? (
                      <span className="inline-flex items-center gap-1 text-[12px] text-warn lg:mt-1 lg:flex">
                        <CalendarOff size={12} aria-hidden />
                        {a.dayOffReason.split(" ")[0]}
                      </span>
                    ) : null}
                  </h2>
                  <ul className="mt-2.5 space-y-2">
                    {sessions.map((booking) => {
                      const confirmed = booking.status === "accepted";
                      return (
                        <li
                          key={booking.id}
                          className={clsx("rounded-2xl px-3 py-2.5", confirmed ? "bg-ink text-paper" : "border border-dashed border-line2 bg-sand text-ink")}
                          data-testid="agenda-session"
                        >
                          <p className="text-[14px] font-semibold tabular">
                            {formatTime(booking.starts_at, locale)}
                            <span className={clsx("ml-1.5 text-[12px] font-normal", confirmed ? "text-white/65" : "text-muted")}>{formatDuration(booking.duration_min)}</span>
                          </p>
                          <p className="truncate text-[13px]">{booking.customer.name}</p>
                          <p className={clsx("truncate text-[12px]", confirmed ? "text-white/65" : "text-muted")}>{booking.service_name}</p>
                          {!confirmed ? (
                            <Link href="/pro/demandes" className="mt-1 inline-block text-[12px] font-semibold underline underline-offset-2">
                              {a.pending}
                            </Link>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
          {inWeek.length === 0 ? <EmptyState icon={CalendarDays} title={a.empty} text={a.emptyText} /> : null}
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
