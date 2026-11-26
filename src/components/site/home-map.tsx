"use client";

import { clsx } from "clsx";
import { useMemo, useState } from "react";
import { MapPreview, findPreview } from "@/components/map/map-preview";
import { MapView } from "@/components/map/map-view";
import { buildMarkers } from "@/components/map/markers";
import type { LatLng } from "@/lib/geo";
import { useI18n } from "@/lib/i18n/client";
import type { CoachCard, EventCard, VenueCard } from "@/lib/search";

/**
 * A live map for a page section: real pins at real positions for whatever it is given
 * (coaches, places of any category, events). A tapped pin opens its preview on the map.
 */
export function HomeMap({
  center,
  coaches,
  venues,
  events = [],
  zoom = 12,
  className,
}: {
  center: LatLng;
  coaches: CoachCard[];
  venues: VenueCard[];
  events?: EventCard[];
  zoom?: number;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const [activeId, setActiveId] = useState<string | null>(null);
  const markers = useMemo(() => buildMarkers({ coaches, venues, events }, locale), [coaches, venues, events, locale]);
  const preview = findPreview(activeId, { coaches, venues, events });
  // re-frame when the set of things shown changes (a filter was applied)
  const fitKey = markers.length > 1 ? markers.map((marker) => marker.id).join("|") : undefined;

  return (
    <div className={clsx("relative h-full w-full", className)}>
      <MapView
        center={center}
        zoom={zoom}
        markers={markers}
        activeId={activeId}
        onSelect={setActiveId}
        fitKey={fitKey}
        focusOnSelect
        cooperative
        padding={{ bottom: preview ? 150 : 0 }}
        clusterLabel={t.explore.cluster}
        fallback={t.site.search.mapUnavailable}
        className="h-full w-full"
      />
      {preview ? (
        <div className="absolute inset-x-3 bottom-3 z-10 mx-auto max-w-[380px]">
          <MapPreview item={preview} onClose={() => setActiveId(null)} />
        </div>
      ) : null}
    </div>
  );
}
