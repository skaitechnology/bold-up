"use client";

import { clsx } from "clsx";
import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import {
  BOOKING_HORIZON_DAYS,
  DEFAULT_CALENDAR_VIEW,
  bookingHorizon,
  canShiftPeriod,
  clampKey,
  dayPartOf,
  groupByParisDay,
  monthGrid,
  nextDayWith,
  periodRange,
  sameMonth,
  shiftWithin,
  weekDays,
  type CalendarView,
  type DateKey,
  type DayPart,
} from "@/lib/calendar";
import { formatTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/config";
import { PeriodNav, ViewSwitch } from "./controls";
import { dayLabel, dayNumber, periodLabel, weekdayNarrow, weekdayShort } from "./labels";

type Props = {
  /** Free start times, as ISO instants. */
  slots: string[];
  /** Today in Paris. */
  today: DateKey;
  /** The day in focus (its times are shown in full). */
  day: DateKey | null;
  /** The chosen start time. */
  startsAt: string | null;
  onDay: (day: DateKey) => void;
  onSlot: (slot: string) => void;
};

/** How many times a day shows in the week view before "+n". */
const WEEK_PREVIEW = 3;
const PARTS: DayPart[] = ["morning", "afternoon", "evening"];

function TimeChip({ slot, active, locale, onSelect }: { slot: string; active: boolean; locale: Locale; onSelect: (slot: string) => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelect(slot)}
      data-testid="slot"
      className={clsx(
        "press h-10 min-w-0 rounded-xl border text-[13.5px] font-semibold tabular",
        active ? "border-transparent bg-bold text-white shadow-glow" : "border-line2 bg-paper text-ink hover:border-flame-strong hover:text-flame-strong",
      )}
    >
      {formatTime(slot, locale)}
    </button>
  );
}

/**
 * Where a session can start, shown by day, by week or by month. The week comes first:
 * seven days with their first free times, so a slot is one tap away.
 */
export function SlotPicker({ slots, today, day, startsAt, onDay, onSlot }: Props) {
  const { t, locale } = useI18n();
  const c = t.calendar;
  const [view, setView] = useState<CalendarView>(DEFAULT_CALENDAR_VIEW);

  const max = bookingHorizon(today);
  const byDay = useMemo(() => groupByParisDay(slots, (slot) => slot), [slots]);
  const cursor = clampKey(day ?? today, today, max);
  const range = periodRange(view, cursor);
  const chosenDay = useMemo(() => (startsAt ? [...byDay.entries()].find(([, times]) => times.includes(startsAt))?.[0] : null) ?? null, [byDay, startsAt]);

  const timesOf = (key: DateKey) => byDay.get(key) ?? [];
  const inRange = (key: DateKey) => key >= today && key <= max;

  /** Moves one period and lands on its first day with free times, when there is one. */
  const go = (direction: -1 | 1) => {
    const target = shiftWithin(view, cursor, direction, today, max);
    if (view === "day") return onDay(target);
    const period = periodRange(view, target);
    const firstFree = [...byDay.keys()].sort().find((key) => key >= period.from && key <= period.to);
    onDay(firstFree ?? target);
  };

  const nextFree = nextDayWith(
    [...byDay.keys()].filter((key) => key > range.to),
    range.to,
  );
  const jump = nextFree ?? nextDayWith(byDay.keys(), today);

  const emptyPeriod = (message: string) => (
    <div className="flex flex-col items-start gap-3 rounded-2xl bg-sand px-4 py-4">
      <p className="text-[14px] text-muted">{message}</p>
      {jump && !(jump >= range.from && jump <= range.to) ? (
        <button
          type="button"
          onClick={() => onDay(jump)}
          className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-semibold text-paper hover:bg-ink3"
          data-testid="next-available"
        >
          {c.slots.nextAvailable}
          <ArrowRight size={14} aria-hidden />
        </button>
      ) : null}
    </div>
  );

  /** All the times of one day, split into morning / afternoon / evening. */
  const dayTimes = (key: DateKey) => {
    const times = timesOf(key);
    if (times.length === 0) return emptyPeriod(c.slots.noneDay);
    return (
      <div className="space-y-3">
        {PARTS.map((part) => {
          const list = times.filter((slot) => dayPartOf(slot) === part);
          if (list.length === 0) return null;
          return (
            <div key={part}>
              <p className="eyebrow mb-1.5 text-faint">{c.slots.parts[part]}</p>
              <div className="grid grid-cols-4 gap-1.5">
                {list.map((slot) => (
                  <TimeChip key={slot} slot={slot} active={slot === startsAt} locale={locale} onSelect={onSlot} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const hint = view === "week" && today >= range.from && today <= range.to ? c.thisWeek : view === "day" && cursor === today ? c.today : null;

  return (
    <div className="space-y-3.5" data-testid="slot-picker" data-view={view}>
      <ViewSwitch value={view} onChange={setView} />
      <PeriodNav
        view={view}
        label={periodLabel(view, cursor, locale, c.weekRange)}
        hint={hint}
        onPrevious={() => go(-1)}
        onNext={() => go(1)}
        canPrevious={canShiftPeriod(view, cursor, -1, today, max)}
        canNext={canShiftPeriod(view, cursor, 1, today, max)}
      />

      {/* ------------------------------------------------ week: seven days, their first times in view */}
      {view === "week" ? (
        <div key={range.from} className="animate-fade">
          <ul className="space-y-1">
            {/* days already gone are left out: this week starts today */}
            {weekDays(cursor)
              .filter(inRange)
              .map((key) => {
                const times = timesOf(key);
                if (times.length === 0) {
                  return (
                    <li key={key} className="flex h-8 items-center gap-2.5 px-1.5 text-[13px] text-faint" data-day={key}>
                      <span className="w-[50px] shrink-0 text-center text-[11.5px] font-semibold uppercase tracking-wide">
                        {weekdayShort(key, locale)} {dayNumber(key)}
                      </span>
                      <span className="truncate">{c.slots.count(0)}</span>
                    </li>
                  );
                }
                const active = key === cursor;
                // the focused day and the day of the chosen time show every time
                const open = active || key === chosenDay;
                const shown = open || times.length <= WEEK_PREVIEW + 1 ? times : times.slice(0, WEEK_PREVIEW);
                const hidden = times.length - shown.length;
                return (
                  <li
                    key={key}
                    className={clsx("flex gap-2.5 rounded-[18px] p-1.5 transition-colors duration-300", active ? "bg-flame-soft" : "bg-transparent")}
                    data-day={key}
                  >
                    <button
                      type="button"
                      aria-pressed={active}
                      aria-label={c.slots.dayLabel(dayLabel(key, locale), c.slots.count(times.length))}
                      onClick={() => onDay(key)}
                      data-testid="day-available"
                      className={clsx(
                        "press relative flex h-[52px] w-[50px] shrink-0 flex-col items-center justify-center rounded-2xl text-center",
                        active ? "bg-bold text-white shadow-glow" : "border border-line2 bg-paper text-ink hover:border-flame-strong",
                      )}
                    >
                      <span className="text-[10.5px] font-semibold uppercase tracking-wide">{weekdayShort(key, locale)}</span>
                      <span className="mt-0.5 text-[17px] font-semibold leading-none tabular">{dayNumber(key)}</span>
                      {key === today ? <span aria-hidden className={clsx("absolute bottom-1 h-1 w-1 rounded-full", active ? "bg-white" : "bg-flame")} /> : null}
                    </button>
                    <div className="grid min-w-0 flex-1 grid-cols-4 content-center gap-1.5">
                      {shown.map((slot) => (
                        <TimeChip key={slot} slot={slot} active={slot === startsAt} locale={locale} onSelect={onSlot} />
                      ))}
                      {hidden > 0 ? (
                        <button
                          type="button"
                          onClick={() => onDay(key)}
                          aria-label={c.slots.moreLabel(hidden, dayLabel(key, locale))}
                          className="press h-10 min-w-0 rounded-xl bg-sand2 text-[13px] font-semibold tabular text-ink2 hover:bg-line"
                          data-testid="slot-more"
                        >
                          {c.slots.more(hidden)}
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
          </ul>
          {weekDays(cursor).every((key) => timesOf(key).length === 0) ? <div className="mt-2.5">{emptyPeriod(c.slots.noneWeek)}</div> : null}
        </div>
      ) : null}

      {/* ------------------------------------------------ day: every time of one day */}
      {view === "day" ? (
        <div key={cursor} className="animate-fade" data-day={cursor}>
          {dayTimes(cursor)}
        </div>
      ) : null}

      {/* ------------------------------------------------ month: which days are free, then that day's times */}
      {view === "month" ? (
        <div key={range.from} className="animate-fade space-y-3.5">
          <div>
            <div className="grid grid-cols-7 gap-1 pb-1" aria-hidden>
              {weekDays(cursor).map((key) => (
                <span key={key} className="text-center text-[11px] font-semibold uppercase text-faint">
                  {weekdayNarrow(key, locale)}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthGrid(cursor)
                .flat()
                .map((key) => {
                  const times = timesOf(key);
                  const inMonth = sameMonth(key, cursor);
                  const available = inMonth && times.length > 0;
                  const active = available && key === cursor;
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!available}
                      aria-hidden={inMonth ? undefined : true}
                      aria-pressed={inMonth ? active : undefined}
                      aria-label={inMonth ? c.slots.dayLabel(dayLabel(key, locale), c.slots.count(times.length)) : undefined}
                      onClick={() => onDay(key)}
                      data-testid={available ? "day-available" : undefined}
                      className={clsx(
                        "press relative flex h-11 min-w-0 flex-col items-center justify-center rounded-xl text-[14px] tabular",
                        !inMonth && "invisible",
                        active
                          ? "bg-bold font-semibold text-white shadow-glow"
                          : available
                            ? "border border-line2 bg-paper font-semibold text-ink hover:border-flame-strong"
                            : "text-faint disabled:cursor-default",
                        key === today && !active && "ring-1 ring-inset ring-ink/25",
                      )}
                    >
                      {dayNumber(key)}
                      {available ? <span aria-hidden className={clsx("absolute bottom-1.5 h-1 w-1 rounded-full", active ? "bg-white" : "bg-flame")} /> : null}
                    </button>
                  );
                })}
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-faint">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-flame" />
              {c.slots.legend} · {c.slots.horizon(BOOKING_HORIZON_DAYS)}
            </p>
          </div>
          {monthGrid(cursor)
            .flat()
            .every((key) => !sameMonth(key, cursor) || timesOf(key).length === 0) ? (
            emptyPeriod(c.slots.noneMonth)
          ) : (
            <div data-day={cursor}>
              <p className="mb-2 text-[13px] font-semibold text-ink">{c.slots.timesOf(dayLabel(cursor, locale))}</p>
              {dayTimes(cursor)}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
