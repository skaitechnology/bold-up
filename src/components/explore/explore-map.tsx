"use client";

import { clsx } from "clsx";
import { Box, Layers, Maximize2, Minus, Plus, SearchX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { EventIcon, PlaceIcon } from "@/components/brand/kind-icon";
import { SportIcon } from "@/components/brand/sport-icon";
import { CoachPortrait } from "@/components/coach/coach-portrait";
import {
  MapPreview,
  findPreview,
  useCountdown,
} from "@/components/map/map-preview";
import { MapView, type MapApi } from "@/components/map/map-view";
import { buildMarkers } from "@/components/map/markers";
import { CityCombobox } from "@/components/site/city-combobox";
import { Chip } from "@/components/ui/chip";
import { isGymCategory } from "@/lib/domain";
import { EXPLORE_LAYERS, LAYER_PARAM, type ExploreLayer } from "@/lib/explore";
import { formatDistance } from "@/lib/format";
import { localizedName } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import {
  searchCoaches,
  searchEvents,
  searchVenues,
  type CoachCard,
  type EventCard,
  type SportRef,
  type VenueCard,
} from "@/lib/search";
import { DEFAULT_SEARCH_PLACE, type SearchPlace } from "@/lib/search-params";

const LAYER_TONE: Record<ExploreLayer, string | undefined> = {
  all: undefined,
  coaches: "coach",
  clubs: "club",
  spots: "street_workout",
  events: "event",
  venues: "gym",
};

type Props = {
  coaches: CoachCard[];
  venues: VenueCard[];
  events: EventCard[];
  sports: SportRef[];
  /** Today in Paris, YYYY-MM-DD: past events are left out. */
  today: string;
  initial: {
    layer: ExploreLayer;
    sport: string | null;
    place: SearchPlace;
    activeId: string | null;
  };
};

type RailItem =
  | { id: string; type: "coach"; coach: CoachCard; distanceKm: number | null }
  | { id: string; type: "place"; place: VenueCard; distanceKm: number | null }
  | { id: string; type: "event"; event: EventCard; distanceKm: number | null };

const controlClass =
  "press inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-paper/95 text-ink shadow-card backdrop-blur hover:border-ink";

/**
 * The map as an experience of its own: everything Bold Up knows about an area on one
 * living map, with quick filters, a rail of what is nearby and previews that open in place.
 */
export function ExploreMap({
  coaches,
  venues,
  events,
  sports,
  today,
  initial,
}: Props) {
  const { t, locale } = useI18n();
  const x = t.explore;
  const countdown = useCountdown();
  const [layer, setLayer] = useState<ExploreLayer>(initial.layer);
  const [sport, setSport] = useState<string | null>(initial.sport);
  const [place, setPlace] = useState<SearchPlace>(initial.place);
  const [activeId, setActiveId] = useState<string | null>(initial.activeId);
  const [focus, setFocus] = useState<{ id: string; nonce: number } | null>(
    initial.activeId ? { id: initial.activeId, nonce: 0 } : null,
  );
  const [pitched, setPitched] = useState(false);
  const [recenter, setRecenter] = useState(0);
  const apiRef = useRef<MapApi | null>(null);
  const railRef = useRef<HTMLDivElement>(null);

  // ---- what is on the map, given the filters
  const shown = useMemo(() => {
    const on = (key: ExploreLayer) => layer === "all" || layer === key;
    const sorted = {
      coaches: on("coaches")
        ? searchCoaches(coaches, { center: place, sport })
        : [],
      events: on("events")
        ? searchEvents(events, { center: place, today, sport, sort: "date" })
        : [],
      clubs: on("clubs")
        ? searchVenues(venues, { center: place, categories: ["club"], sport })
        : [],
      // a discipline filter is about people, clubs and events: general places step aside
      spots:
        on("spots") && !sport
          ? searchVenues(venues, {
              center: place,
              categories: ["street_workout"],
            })
          : [],
      gyms:
        on("venues") && !sport
          ? searchVenues(venues, { center: place }).filter((venue) =>
              isGymCategory(venue.category),
            )
          : [],
    };
    return {
      ...sorted,
      places: [...sorted.clubs, ...sorted.spots, ...sorted.gyms],
    };
  }, [coaches, venues, events, layer, sport, place, today]);

  const counts = useMemo(
    () => ({
      coaches: coaches.length,
      clubs: venues.filter((venue) => venue.category === "club").length,
      spots: venues.filter((venue) => venue.category === "street_workout")
        .length,
      events: searchEvents(events, { today }).length,
      venues: venues.filter((venue) => isGymCategory(venue.category)).length,
    }),
    [coaches, venues, events, today],
  );

  const markers = useMemo(
    () =>
      buildMarkers(
        { coaches: shown.coaches, venues: shown.places, events: shown.events },
        locale,
      ),
    [shown, locale],
  );
  const total = markers.length;

  const rail = useMemo<RailItem[]>(() => {
    const items: RailItem[] = [
      ...shown.coaches.map((coach) => ({
        id: coach.id,
        type: "coach" as const,
        coach,
        distanceKm: coach.distanceKm,
      })),
      ...shown.events.map((event) => ({
        id: event.id,
        type: "event" as const,
        event,
        distanceKm: event.distanceKm,
      })),
      ...shown.places.map((item) => ({
        id: item.id,
        type: "place" as const,
        place: item,
        distanceKm: item.distanceKm,
      })),
    ];
    return items
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
      .slice(0, 16);
  }, [shown]);

  const preview = findPreview(activeId, {
    coaches: shown.coaches,
    venues: shown.places,
    events: shown.events,
  });

  // ---- keep the address bar in step, so the view can be shared (no navigation involved)
  useEffect(() => {
    const params = new URLSearchParams();
    if (layer !== "all") params.set("couche", LAYER_PARAM[layer]);
    if (sport) params.set("sport", sport);
    if (place.isMe || place.name !== DEFAULT_SEARCH_PLACE.name) {
      params.set("ville", place.name);
      params.set("lat", place.lat.toFixed(5));
      params.set("lng", place.lng.toFixed(5));
      if (place.isMe) params.set("moi", "1");
    }
    const query = params.toString();
    window.history.replaceState(null, "", query ? `/carte?${query}` : "/carte");
  }, [layer, sport, place]);

  const choose = (id: string) => {
    setActiveId(id);
    setFocus((current) => ({ id, nonce: (current?.nonce ?? 0) + 1 }));
  };
  const pickLayer = (next: ExploreLayer) => {
    setActiveId(null);
    setLayer((current) => (current === next ? "all" : next));
  };
  const pickSport = (slug: string | null) => {
    setActiveId(null);
    setSport((current) => (current === slug ? null : slug));
  };
  const fitKey = `${layer}|${sport}|${place.lat}|${place.lng}`;

  return (
    <div
      className="relative h-[calc(100dvh-64px-60px-env(safe-area-inset-bottom))] overflow-hidden bg-sand2 md:h-[calc(100dvh-72px)]"
      data-testid="explore"
    >
      <div className="absolute inset-0">
        <MapView
          center={place}
          zoom={12.6}
          markers={markers}
          activeId={activeId}
          onSelect={setActiveId}
          me={place.isMe ? place : null}
          fitKey={fitKey}
          fitRadiusKm={7}
          recenterSignal={recenter}
          focusOnSelect
          focus={focus}
          pitched={pitched}
          controls={false}
          apiRef={apiRef}
          padding={{ top: 120, bottom: 190 }}
          clusterLabel={x.cluster}
          fallback={t.site.search.mapUnavailable}
          className="h-full w-full"
        />
      </div>

      {/* soft fade so the floating controls stay readable over any map content */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-40 bg-gradient-to-b from-paper/85 via-paper/40 to-transparent"
      />

      {/* ------------------------------------------------ top: where, and what to show */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 space-y-2.5 px-3 pt-3 md:px-5 md:pt-4">
        <div className="pointer-events-auto flex items-center gap-2.5 md:max-w-[420px]">
          <CityCombobox
            value={place}
            onChange={(next) => {
              setActiveId(null);
              setPlace({
                name: next.name,
                lat: next.lat,
                lng: next.lng,
                isMe: next.isMe,
              });
              setRecenter((value) => value + 1);
            }}
            className="min-w-0 flex-1 [&>div:first-child]:shadow-lift"
          />
        </div>

        <div
          className="no-scrollbar pointer-events-auto -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 md:-mx-5 md:px-5"
          role="group"
          aria-label={x.layersLabel}
        >
          {EXPLORE_LAYERS.map((key) => (
            <Chip
              key={key}
              active={layer === key}
              tone={LAYER_TONE[key]}
              onClick={() => pickLayer(key)}
              className="shadow-card"
              data-testid={`layer-${key}`}
            >
              {key === "all" ? (
                <Layers size={15} aria-hidden />
              ) : key === "coaches" ? (
                <span
                  className={clsx(
                    "h-2.5 w-2.5 rounded-full",
                    layer === key ? "bg-current" : "tone-solid",
                  )}
                  data-tone="coach"
                  aria-hidden
                />
              ) : key === "events" ? (
                <EventIcon kind="competition" size={15} />
              ) : (
                <PlaceIcon
                  category={
                    key === "clubs"
                      ? "club"
                      : key === "spots"
                        ? "street_workout"
                        : "gym"
                  }
                  size={15}
                />
              )}
              {x.layers[key]}
              {key !== "all" ? (
                <span className="tabular text-[12px] opacity-70">
                  {counts[key]}
                </span>
              ) : null}
            </Chip>
          ))}
        </div>

        {layer === "all" ||
        layer === "coaches" ||
        layer === "clubs" ||
        layer === "events" ? (
          <div
            className="no-scrollbar pointer-events-auto -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 md:-mx-5 md:px-5"
            role="group"
            aria-label={t.site.search.sport}
          >
            {sports.map((item) => (
              <Chip
                key={item.id}
                size="sm"
                active={sport === item.slug}
                tone={item.slug}
                onClick={() => pickSport(item.slug)}
                className="shadow-card"
                data-testid={`map-sport-${item.slug}`}
              >
                <SportIcon
                  icon={item.icon}
                  size={14}
                  className={sport === item.slug ? undefined : "tone-fill"}
                />
                {localizedName(item, locale)}
              </Chip>
            ))}
          </div>
        ) : null}
      </div>

      {/* ------------------------------------------------ right: camera */}
      <div className="absolute right-3 top-[176px] z-20 flex flex-col gap-2 md:right-5 md:top-[150px]">
        <button
          type="button"
          onClick={() => setPitched((value) => !value)}
          aria-pressed={pitched}
          aria-label={pitched ? x.view2d : x.view3d}
          title={pitched ? x.view2d : x.view3d}
          className={clsx(
            controlClass,
            pitched && "!border-ink !bg-ink !text-paper",
          )}
        >
          <Box size={18} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => apiRef.current?.fitAll()}
          aria-label={x.fit}
          title={x.fit}
          className={controlClass}
        >
          <Maximize2 size={17} aria-hidden />
        </button>
        <div className="hidden flex-col overflow-hidden rounded-2xl border border-line bg-paper/95 shadow-card backdrop-blur md:flex">
          <button
            type="button"
            onClick={() => apiRef.current?.zoomBy(1)}
            aria-label="+"
            className="press inline-flex h-11 w-11 items-center justify-center text-ink hover:bg-sand"
          >
            <Plus size={18} aria-hidden />
          </button>
          <span aria-hidden className="h-px bg-line" />
          <button
            type="button"
            onClick={() => apiRef.current?.zoomBy(-1)}
            aria-label="−"
            className="press inline-flex h-11 w-11 items-center justify-center text-ink hover:bg-sand"
          >
            <Minus size={18} aria-hidden />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------ bottom: the preview, or what is nearby */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 pb-3 md:pb-5">
        {preview ? (
          <div className="pointer-events-auto mx-3 max-w-[400px] md:mx-5">
            <MapPreview item={preview} onClose={() => setActiveId(null)} />
          </div>
        ) : total === 0 ? (
          <div className="pointer-events-auto mx-3 flex max-w-[400px] items-center gap-3 rounded-[22px] bg-paper p-4 shadow-pop md:mx-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sand text-ink">
              <SearchX size={19} aria-hidden />
            </span>
            <p className="min-w-0 flex-1 text-[14px] text-ink2">{x.empty}</p>
            <button
              type="button"
              onClick={() => {
                setLayer("all");
                setSport(null);
              }}
              className="press shrink-0 rounded-full bg-ink px-3.5 py-2 text-[13px] font-semibold text-paper"
            >
              {x.emptyAction}
            </button>
          </div>
        ) : (
          <>
            <p
              className="pointer-events-auto mx-3 mb-2 inline-flex items-center gap-2 rounded-full bg-ink px-3.5 py-1.5 text-[12.5px] font-semibold text-paper shadow-card md:mx-5"
              aria-live="polite"
              data-testid="explore-count"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-volt" aria-hidden />
              {x.count(total)} · {x.nearbyOf(place.name)}
            </p>
            <div
              ref={railRef}
              className="no-scrollbar pointer-events-auto flex snap-x gap-2.5 overflow-x-auto px-3 pb-1 md:px-5"
              data-testid="explore-rail"
            >
              {rail.map((item) => {
                const tone =
                  item.type === "coach"
                    ? (item.coach.sports[0]?.slug ?? "coach")
                    : item.type === "place"
                      ? item.place.category
                      : item.event.kind;
                const name =
                  item.type === "coach"
                    ? item.coach.displayName
                    : item.type === "place"
                      ? item.place.name
                      : item.event.name;
                const kind =
                  item.type === "coach"
                    ? item.coach.sports[0]
                      ? localizedName(item.coach.sports[0], locale)
                      : x.kindLabel.coach
                    : item.type === "place"
                      ? t.common.venueCategories[item.place.category]
                      : countdown(item.event, today);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => choose(item.id)}
                    data-tone={tone}
                    className="press hover-lift flex w-[218px] shrink-0 snap-start items-center gap-3 rounded-[20px] border border-line bg-paper/97 p-2.5 text-left shadow-card backdrop-blur"
                  >
                    {item.type === "coach" ? (
                      <span className="tone-ring m-0.5 h-12 w-12 shrink-0 overflow-hidden rounded-full bg-sand2">
                        <CoachPortrait
                          photoPath={item.coach.photoPath}
                          name={item.coach.displayName}
                        />
                      </span>
                    ) : (
                      <span className="tone-cover flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl">
                        {item.type === "place" ? (
                          <PlaceIcon category={item.place.category} size={22} />
                        ) : (
                          <EventIcon kind={item.event.kind} size={22} />
                        )}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="tone-text block truncate text-[11px] font-bold uppercase tracking-[0.07em]">
                        {kind}
                      </span>
                      <span className="block truncate text-[14.5px] font-semibold text-ink">
                        {name}
                      </span>
                      <span className="block truncate text-[12.5px] text-muted">
                        {item.distanceKm != null
                          ? formatDistance(item.distanceKm, locale)
                          : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
