"use client";

import { clsx } from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";
import { CALENDAR_VIEWS, type CalendarView } from "@/lib/calendar";
import { useI18n } from "@/lib/i18n/client";

/** Jour / Semaine / Mois. A segmented control whose thumb slides to the chosen view. */
export function ViewSwitch({ value, onChange, className }: { value: CalendarView; onChange: (view: CalendarView) => void; className?: string }) {
  const { t } = useI18n();
  const index = CALENDAR_VIEWS.indexOf(value);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = CALENDAR_VIEWS[(index + (event.key === "ArrowRight" ? 1 : CALENDAR_VIEWS.length - 1)) % CALENDAR_VIEWS.length]!;
    onChange(next);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-view="${next}"]`)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={t.calendar.viewLabel}
      onKeyDown={onKeyDown}
      className={clsx("relative grid grid-cols-3 rounded-full bg-sand2 p-1 text-[13.5px] font-semibold", className)}
      data-testid="calendar-views"
    >
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-paper shadow-card transition-transform duration-300 ease-out-soft"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {CALENDAR_VIEWS.map((view) => {
        const active = view === value;
        return (
          <button
            key={view}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            data-view={view}
            data-testid={`calendar-view-${view}`}
            onClick={() => onChange(view)}
            className={clsx("press relative z-10 h-9 min-w-0 rounded-full px-3 transition-colors", active ? "text-ink" : "text-muted hover:text-ink")}
          >
            {t.calendar.views[view]}
          </button>
        );
      })}
    </div>
  );
}

const arrowClass =
  "press inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line2 bg-paper text-ink hover:border-ink disabled:cursor-not-allowed disabled:border-line disabled:text-line2 disabled:active:scale-100";

/** Previous / next period, with the period's name in between. */
export function PeriodNav({
  view,
  label,
  hint,
  onPrevious,
  onNext,
  canPrevious = true,
  canNext = true,
  right,
  className,
}: {
  view: CalendarView;
  label: string;
  /** Short note before the label, e.g. "Cette semaine". */
  hint?: string | null;
  onPrevious: () => void;
  onNext: () => void;
  canPrevious?: boolean;
  canNext?: boolean;
  right?: ReactNode;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <button type="button" onClick={onPrevious} disabled={!canPrevious} aria-label={t.calendar.previous[view]} className={arrowClass} data-testid="calendar-previous">
        <ChevronLeft size={18} aria-hidden />
      </button>
      <p className="min-w-0 flex-1 text-center leading-tight" aria-live="polite" data-testid="calendar-period">
        {hint ? <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-flame-strong">{hint}</span> : null}
        <span className="block truncate text-[15px] font-semibold capitalize-first text-ink">{label}</span>
      </p>
      {right}
      <button type="button" onClick={onNext} disabled={!canNext} aria-label={t.calendar.next[view]} className={arrowClass} data-testid="calendar-next">
        <ChevronRight size={18} aria-hidden />
      </button>
    </div>
  );
}
