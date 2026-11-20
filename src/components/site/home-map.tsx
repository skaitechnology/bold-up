"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { CoachPortrait } from "@/components/coach/coach-portrait";
import { MapView, type MapMarker } from "@/components/map/map-view";
import { formatPrice } from "@/lib/format";
import type { LatLng } from "@/lib/geo";
import { useI18n } from "@/lib/i18n/client";
import type { CoachCard, VenueCard } from "@/lib/search";

/** Live map preview on the home page: real pins, real positions. */
export function HomeMap({ center, coaches, venues }: { center: LatLng; coaches: CoachCard[]; venues: VenueCard[] }) {
  const { t, locale } = useI18n();
  const [activeId, setActiveId] = useState<string | null>(null);

  const markers = useMemo<MapMarker[]>(
    () => [
      ...venues.map((venue) => ({
        id: venue.id,
        kind: "venue" as const,
        lat: venue.lat,
        lng: venue.lng,
        label: "",
        title: venue.name,
        partner: venue.partner,
      })),
      ...coaches
        .filter((coach) => coach.lat != null && coach.lng != null)
        .map((coach) => ({
          id: coach.id,
          kind: "coach" as const,
          lat: coach.lat as number,
          lng: coach.lng as number,
          label: coach.minPriceCents != null ? formatPrice(coach.minPriceCents, locale) : coach.displayName,
          title: coach.displayName,
        })),
    ],
    [coaches, venues, locale],
  );

  const coach = coaches.find((item) => item.id === activeId);
  const venue = venues.find((item) => item.id === activeId);

  return (
    <div className="relative h-full w-full">
      <MapView
        center={center}
        zoom={12}
        markers={markers}
        activeId={activeId}
        onSelect={setActiveId}
        cooperative
        fallback={t.site.search.mapUnavailable}
        className="h-full w-full"
      />
      {coach || venue ? (
        <div className="animate-pop absolute inset-x-3 bottom-3 z-10 mx-auto max-w-sm rounded-[22px] bg-paper p-2.5 shadow-pop">
          <button
            type="button"
            onClick={() => setActiveId(null)}
            aria-label={t.common.actions.close}
            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-sand"
          >
            <X size={16} aria-hidden />
          </button>
          {coach ? (
            <Link href={`/coach/${coach.slug}`} className="flex items-center gap-3 pr-8">
              <span className="h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-sand2">
                <CoachPortrait photoPath={coach.photoPath} name={coach.displayName} />
              </span>
              <span className="min-w-0">
                <span className="display block truncate text-[17px] text-ink">{coach.displayName}</span>
                <span className="mt-1 block truncate text-[13px] text-muted">{coach.headline}</span>
              </span>
            </Link>
          ) : venue ? (
            <Link href={`/salle/${venue.slug}`} className="block px-2 py-1.5 pr-9">
              <span className="block truncate text-[15.5px] font-semibold text-ink">{venue.name}</span>
              <span className="mt-0.5 block truncate text-[13px] text-muted">
                {t.common.venueCategories[venue.category]} · {venue.city}
              </span>
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
