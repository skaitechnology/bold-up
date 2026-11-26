import Link from "next/link";
import { clsx } from "clsx";
import { ArrowUpRight, Clock, MapPin } from "lucide-react";
import { EventIcon } from "@/components/brand/kind-icon";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { formatDistance, formatPrice } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { EventCard as EventItem } from "@/lib/search";
import { countdownLabel, dateTile, eventCountdown, eventDateLabel } from "./utils";

/** The bold date block: month, day number, weekday. Coloured by the nearest data-tone. */
export function DateTile({ dateKey, locale, size = "md", className }: { dateKey: string; locale: Locale; size?: "md" | "lg"; className?: string }) {
  const { day, month, weekday } = dateTile(dateKey, locale);
  return (
    <span
      className={clsx(
        "flex shrink-0 flex-col items-center justify-center rounded-2xl bg-paper text-ink shadow-card",
        size === "lg" ? "h-[92px] w-[80px] gap-0.5" : "h-[70px] w-[60px]",
        className,
      )}
    >
      <span className={clsx("tone-text font-bold uppercase tracking-[0.12em]", size === "lg" ? "text-[12px]" : "text-[10.5px]")}>{month}</span>
      <span className={clsx("display", size === "lg" ? "text-[36px]" : "text-[26px]")}>{day}</span>
      <span className={clsx("font-medium uppercase text-faint", size === "lg" ? "text-[11px]" : "text-[9.5px]")}>{weekday}</span>
    </span>
  );
}

/** Countdown pill: "Aujourd'hui", "Demain", "J-12", "En cours". Renders nothing once the event is over. */
export function CountdownPill({ event, today, t, className }: { event: Pick<EventItem, "startsOn" | "endsOn">; today: string; t: Dictionary; className?: string }) {
  const countdown = eventCountdown(event, today);
  const label = countdownLabel(countdown, t.events.countdown);
  if (!label) return null;
  const soon = countdown.state !== "upcoming" || countdown.days <= 7;
  return (
    <span
      className={clsx(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] font-bold tabular",
        soon ? "bg-volt text-volt-ink" : "bg-ink/80 text-paper backdrop-blur",
        className,
      )}
    >
      {soon ? <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-volt-ink" /> : null}
      {label}
    </span>
  );
}

/**
 * One event, as a card: coloured cover with the date, then what, when, where and how much.
 * The colour comes from the event kind (tone system).
 */
export function EventCardView({ event, t, locale, today, className }: { event: EventItem; t: Dictionary; locale: Locale; today: string; className?: string }) {
  const e = t.events;
  const where = [event.placeName, event.city].filter(Boolean).join(" · ");
  const formats = event.formats.slice(0, 3);
  const moreFormats = event.formats.length - formats.length;

  return (
    <article data-tone={event.kind} className={clsx("group hover-lift h-full overflow-hidden rounded-[24px] border border-line bg-paper", className)}>
      <Link href={`/evenement/${event.slug}`} className="flex h-full flex-col" data-testid="event-card">
        <div className="tone-cover relative h-[128px] shrink-0 overflow-hidden">
          <EventIcon
            kind={event.kind}
            size={132}
            className="absolute -bottom-7 -right-5 -rotate-12 opacity-25 transition-transform duration-500 ease-out-soft group-hover:-rotate-6 group-hover:scale-110"
          />
          <DateTile dateKey={event.startsOn} locale={locale} className="absolute left-4 top-4" />
          <CountdownPill event={event} today={today} t={t} className="absolute right-4 top-4" />
        </div>
        <div className="flex flex-1 flex-col p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="tone" size="sm">
              <EventIcon kind={event.kind} size={12} />
              {e.kinds[event.kind]}
            </Badge>
            {event.isDemo ? <DemoBadge label={t.common.demo} /> : null}
          </div>
          <h3 className="mt-2.5 line-clamp-2 text-[17.5px] font-semibold leading-snug tracking-tight text-ink">{event.name}</h3>
          <p className="mt-1.5 flex items-center gap-1.5 text-[13.5px] text-ink2">
            <Clock size={14} aria-hidden className="shrink-0 text-muted" />
            <span className="capitalize-first truncate">
              {eventDateLabel(event, locale, e.dateRange)}
              {event.startTime ? ` · ${event.startTime}` : ""}
            </span>
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[13.5px] text-muted">
            <MapPin size={14} aria-hidden className="shrink-0" />
            <span className="truncate">
              {where}
              {event.distanceKm != null ? ` · ${formatDistance(event.distanceKm, locale)}` : ""}
            </span>
          </p>
          {formats.length ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {formats.map((format) => (
                <li key={format} className="inline-flex h-6 items-center rounded-full bg-sand2 px-2.5 text-[12px] font-medium text-ink2">
                  {format}
                </li>
              ))}
              {moreFormats > 0 ? (
                <li className="inline-flex h-6 items-center rounded-full bg-sand2 px-2.5 text-[12px] font-medium text-muted">{e.moreFormats(moreFormats)}</li>
              ) : null}
            </ul>
          ) : null}
          <div className="mt-auto flex items-center justify-between gap-3 pt-4">
            {event.isFree ? (
              <span className="inline-flex h-7 items-center rounded-full bg-success-soft px-3 text-[13px] font-semibold text-success">{e.free}</span>
            ) : event.priceFromCents != null ? (
              <span className="text-[13.5px] text-muted">
                {t.common.from} <span className="text-[16px] font-semibold text-ink">{formatPrice(event.priceFromCents, locale)}</span>
              </span>
            ) : (
              <span />
            )}
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand2 text-ink transition-all duration-300 ease-out-soft group-hover:tone-solid group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            >
              <ArrowUpRight size={17} />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
