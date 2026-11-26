"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { MapPin, X } from "lucide-react";
import { EventIcon, PlaceIcon } from "@/components/brand/kind-icon";
import { SportIcon } from "@/components/brand/sport-icon";
import { CoachPortrait } from "@/components/coach/coach-portrait";
import { Badge, DemoBadge, VerifiedBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { placeHref } from "@/lib/domain";
import { formatDistance, formatPrice, parisDateKey } from "@/lib/format";
import { localizedName } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { daysUntil, type CoachCard, type EventCard, type VenueCard } from "@/lib/search";
import { shortDate } from "./markers";

export type PreviewItem = { type: "coach"; coach: CoachCard } | { type: "place"; place: VenueCard } | { type: "event"; event: EventCard };

/** "Aujourd'hui", "Demain", "J-12"… for an event, from today's Paris date. */
export function useCountdown() {
  const { t } = useI18n();
  const p = t.explore.preview;
  return (event: Pick<EventCard, "startsOn" | "endsOn">, today = parisDateKey(new Date())) => {
    const days = daysUntil(event.startsOn, today);
    if (days < 0) return p.ongoing;
    if (days === 0) return p.today;
    if (days === 1) return p.tomorrow;
    return p.inDays(days);
  };
}

function Where({ city, distanceKm }: { city: string | null; distanceKm: number | null }) {
  const { locale } = useI18n();
  return (
    <p className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted">
      <MapPin size={13} aria-hidden className="shrink-0" />
      <span className="truncate">
        {city}
        {distanceKm != null ? ` · ${formatDistance(distanceKm, locale)}` : ""}
      </span>
    </p>
  );
}

/**
 * The card that opens when a pin is tapped: enough of the profile, the place or the event
 * to decide, without leaving the map.
 */
export function MapPreview({ item, onClose, className }: { item: PreviewItem; onClose: () => void; className?: string }) {
  const { t, locale } = useI18n();
  const p = t.explore.preview;
  const countdown = useCountdown();
  const tone = item.type === "coach" ? (item.coach.sports[0]?.slug ?? "coach") : item.type === "place" ? item.place.category : item.event.kind;

  return (
    <div
      key={item.type === "coach" ? item.coach.id : item.type === "place" ? item.place.id : item.event.id}
      data-tone={tone}
      data-testid="map-preview"
      className={clsx("animate-pop relative overflow-hidden rounded-[26px] bg-paper p-3 shadow-pop ring-1 ring-line", className)}
    >
      <span aria-hidden className="tone-solid absolute inset-x-0 top-0 h-1" />
      <button
        type="button"
        onClick={onClose}
        aria-label={t.common.actions.close}
        className="press absolute right-2.5 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-sand text-ink2 hover:bg-sand2"
      >
        <X size={16} aria-hidden />
      </button>

      {item.type === "coach" ? (
        <>
          <div className="flex gap-3.5 pt-1">
            <Link href={`/coach/${item.coach.slug}`} className="tone-ring relative m-1 h-[100px] w-[84px] shrink-0 overflow-hidden rounded-[18px] bg-sand2">
              <CoachPortrait photoPath={item.coach.photoPath} name={item.coach.displayName} />
            </Link>
            <div className="min-w-0 flex-1 pr-8">
              <div className="flex flex-wrap items-center gap-1.5">
                <VerifiedBadge label={t.common.verified} size="sm" />
                {item.coach.isDemo ? <DemoBadge label={t.common.demo} /> : null}
              </div>
              <Link href={`/coach/${item.coach.slug}`} className="display mt-1.5 block truncate text-[19px] text-ink">
                {item.coach.displayName}
              </Link>
              <p className="mt-0.5 line-clamp-1 text-[13px] text-muted">{item.coach.headline}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.coach.sports.slice(0, 3).map((sport) => (
                  <span key={sport.id} data-tone={sport.slug} className="tone-soft inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11.5px] font-semibold">
                    <SportIcon icon={sport.icon} size={11} />
                    {localizedName(sport, locale)}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 px-1">
            <Where city={item.coach.city} distanceKm={item.coach.distanceKm} />
            {item.coach.minPriceCents != null ? (
              <p className="shrink-0 text-[13px] text-muted">
                {t.common.from} <span className="text-[17px] font-bold text-ink">{formatPrice(item.coach.minPriceCents, locale)}</span>
              </p>
            ) : null}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ButtonLink href={`/coach/${item.coach.slug}`} variant="secondary" className="!px-3">
              {p.viewProfile}
            </ButtonLink>
            <ButtonLink href={`/coach/${item.coach.slug}?reserver=1`} variant="accent" className="!px-3">
              {p.book}
            </ButtonLink>
          </div>
        </>
      ) : item.type === "place" ? (
        <>
          <div className="flex gap-3.5 pt-1">
            <span className="tone-cover flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[20px]">
              <PlaceIcon category={item.place.category} size={30} />
            </span>
            <div className="min-w-0 flex-1 pr-8">
              <p className="tone-text text-[11.5px] font-bold uppercase tracking-[0.08em]">{t.common.venueCategories[item.place.category]}</p>
              <Link href={placeHref(item.place)} className="display mt-1 block truncate text-[18px] text-ink">
                {item.place.name}
              </Link>
              <div className="mt-1">
                <Where city={item.place.city} distanceKm={item.place.distanceKm} />
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5 px-1">
            {item.place.partner ? (
              <Badge tone="gold" size="sm">
                {t.site.venues.partner}
              </Badge>
            ) : null}
            {item.place.isFree ? (
              <Badge tone="success" size="sm">
                {p.free}
              </Badge>
            ) : null}
            {item.place.alwaysOpen ? (
              <Badge tone="tone" size="sm">
                {p.alwaysOpen}
              </Badge>
            ) : null}
            {item.place.category === "street_workout" ? (
              <Badge tone="outline" size="sm">
                {p.outdoor}
              </Badge>
            ) : null}
            {item.place.isDemo ? <DemoBadge label={t.common.demo} /> : null}
          </div>
          <ButtonLink href={placeHref(item.place)} variant="primary" block className="mt-3">
            {p.viewPlace}
          </ButtonLink>
        </>
      ) : (
        <>
          <div className="flex gap-3.5 pt-1">
            <span className="tone-cover flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center rounded-[20px] leading-none">
              <span className="display text-[26px]">{Number(item.event.startsOn.slice(8))}</span>
              <span className="mt-1 text-[11px] font-bold uppercase tracking-[0.06em]">{shortDate(item.event.startsOn, locale).replace(/^\d+\s*/, "")}</span>
            </span>
            <div className="min-w-0 flex-1 pr-8">
              <p className="tone-text flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.08em]">
                <EventIcon kind={item.event.kind} size={13} />
                {t.events.kinds[item.event.kind]}
              </p>
              <Link href={`/evenement/${item.event.slug}`} className="display mt-1 line-clamp-2 block text-[18px] leading-[1.1] text-ink">
                {item.event.name}
              </Link>
              <div className="mt-1.5">
                <Where city={item.event.city} distanceKm={item.event.distanceKm} />
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5 px-1">
            <Badge tone="tone-solid" size="sm">
              {countdown(item.event)}
            </Badge>
            {item.event.isFree ? (
              <Badge tone="success" size="sm">
                {p.free}
              </Badge>
            ) : item.event.priceFromCents != null ? (
              <Badge tone="neutral" size="sm">
                {t.common.from} {formatPrice(item.event.priceFromCents, locale)}
              </Badge>
            ) : null}
            {item.event.isDemo ? <DemoBadge label={t.common.demo} /> : null}
          </div>
          <ButtonLink href={`/evenement/${item.event.slug}`} variant="primary" block className="mt-3">
            {p.viewEvent}
          </ButtonLink>
        </>
      )}
    </div>
  );
}

/** Finds what a pin id stands for among the things shown on a map. */
export function findPreview(id: string | null, input: { coaches?: CoachCard[]; venues?: VenueCard[]; events?: EventCard[] }): PreviewItem | null {
  if (!id) return null;
  const coach = input.coaches?.find((item) => item.id === id);
  if (coach) return { type: "coach", coach };
  const place = input.venues?.find((item) => item.id === id);
  if (place) return { type: "place", place };
  const event = input.events?.find((item) => item.id === id);
  return event ? { type: "event", event } : null;
}
