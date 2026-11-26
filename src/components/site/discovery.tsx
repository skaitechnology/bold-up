"use client";

import Link from "next/link";
import { clsx } from "clsx";
import {
  ArrowUpRight,
  ChevronRight,
  List,
  LocateFixed,
  Map as MapIcon,
  SearchX,
  SlidersHorizontal,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { PlaceIcon } from "@/components/brand/kind-icon";
import { SportIcon } from "@/components/brand/sport-icon";
import { CoachRow } from "@/components/coach/coach-card";
import { MapPreview, findPreview } from "@/components/map/map-preview";
import { MapView } from "@/components/map/map-view";
import { buildMarkers } from "@/components/map/markers";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/misc";
import { Sheet } from "@/components/ui/sheet";
import { placeHref } from "@/lib/domain";
import { mapHref } from "@/lib/explore";
import { formatDistance, formatPrice } from "@/lib/format";
import { localizedName } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import {
  PRICE_OPTIONS,
  RADIUS_OPTIONS,
  type CoachCard,
  type CoachLocation,
  type VenueCard,
} from "@/lib/search";
import {
  buildSearchUrl,
  DEFAULT_SEARCH_PLACE,
  type Availability,
  type SearchState,
} from "@/lib/search-params";
import { useMediaQuery } from "@/lib/use-media-query";
import { CityCombobox } from "./city-combobox";

type Sport = {
  id: string;
  slug: string;
  name_fr: string;
  name_en: string;
  icon: string;
};

type Props = {
  state: SearchState;
  sports: Sport[];
  coaches: CoachCard[];
  venues: VenueCard[];
  favoriteIds: string[];
  signedIn: boolean;
};

const selectClass =
  "h-11 rounded-full border border-line2 bg-paper px-4 text-[14px] font-medium text-ink outline-none hover:border-ink focus:border-ink";

const AVAILABILITIES: Availability[] = ["today", "week", "weekend"];
const LOCATIONS: CoachLocation[] = ["home", "gym", "outdoor", "online"];
const RESET: Partial<SearchState> = {
  sport: null,
  radiusKm: null,
  maxPrice: null,
  availability: null,
  location: null,
  sort: "distance",
  showVenues: true,
  place: DEFAULT_SEARCH_PLACE,
};

export function Discovery({
  state,
  sports,
  coaches,
  venues,
  favoriteIds,
  signedIn,
}: Props) {
  const { t, locale } = useI18n();
  const s = t.site.search;
  const x = t.explore;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"coaches" | "venues">("coaches");
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [recenter, setRecenter] = useState(0);
  // on phones the search bar and the results sheet float over the map: keep pins clear of them
  const phone = useMediaQuery("(max-width: 1023px)");
  const listRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  const update = (patch: Partial<SearchState>) => {
    setActiveId(null);
    startTransition(() =>
      router.replace(buildSearchUrl({ ...state, ...patch }), { scroll: false }),
    );
  };

  const markers = useMemo(
    () => buildMarkers({ coaches, venues }, locale),
    [coaches, venues, locale],
  );

  const preview = findPreview(activeId, { coaches, venues });

  // A pin was chosen on the map: bring the matching card into view.
  const select = (id: string | null) => {
    setActiveId(id);
    if (!id) return;
    const isVenue = venues.some((venue) => venue.id === id);
    setTab(isVenue ? "venues" : "coaches");
    requestAnimationFrame(() => {
      for (const container of [listRef.current, railRef.current]) {
        container
          ?.querySelector<HTMLElement>(`[data-item-id="${id}"]`)
          ?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
          });
      }
    });
  };

  const fitKey = `${state.sport}|${state.place.lat}|${state.place.lng}|${state.radiusKm}|${state.maxPrice}|${state.showVenues}|${state.availability}|${state.location}|${coaches.length}`;
  // A new search clears the selected pin (derived during render, no effect needed).
  const [searchKey, setSearchKey] = useState(fitKey);
  if (searchKey !== fitKey) {
    setSearchKey(fitKey);
    setActiveId(null);
  }
  const activeFilters =
    (state.radiusKm ? 1 : 0) +
    (state.maxPrice ? 1 : 0) +
    (state.availability ? 1 : 0) +
    (state.location ? 1 : 0) +
    (state.sort === "price" ? 1 : 0) +
    (state.showVenues ? 0 : 1);
  const hasFilters = Boolean(
    state.sport ||
    activeFilters ||
    state.place.name !== DEFAULT_SEARCH_PLACE.name ||
    state.place.isMe,
  );

  // ---------------------------------------------------------------- pieces

  const sportChips = (
    <div
      className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 lg:mx-0 lg:px-0"
      role="group"
      aria-label={s.sport}
    >
      <Chip
        active={!state.sport}
        onClick={() => update({ sport: null })}
        className="shadow-card lg:shadow-none"
      >
        {s.allSports}
      </Chip>
      {sports.map((sport) => {
        const active = state.sport === sport.slug;
        return (
          <Chip
            key={sport.id}
            active={active}
            tone={sport.slug}
            onClick={() => update({ sport: active ? null : sport.slug })}
            data-testid={`sport-${sport.slug}`}
            className="shadow-card lg:shadow-none"
          >
            <SportIcon
              icon={sport.icon}
              size={15}
              className={active ? undefined : "tone-fill"}
            />
            {localizedName(sport, locale)}
          </Chip>
        );
      })}
    </div>
  );

  const radiusSelect = (
    <select
      aria-label={s.distance}
      value={state.radiusKm ?? ""}
      onChange={(event) =>
        update({
          radiusKm: event.target.value ? Number(event.target.value) : null,
        })
      }
      className={selectClass}
      data-testid="filter-radius"
    >
      <option value="">{s.anyDistance}</option>
      {RADIUS_OPTIONS.map((km) => (
        <option key={km} value={km}>
          {s.within(km)}
        </option>
      ))}
    </select>
  );
  const priceSelect = (
    <select
      aria-label={s.price}
      value={state.maxPrice ?? ""}
      onChange={(event) =>
        update({
          maxPrice: event.target.value ? Number(event.target.value) : null,
        })
      }
      className={selectClass}
      data-testid="filter-price"
    >
      <option value="">{s.anyPrice}</option>
      {PRICE_OPTIONS.map((price) => (
        <option key={price} value={price}>
          {s.upTo(formatPrice(price * 100, locale))}
        </option>
      ))}
    </select>
  );

  const filterBar = (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CityCombobox
          value={state.place}
          onChange={(place) =>
            update({
              place: {
                name: place.name,
                lat: place.lat,
                lng: place.lng,
                isMe: place.isMe,
              },
            })
          }
          className="min-w-0 flex-1 [&>div:first-child]:shadow-card lg:[&>div:first-child]:shadow-none"
        />
        <div className="hidden items-center gap-2 xl:flex">
          {radiusSelect}
          {priceSelect}
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          aria-label={s.filters}
          data-testid="filters-open"
          className="press relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-line2 bg-paper text-ink shadow-card hover:border-ink lg:shadow-none"
        >
          <SlidersHorizontal size={18} aria-hidden />
          {activeFilters > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-bold px-1 text-[11px] font-semibold text-white">
              {activeFilters}
            </span>
          ) : null}
        </button>
      </div>
      {sportChips}
    </div>
  );

  const tabs = (
    <div
      className="inline-flex rounded-full bg-sand2 p-1 text-[13.5px] font-semibold"
      role="tablist"
    >
      {(["coaches", "venues"] as const).map((key) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={tab === key}
          onClick={() => setTab(key)}
          className={clsx(
            "press h-9 rounded-full px-4",
            tab === key ? "bg-paper text-ink shadow-card" : "text-muted",
          )}
        >
          {key === "coaches" ? s.coaches : s.venues}
          <span className="ml-1.5 tabular text-faint">
            {key === "coaches" ? coaches.length : venues.length}
          </span>
        </button>
      ))}
    </div>
  );

  const venueRow = (venue: VenueCard, compact?: boolean) => (
    <Link
      key={venue.id}
      href={placeHref(venue)}
      data-item-id={venue.id}
      data-tone={venue.category}
      onMouseEnter={() => setActiveId(venue.id)}
      onMouseLeave={() => setActiveId(null)}
      className={clsx(
        "flex items-center gap-3.5 rounded-[22px] border bg-paper p-3.5 transition",
        activeId === venue.id
          ? "border-ink shadow-lift"
          : "border-line hover:border-line2 hover:shadow-card",
        compact && "w-[300px] shrink-0 snap-center",
      )}
    >
      <span
        className={clsx(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
          venue.partner ? "bg-gold-soft text-gold-ink" : "tone-soft",
        )}
      >
        <PlaceIcon category={venue.category} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15.5px] font-semibold text-ink">
          {venue.name}
        </span>
        <span className="mt-0.5 block truncate text-[13px] text-muted">
          {t.common.venueCategories[venue.category]} · {venue.city}
          {venue.distanceKm != null
            ? ` · ${formatDistance(venue.distanceKm, locale)}`
            : ""}
        </span>
        <span className="mt-1.5 flex items-center gap-1.5">
          {venue.partner ? (
            <Badge tone="gold" size="sm">
              {t.site.venues.partner}
            </Badge>
          ) : (
            <Badge tone="outline" size="sm">
              {venue.claimed ? t.site.venues.claimed : t.site.venues.unclaimed}
            </Badge>
          )}
          {venue.isDemo ? <DemoBadge label={t.common.demo} /> : null}
        </span>
      </span>
      <ChevronRight size={18} aria-hidden className="shrink-0 text-faint" />
    </Link>
  );

  const empty = (
    <EmptyState
      icon={SearchX}
      title={tab === "coaches" ? s.emptyTitle : t.site.venues.empty}
      text={tab === "coaches" ? s.emptyText : undefined}
      action={
        hasFilters ? (
          <Button variant="secondary" onClick={() => update(RESET)}>
            {s.reset}
          </Button>
        ) : undefined
      }
    />
  );

  const count =
    tab === "coaches"
      ? s.results(coaches.length)
      : s.venueResults(venues.length);
  const items = tab === "coaches" ? coaches.length : venues.length;

  return (
    <div className="relative h-[calc(100dvh-64px-60px-env(safe-area-inset-bottom))] overflow-hidden md:h-[calc(100dvh-72px)] lg:grid lg:grid-cols-[minmax(440px,560px)_1fr]">
      {/* ------------------------------------------------ map (full screen on phones, right column on desktop) */}
      <div className="absolute inset-0 max-lg:[&_.maplibregl-ctrl-top-right]:hidden lg:relative lg:inset-auto lg:order-2 lg:h-full">
        <MapView
          center={state.place}
          zoom={12.5}
          markers={markers}
          activeId={activeId}
          onSelect={select}
          me={state.place.isMe ? state.place : null}
          fitKey={fitKey}
          recenterSignal={recenter}
          cluster="places"
          focusOnSelect
          padding={phone ? { top: 110, bottom: 190 } : undefined}
          clusterLabel={x.cluster}
          fallback={s.mapUnavailable}
          className="h-full w-full"
        />
        <button
          type="button"
          onClick={() => setRecenter((value) => value + 1)}
          aria-label={s.recenter}
          title={s.recenter}
          className="press absolute right-2.5 top-[196px] z-10 inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-line bg-paper text-ink shadow-card lg:top-[104px]"
        >
          <LocateFixed size={18} aria-hidden />
        </button>

        {/* desktop preview of the selected pin */}
        {preview ? (
          <div className="absolute bottom-6 left-6 z-10 hidden w-[380px] lg:block">
            <MapPreview item={preview} onClose={() => setActiveId(null)} />
          </div>
        ) : null}
      </div>

      {/* ------------------------------------------------ phone: floating search over the map */}
      <div
        className={clsx(
          "absolute inset-x-0 top-0 z-20 px-4 pt-3 lg:hidden",
          mobileView === "list" && "bg-paper pb-3 shadow-card",
        )}
      >
        {filterBar}
      </div>

      {/* ------------------------------------------------ results: left column on desktop, bottom sheet on phones */}
      <section
        aria-label={s.title}
        className={clsx(
          "absolute inset-x-0 bottom-0 z-10 flex flex-col bg-paper transition-[height] duration-300 ease-out-soft",
          mobileView === "map"
            ? "h-[236px] rounded-t-[26px] shadow-pop"
            : "h-full pt-[124px]",
          "lg:static lg:order-1 lg:h-full lg:rounded-none lg:border-r lg:border-line lg:pt-0 lg:shadow-none",
        )}
      >
        <div className="hidden border-b border-line px-6 pb-4 pt-5 lg:block">
          <div className="flex items-center justify-between gap-3">
            <h1 className="display text-[28px] text-ink">{s.title}</h1>
            <Link
              href={mapHref({ layer: "coaches", sport: state.sport })}
              className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-bold px-3.5 text-[13px] font-semibold text-white shadow-glow"
            >
              <MapIcon size={14} aria-hidden />
              {t.common.nav.map}
              <ArrowUpRight size={14} aria-hidden />
            </Link>
          </div>
          <div className="mt-4">{filterBar}</div>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
            {[
              { href: "/clubs", label: t.common.nav.clubs, tone: "club" },
              {
                href: "/street-workout",
                label: t.common.nav.streetWorkout,
                tone: "street_workout",
              },
              {
                href: "/evenements",
                label: t.common.nav.events,
                tone: "event",
              },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                data-tone={link.tone}
                className="inline-flex items-center gap-1.5 font-medium text-ink2 hover:text-ink"
              >
                <span aria-hidden className="tone-solid h-2 w-2 rounded-full" />
                {link.label}
              </Link>
            ))}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 pb-2.5 pt-3 lg:px-6 lg:pt-4">
          <div
            className={clsx(
              "order-last w-full min-w-0 lg:order-none lg:w-auto",
              mobileView === "map" && "sr-only lg:not-sr-only",
            )}
          >
            <p
              className="truncate text-[15px] font-semibold text-ink"
              data-testid="result-count"
              aria-live="polite"
            >
              {count}{" "}
              <span className="font-normal text-muted">
                {s.near(state.place.name)}
              </span>
            </p>
            <p className="hidden text-[12.5px] text-faint lg:block">
              {state.sort === "price"
                ? x.filters.sortedByPrice
                : s.sortedByDistance}
            </p>
          </div>
          <div className="flex w-full shrink-0 items-center justify-between gap-2 lg:w-auto">
            {tabs}
            <button
              type="button"
              onClick={() =>
                setMobileView((view) => (view === "map" ? "list" : "map"))
              }
              className="press inline-flex h-11 items-center gap-2 rounded-full bg-bold px-4 text-[13.5px] font-semibold text-white shadow-glow lg:hidden"
              data-testid="view-toggle"
            >
              {mobileView === "map" ? (
                <List size={16} aria-hidden />
              ) : (
                <MapIcon size={16} aria-hidden />
              )}
              {mobileView === "map" ? s.list : s.map}
            </button>
          </div>
        </div>

        {/* phone, map mode: results as a swipeable rail */}
        {mobileView === "map" ? (
          <div
            ref={railRef}
            className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 lg:hidden"
          >
            {items === 0 ? (
              <p className="py-6 text-[14px] text-muted">
                {tab === "coaches" ? s.emptyTitle : t.site.venues.empty}
              </p>
            ) : null}
            {tab === "coaches"
              ? coaches.map((coach) => (
                  <div
                    key={coach.id}
                    data-item-id={coach.id}
                    className="w-[310px] shrink-0 snap-center"
                  >
                    <CoachRow
                      coach={coach}
                      t={t}
                      locale={locale}
                      favorite={favoriteIds.includes(coach.id)}
                      signedIn={signedIn}
                      active={activeId === coach.id}
                    />
                  </div>
                ))
              : venues.map((venue) => venueRow(venue, true))}
          </div>
        ) : null}

        {/* desktop always, phone in list mode: the full list */}
        <div
          ref={listRef}
          className={clsx(
            "min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-6 pt-1 lg:block lg:px-6",
            mobileView === "map" && "hidden",
            pending && "opacity-60",
          )}
        >
          {items === 0 ? empty : null}
          {tab === "coaches"
            ? coaches.map((coach) => (
                <div key={coach.id} data-item-id={coach.id}>
                  <CoachRow
                    coach={coach}
                    t={t}
                    locale={locale}
                    favorite={favoriteIds.includes(coach.id)}
                    signedIn={signedIn}
                    active={activeId === coach.id}
                    onHover={setActiveId}
                  />
                </div>
              ))
            : venues.map((venue) => venueRow(venue))}
        </div>
      </section>

      {/* ------------------------------------------------ filters sheet */}
      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={s.filters}
        closeLabel={t.common.actions.close}
      >
        <div className="space-y-6 pt-2">
          <div>
            <p className="mb-2.5 text-[13px] font-semibold text-ink">
              {s.distance}
            </p>
            <div className="flex flex-wrap gap-2">
              {[null, ...RADIUS_OPTIONS].map((km) => (
                <button
                  key={String(km)}
                  type="button"
                  onClick={() => update({ radiusKm: km })}
                  aria-pressed={state.radiusKm === km}
                  className={clsx(
                    "press h-10 rounded-full border px-4 text-[14px] font-medium",
                    state.radiusKm === km
                      ? "border-ink bg-ink text-paper"
                      : "border-line2 text-ink2",
                  )}
                >
                  {km ? s.within(km) : s.anyDistance}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2.5 text-[13px] font-semibold text-ink">
              {s.price}
            </p>
            <div className="flex flex-wrap gap-2">
              {[null, ...PRICE_OPTIONS].map((price) => (
                <button
                  key={String(price)}
                  type="button"
                  onClick={() => update({ maxPrice: price })}
                  aria-pressed={state.maxPrice === price}
                  className={clsx(
                    "press h-10 rounded-full border px-4 text-[14px] font-medium",
                    state.maxPrice === price
                      ? "border-ink bg-ink text-paper"
                      : "border-line2 text-ink2",
                  )}
                >
                  {price
                    ? s.upTo(formatPrice(price * 100, locale))
                    : s.anyPrice}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2.5 text-[13px] font-semibold text-ink">
              {x.filters.availability}
            </p>
            <div className="flex flex-wrap gap-2">
              <Chip
                active={!state.availability}
                onClick={() => update({ availability: null })}
              >
                {x.search.anyAvailability}
              </Chip>
              {AVAILABILITIES.map((key) => (
                <Chip
                  key={key}
                  active={state.availability === key}
                  onClick={() => update({ availability: key })}
                  data-testid={`filter-availability-${key}`}
                >
                  {x.search.availabilityOptions[key]}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2.5 text-[13px] font-semibold text-ink">
              {x.filters.location}
            </p>
            <div className="flex flex-wrap gap-2">
              <Chip
                active={!state.location}
                onClick={() => update({ location: null })}
              >
                {x.search.anyLocation}
              </Chip>
              {LOCATIONS.map((key) => (
                <Chip
                  key={key}
                  active={state.location === key}
                  onClick={() => update({ location: key })}
                >
                  {x.search.locationOptions[key]}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2.5 text-[13px] font-semibold text-ink">
              {x.filters.sort}
            </p>
            <div className="flex flex-wrap gap-2">
              {(["distance", "price"] as const).map((key) => (
                <Chip
                  key={key}
                  active={state.sort === key}
                  onClick={() => update({ sort: key })}
                  data-testid={`filter-sort-${key}`}
                >
                  {x.search.sortOptions[key]}
                </Chip>
              ))}
            </div>
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span className="text-[14.5px] font-medium text-ink">
              {s.showVenues}
            </span>
            <input
              type="checkbox"
              checked={state.showVenues}
              onChange={(event) => update({ showVenues: event.target.checked })}
              className="h-5 w-5 accent-ink"
            />
          </label>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" block onClick={() => update(RESET)}>
              {s.reset}
            </Button>
            <Button
              block
              variant="accent"
              onClick={() => setFiltersOpen(false)}
            >
              {s.apply(coaches.length)}
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
