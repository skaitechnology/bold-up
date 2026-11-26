"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { ArrowRight, CalendarOff, Clock, MapPin, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { BOOKING_TONES } from "@/components/booking/booking-card";
import { Badge } from "@/components/ui/badge";
import {
  DEFAULT_CALENDAR_VIEW,
  groupByParisDay,
  monthGrid,
  nextDayWith,
  periodRange,
  sameMonth,
  shiftPeriod,
  weekDays,
  type CalendarView,
  type DateKey,
} from "@/lib/calendar";
import type { BookingStatus } from "@/lib/domain";
import { formatDuration, formatTime, parisDateKey } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { PeriodNav, ViewSwitch } from "./controls";
import { dayLabel, dayLabelShort, dayNumber, periodLabel, weekdayNarrow, weekdayShort } from "./labels";

/** One session placed on the calendar. Built on the server from a booking. */
export type CalendarSession = {
  id: string;
  startsAt: string;
  endsAt: string;
  durationMin: number;
  status: BookingStatus;
  /** A request nobody answered before its start time. */
  expired?: boolean;
  /** Who the session is with. */
  title: string;
  /** What it is (the service). */
  subtitle: string;
  /** Where, already translated. */
  location?: string;
  /** Where "see more" leads: an anchor on the page or another screen. */
  href?: string;
  hrefLabel?: string;
};

type Props = {
  sessions: CalendarSession[];
  /** Today in Paris, computed on the server so both renders agree. */
  today: DateKey;
  initialView?: CalendarView;
  initialDate?: DateKey | null;
  /** Days the coach is away (inclusive ranges). */
  daysOff?: { from: DateKey; to: DateKey }[];
  /** Short label shown on sessions awaiting an answer (defaults to the status name). */
  pendingLabel?: string;
  sessionTestId?: string;
  className?: string;
};

// Status colours, from the design tokens: confirmed is green, awaiting is amber and dashed.
const STATUS_STYLE: Record<BookingStatus, { block: string; dot: string; accent: string }> = {
  accepted: { block: "bg-success-soft", dot: "bg-success", accent: "text-success" },
  requested: { block: "border border-dashed border-warn/50 bg-warn-soft", dot: "bg-warn", accent: "text-warn" },
  completed: { block: "bg-sand2", dot: "bg-faint", accent: "text-muted" },
  declined: { block: "bg-sand line-through", dot: "bg-line2", accent: "text-faint" },
  cancelled: { block: "bg-sand line-through", dot: "bg-line2", accent: "text-faint" },
};
const LEGEND: BookingStatus[] = ["accepted", "requested", "completed"];
const styleOf = (session: CalendarSession) => STATUS_STYLE[session.expired ? "completed" : session.status];

/**
 * A link to a card elsewhere (`…#reservation-<id>`). With a fragment it is a plain anchor:
 * only a real fragment navigation makes the browser mark the card as `:target`.
 */
function DetailsLink({ href, children }: { href: string; children: ReactNode }) {
  const className = "press mt-3.5 inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-semibold text-paper hover:bg-ink3";
  const content = (
    <>
      {children}
      <ArrowRight size={14} aria-hidden />
    </>
  );
  return href.includes("#") ? (
    <a href={href} className={className} data-testid="calendar-details-link">
      {content}
    </a>
  ) : (
    <Link href={href} className={className} data-testid="calendar-details-link">
      {content}
    </Link>
  );
}

/**
 * Sessions on a calendar, by day, by week (shown first) or by month.
 * Used by the customer's bookings and by the coach's agenda.
 */
export function BookingsCalendar({ sessions, today, initialView = DEFAULT_CALENDAR_VIEW, initialDate, daysOff = [], pendingLabel, sessionTestId, className }: Props) {
  const { t, locale } = useI18n();
  const c = t.calendar;
  const [view, setView] = useState<CalendarView>(initialView);
  const [cursor, setCursor] = useState<DateKey>(initialDate ?? today);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const byDay = useMemo(() => groupByParisDay(sessions, (session) => session.startsAt), [sessions]);
  const range = periodRange(view, cursor);
  const sessionsOf = (key: DateKey) => byDay.get(key) ?? [];
  const isOff = (key: DateKey) => daysOff.some((off) => off.from <= key && key <= off.to);
  const selected = sessions.find((session) => session.id === selectedId) ?? null;
  const statusLabel = (session: CalendarSession) => (session.expired ? t.pro.requests.expired : t.common.bookingStatus[session.status]);

  const inPeriod = [...byDay.keys()].filter((key) => key >= range.from && key <= range.to);
  const count = inPeriod.reduce((sum, key) => sum + sessionsOf(key).length, 0);
  // When the period is empty, point to the next day that has a session still to come.
  const upcoming = sessions
    .filter((session) => !session.expired && (session.status === "requested" || session.status === "accepted"))
    .map((session) => parisDateKey(session.startsAt));
  const next = count === 0 ? nextDayWith(upcoming.filter((key) => key >= today && (key < range.from || key > range.to)), today) : null;

  const move = (direction: -1 | 1) => {
    setCursor(shiftPeriod(view, cursor, direction));
    setSelectedId(null);
  };
  const showsToday = today >= range.from && today <= range.to;
  const hint = view === "week" && showsToday ? c.thisWeek : view === "day" && cursor === today ? c.today : null;

  const sessionButton = (session: CalendarSession, layout: "block" | "row") => {
    const style = styleOf(session);
    const awaiting = session.status === "requested" && !session.expired;
    const active = session.id === selectedId;
    return (
      <button
        type="button"
        onClick={() => setSelectedId(active ? null : session.id)}
        aria-pressed={active}
        data-testid={sessionTestId ?? "calendar-session"}
        data-status={session.expired ? "expired" : session.status}
        className={clsx(
          "press w-full min-w-0 rounded-2xl text-left transition-shadow duration-200 hover:shadow-card",
          layout === "block" ? "px-3 py-2.5" : "flex items-center gap-3 px-3.5 py-3",
          style.block,
          active && "ring-2 ring-ink ring-offset-1",
        )}
      >
        <span className={clsx("flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[13.5px] font-semibold tabular text-ink", layout === "row" ? "w-[112px]" : "flex-wrap gap-y-0")}>
          <span aria-hidden className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", style.dot)} />
          {formatTime(session.startsAt, locale)}
          {layout === "row" ? <span className="font-normal text-muted">– {formatTime(session.endsAt, locale)}</span> : <span className="text-[12px] font-normal text-muted">{formatDuration(session.durationMin)}</span>}
        </span>
        <span className="block min-w-0 flex-1">
          <span className={clsx("text-[13.5px] font-medium text-ink", layout === "row" ? "block truncate" : "line-clamp-2 break-words leading-snug")}>{session.title}</span>
          <span className="block truncate text-[12px] text-muted">{session.subtitle}</span>
          {layout === "block" && session.status === "requested" ? (
            <span className={clsx("mt-0.5 block truncate text-[11.5px] font-semibold", style.accent)}>{awaiting ? (pendingLabel ?? statusLabel(session)) : statusLabel(session)}</span>
          ) : null}
        </span>
        {layout === "row" ? (
          <Badge tone={session.expired ? "neutral" : BOOKING_TONES[session.status]} size="sm" className="max-sm:hidden">
            {awaiting && pendingLabel ? pendingLabel : statusLabel(session)}
          </Badge>
        ) : null}
      </button>
    );
  };

  const dayList = (key: DateKey) => {
    const list = sessionsOf(key);
    if (list.length === 0) return <p className="rounded-2xl bg-sand px-4 py-3.5 text-[14px] text-muted">{c.sessions.noneDay}</p>;
    return (
      <ul className="space-y-2">
        {list.map((session) => (
          <li key={session.id}>{sessionButton(session, "row")}</li>
        ))}
      </ul>
    );
  };

  const offTag = (
    <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-warn">
      <CalendarOff size={12} aria-hidden />
      {c.sessions.dayOff}
    </span>
  );

  return (
    <section className={clsx("rounded-[28px] border border-line bg-paper p-4 md:p-6", className)} aria-label={c.sessions.title} data-testid="bookings-calendar" data-view={view}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between gap-3">
          <h2 className="display text-[20px] text-ink md:text-[22px]">{c.sessions.title}</h2>
          {!showsToday ? (
            <button
              type="button"
              onClick={() => {
                setCursor(today);
                setSelectedId(null);
              }}
              className="press inline-flex h-9 items-center rounded-full border border-line2 px-3.5 text-[13px] font-semibold text-ink hover:border-ink md:hidden"
            >
              {c.today}
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {!showsToday ? (
            <button
              type="button"
              onClick={() => {
                setCursor(today);
                setSelectedId(null);
              }}
              title={c.backToToday}
              className="press hidden h-9 items-center rounded-full border border-line2 px-3.5 text-[13px] font-semibold text-ink hover:border-ink md:inline-flex"
              data-testid="calendar-today"
            >
              {c.today}
            </button>
          ) : null}
          <ViewSwitch
            value={view}
            onChange={(next) => {
              setView(next);
              setSelectedId(null);
            }}
            className="w-full md:w-[280px]"
          />
        </div>
      </div>

      <PeriodNav
        view={view}
        label={periodLabel(view, cursor, locale, c.weekRange)}
        hint={hint}
        onPrevious={() => move(-1)}
        onNext={() => move(1)}
        className="mt-4"
      />
      <p className="mt-1 text-center text-[12.5px] text-muted" data-testid="calendar-count">
        {c.sessions.count(count)}
      </p>

      {/* ------------------------------------------------ week: seven columns on desktop, day by day on phones */}
      {view === "week" ? (
        <div key={range.from} className="animate-fade mt-4 grid gap-2 lg:grid-cols-7">
          {weekDays(cursor).map((key) => {
            const list = sessionsOf(key);
            const isToday = key === today;
            return (
              <div
                key={key}
                className={clsx(
                  "min-w-0 rounded-[20px] border p-2.5 lg:min-h-[190px]",
                  isToday ? "border-flame/50 bg-flame-soft/40" : "border-line bg-paper",
                  list.length === 0 && "max-lg:flex max-lg:items-center max-lg:justify-between max-lg:gap-3 max-lg:py-2",
                )}
                data-day={key}
              >
                <div className="flex items-center justify-between gap-2 lg:block">
                  <button
                    type="button"
                    onClick={() => {
                      setCursor(key);
                      setView("day");
                      setSelectedId(null);
                    }}
                    aria-label={c.sessions.dayLabel(dayLabel(key, locale), c.sessions.count(list.length))}
                    className="press inline-flex items-center gap-1.5 rounded-full text-left"
                  >
                    <span
                      className={clsx(
                        "inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-[13.5px] font-semibold tabular",
                        isToday ? "bg-bold text-white" : "text-ink",
                      )}
                    >
                      {dayNumber(key)}
                    </span>
                    <span className={clsx("text-[12.5px] font-semibold capitalize-first", isToday ? "text-flame-strong" : "text-muted")}>{weekdayShort(key, locale)}</span>
                  </button>
                  {isOff(key) ? <span className="lg:mt-1 lg:block">{offTag}</span> : null}
                </div>
                {list.length > 0 ? (
                  <ul className="mt-2 space-y-1.5">
                    {list.map((session) => (
                      <li key={session.id}>{sessionButton(session, "block")}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[12px] text-faint lg:mt-2" aria-hidden>
                    —
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* ------------------------------------------------ day */}
      {view === "day" ? (
        <div key={cursor} className="animate-fade mt-4" data-day={cursor}>
          {isOff(cursor) ? <p className="mb-2">{offTag}</p> : null}
          {dayList(cursor)}
        </div>
      ) : null}

      {/* ------------------------------------------------ month: the grid, then the chosen day */}
      {view === "month" ? (
        <div key={range.from} className="animate-fade mt-4">
          <div className="grid grid-cols-7 gap-1 pb-1" aria-hidden>
            {weekDays(cursor).map((key) => (
              <span key={key} className="text-center text-[11px] font-semibold uppercase text-faint">
                <span className="sm:hidden">{weekdayNarrow(key, locale)}</span>
                <span className="max-sm:hidden">{weekdayShort(key, locale)}</span>
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthGrid(cursor)
              .flat()
              .map((key) => {
                const list = sessionsOf(key);
                const inMonth = sameMonth(key, cursor);
                const active = key === cursor;
                const isToday = key === today;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setCursor(key);
                      setSelectedId(null);
                    }}
                    aria-pressed={active}
                    aria-label={c.sessions.dayLabel(dayLabel(key, locale), c.sessions.count(list.length))}
                    className={clsx(
                      "press flex min-h-[58px] min-w-0 flex-col items-stretch gap-1 rounded-xl border p-1 text-left sm:min-h-[84px] sm:p-1.5",
                      active ? "border-ink bg-sand" : "border-line bg-paper hover:border-line2",
                      !inMonth && "opacity-45",
                      isOff(key) && !active && "bg-warn-soft/50",
                    )}
                    data-day={key}
                  >
                    <span
                      className={clsx(
                        "inline-flex h-6 min-w-6 items-center justify-center self-start rounded-full px-1 text-[12.5px] font-semibold tabular",
                        isToday ? "bg-bold text-white" : "text-ink",
                      )}
                    >
                      {dayNumber(key)}
                    </span>
                    {/* phones: one dot per session · wider screens: the first two sessions */}
                    <span className="flex flex-wrap gap-0.5 px-0.5 sm:hidden" aria-hidden>
                      {list.slice(0, 4).map((session) => (
                        <span key={session.id} className={clsx("h-1.5 w-1.5 rounded-full", styleOf(session).dot)} />
                      ))}
                    </span>
                    <span className="hidden min-w-0 flex-col gap-0.5 sm:flex" aria-hidden>
                      {list.slice(0, 2).map((session) => (
                        <span key={session.id} className={clsx("truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium text-ink", styleOf(session).block)}>
                          <span className="tabular font-semibold">{formatTime(session.startsAt, locale)}</span> {session.title}
                        </span>
                      ))}
                      {list.length > 2 ? <span className="px-1.5 text-[11px] font-semibold text-muted">{c.sessions.more(list.length - 2)}</span> : null}
                    </span>
                  </button>
                );
              })}
          </div>
          <div className="mt-4" data-day={cursor}>
            <p className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px] font-semibold text-ink">
              {c.sessions.sessionsOf(dayLabel(cursor, locale))}
              {isOff(cursor) ? offTag : null}
            </p>
            {dayList(cursor)}
          </div>
        </div>
      ) : null}

      {/* nothing in this period: where the next session is */}
      {count === 0 && view !== "day" ? <p className="mt-3 rounded-2xl bg-sand px-4 py-3.5 text-[14px] text-muted">{view === "week" ? c.sessions.noneWeek : c.sessions.noneMonth}</p> : null}
      {next ? (
        <button
          type="button"
          onClick={() => {
            setCursor(next);
            setSelectedId(null);
          }}
          className="press mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-4 py-2 text-left text-[13px] font-semibold text-paper hover:bg-ink3"
          data-testid="calendar-next-session"
        >
          <span className="capitalize-first">{c.sessions.nextSession(dayLabelShort(next, locale))}</span>
          <ArrowRight size={14} aria-hidden className="shrink-0" />
        </button>
      ) : null}

      {/* ------------------------------------------------ the session that was clicked */}
      {selected ? (
        <div key={selected.id} className="animate-fade-up mt-4 rounded-[22px] border border-line bg-sand p-4" aria-live="polite" data-testid="calendar-details">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow text-muted">{c.sessions.details}</p>
              <p className="mt-1.5 truncate text-[16.5px] font-semibold tracking-tight text-ink">{selected.title}</p>
              <p className="truncate text-[14px] text-ink2">{selected.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label={t.common.actions.close}
              className="press -mr-1 -mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink2 hover:bg-paper"
            >
              <X size={18} aria-hidden />
            </button>
          </div>
          <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13.5px] text-muted">
            <li>
              <Badge tone={selected.expired ? "neutral" : BOOKING_TONES[selected.status]} size="sm">
                {statusLabel(selected)}
              </Badge>
            </li>
            <li className="inline-flex items-center gap-1.5 tabular">
              <Clock size={14} aria-hidden />
              <span className="capitalize-first">{dayLabel(parisDateKey(selected.startsAt), locale)}</span>· {formatTime(selected.startsAt, locale)} – {formatTime(selected.endsAt, locale)}
            </li>
            {selected.location ? (
              <li className="inline-flex items-center gap-1.5">
                <MapPin size={14} aria-hidden />
                {selected.location}
              </li>
            ) : null}
          </ul>
          {selected.href ? <DetailsLink href={selected.href}>{selected.hrefLabel ?? t.common.actions.view}</DetailsLink> : null}
        </div>
      ) : null}

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-[12px] text-muted" aria-label={c.sessions.legend}>
        {LEGEND.map((status) => (
          <li key={status} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={clsx("h-2 w-2 rounded-full", STATUS_STYLE[status].dot)} />
            {t.common.bookingStatus[status]}
          </li>
        ))}
      </ul>
    </section>
  );
}
