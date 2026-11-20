"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { Building2, ChevronRight, List, LocateFixed, Map as MapIcon, SearchX, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { SportIcon } from "@/components/brand/sport-icon";
import { CoachPortrait } from "@/components/coach/coach-portrait";
import { CoachRow } from "@/components/coach/coach-card";
import { MapView, type MapMarker } from "@/components/map/map-view";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { Sheet } from "@/components/ui/sheet";
import { formatDistance, formatPrice } from "@/lib/format";
import { localizedName } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { PRICE_OPTIONS, RADIUS_OPTIONS, type CoachCard, type VenueCard } from "@/lib/search";
import { buildSearchUrl, DEFAULT_SEARCH_PLACE, type SearchState } from "@/lib/search-params";
import { CityCombobox } from "./city-combobox";

type Sport = { id: string; slug: string; name_fr: string; name_en: string; icon: string };

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

export function Discovery({ state, sports, coaches, venues, favoriteIds, signedIn }: Props) {
  const { t, locale } = useI18n();
  const s = t.site.search;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"coaches" | "venues">("coaches");
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [recenter, setRecenter] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  const update = (patch: Partial<SearchState>) => {
    setActiveId(null);
    startTransition(() => router.replace(buildSearchUrl({ ...state, ...patch }), { scroll: false }));
  };

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

  const activeCoach = coaches.find((coach) => coach.id === activeId) ?? null;
  const activeVenue = venues.find((venue) => venue.id === activeId) ?? null;

  // A pin was chosen on the map: bring the matching card into view.
  const select = (id: string | null) => {
    setActiveId(id);
    if (!id) return;
    const isVenue = venues.some((venue) => venue.id === id);
    setTab(isVenue ? "venues" : "coaches");
    requestAnimationFrame(() => {
      for (const container of [listRef.current, railRef.current]) {
        container?.querySelector<HTMLElement>(`[data-item-id="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    });
  };

  const fitKey = `${state.sport}|${state.place.lat}|${state.place.lng}|${state.radiusKm}|${state.maxPrice}|${state.showVenues}|${coaches.length}`;
  // A new search clears the selected pin (derived during render, no effect needed).
  const [searchKey, setSearchKey] = useState(fitKey);
  if (searchKey !== fitKey) {
    setSearchKey(fitKey);
    setActiveId(null);
  }
  const activeFilters = (state.radiusKm ? 1 : 0) + (state.maxPrice ? 1 : 0) + (state.showVenues ? 0 : 1);
  const hasFilters = Boolean(state.sport || state.radiusKm || state.maxPrice || state.place.name !== DEFAULT_SEARCH_PLACE.name || state.place.isMe);

  // ---------------------------------------------------------------- pieces

  const sportChips = (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0" role="group" aria-label={s.sport}>
      <button
        type="button"
        onClick={() => update({ sport: null })}
        aria-pressed={!state.sport}
        className={clsx(
          "press inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-[13.5px] font-medium shadow-card lg:shadow-none",
          !state.sport ? "border-ink bg-ink text-paper" : "border-line2 bg-paper text-ink2 hover:border-ink",
        )}
      >
        {s.allSports}
      </button>
      {sports.map((sport) => {
        const active = state.sport === sport.slug;
        return (
          <button
            key={sport.id}
            type="button"
            onClick={() => update({ sport: active ? null : sport.slug })}
            aria-pressed={active}
            data-testid={`sport-${sport.slug}`}
            className={clsx(
              "press inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[13.5px] font-medium shadow-card lg:shadow-none",
              active ? "border-ink bg-ink text-paper" : "border-line2 bg-paper text-ink2 hover:border-ink",
            )}
          >
            <SportIcon icon={sport.icon} size={15} />
            {localizedName(sport, locale)}
          </button>
        );
      })}
    </div>
  );

  const radiusSelect = (
    <select
      aria-label={s.distance}
      value={state.radiusKm ?? ""}
      onChange={(event) => update({ radiusKm: event.target.value ? Number(event.target.value) : null })}
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
      onChange={(event) => update({ maxPrice: event.target.value ? Number(event.target.value) : null })}
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
          onChange={(place) => update({ place: { name: place.name, lat: place.lat, lng: place.lng, isMe: place.isMe } })}
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
          className="press relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-line2 bg-paper text-ink shadow-card hover:border-ink lg:shadow-none xl:hidden"
        >
          <SlidersHorizontal size={18} aria-hidden />
          {activeFilters > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[11px] font-semibold text-paper">
              {activeFilters}
            </span>
          ) : null}
        </button>
      </div>
      {sportChips}
    </div>
  );

  const tabs = (
    <div className="inline-flex rounded-full bg-sand2 p-1 text-[13.5px] font-semibold" role="tablist">
      {(["coaches", "venues"] as const).map((key) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={tab === key}
          onClick={() => setTab(key)}
          className={clsx("press h-9 rounded-full px-4", tab === key ? "bg-paper text-ink shadow-card" : "text-muted")}
        >
          {key === "coaches" ? s.coaches : s.venues}
          <span className="ml-1.5 tabular text-faint">{key === "coaches" ? coaches.length : venues.length}</span>
        </button>
      ))}
    </div>
  );

  const venueRow = (venue: VenueCard, compact?: boolean) => (
    <Link
      key={venue.id}
      href={`/salle/${venue.slug}`}
      data-item-id={venue.id}
      onMouseEnter={() => setActiveId(venue.id)}
      onMouseLeave={() => setActiveId(null)}
      className={clsx(
        "flex items-center gap-3.5 rounded-[22px] border bg-paper p-3.5 transition",
        activeId === venue.id ? "border-ink shadow-lift" : "border-line hover:border-line2 hover:shadow-card",
        compact && "w-[300px] shrink-0 snap-center",
      )}
    >
      <span
        className={clsx(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
          venue.partner ? "bg-gold-soft text-gold-ink" : "bg-sand2 text-ink2",
        )}
      >
        <Building2 size={20} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15.5px] font-semibold text-ink">{venue.name}</span>
        <span className="mt-0.5 block truncate text-[13px] text-muted">
          {t.common.venueCategories[venue.category]} · {venue.city}
          {venue.distanceKm != null ? ` · ${formatDistance(venue.distanceKm, locale)}` : ""}
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
          <Button variant="secondary" onClick={() => update({ sport: null, radiusKm: null, maxPrice: null, place: DEFAULT_SEARCH_PLACE })}>
            {s.reset}
          </Button>
        ) : undefined
      }
    />
  );

  const count = tab === "coaches" ? s.results(coaches.length) : s.venueResults(venues.length);
  const items = tab === "coaches" ? coaches.length : venues.length;

  return (
    <div className="relative h-[calc(100dvh-64px-60px-env(safe-area-inset-bottom))] overflow-hidden md:h-[calc(100dvh-72px)] lg:grid lg:grid-cols-[minmax(440px,560px)_1fr]">
      {/* ------------------------------------------------ map (full screen on phones, right column on desktop) */}
      <div className="absolute inset-0 lg:static lg:order-2 lg:h-full">
        <MapView
          center={state.place}
          zoom={12.5}
          markers={markers}
          activeId={activeId}
          onSelect={select}
          me={state.place.isMe ? state.place : null}
          fitKey={fitKey}
          recenterSignal={recenter}
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
        {activeCoach || activeVenue ? (
          <div className="animate-pop absolute bottom-6 left-6 z-10 hidden w-[340px] rounded-[22px] bg-paper p-2.5 shadow-pop lg:block" data-testid="map-preview">
            <button
              type="button"
              onClick={() => setActiveId(null)}
              aria-label={t.common.actions.close}
              className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-sand"
            >
              <X size={16} aria-hidden />
            </button>
            {activeCoach ? (
              <Link href={`/coach/${activeCoach.slug}`} className="flex items-center gap-3 pr-8">
                <span className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-sand2">
                  <CoachPortrait photoPath={activeCoach.photoPath} name={activeCoach.displayName} />
                </span>
                <span className="min-w-0">
                  <span className="display block truncate text-[18px] text-ink">{activeCoach.displayName}</span>
                  <span className="mt-1 block truncate text-[13px] text-muted">{activeCoach.headline}</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-ink">
                    {s.viewProfile} <ChevronRight size={14} aria-hidden />
                  </span>
                </span>
              </Link>
            ) : activeVenue ? (
              <Link href={`/salle/${activeVenue.slug}`} className="block px-2 py-1.5 pr-9">
                <span className="block truncate text-[15.5px] font-semibold text-ink">{activeVenue.name}</span>
                <span className="mt-0.5 block truncate text-[13px] text-muted">
                  {t.common.venueCategories[activeVenue.category]} · {activeVenue.city}
                </span>
                <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-ink">
                  {s.viewVenue} <ChevronRight size={14} aria-hidden />
                </span>
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* ------------------------------------------------ phone: floating search over the map */}
      <div className={clsx("absolute inset-x-0 top-0 z-20 px-4 pt-3 lg:hidden", mobileView === "list" && "bg-paper pb-3 shadow-card")}>{filterBar}</div>

      {/* ------------------------------------------------ results: left column on desktop, bottom sheet on phones */}
      <section
        aria-label={s.title}
        className={clsx(
          "absolute inset-x-0 bottom-0 z-10 flex flex-col bg-paper transition-[height] duration-300 ease-out-soft",
          mobileView === "map" ? "h-[236px] rounded-t-[26px] shadow-pop" : "h-full pt-[124px]",
          "lg:static lg:order-1 lg:h-full lg:rounded-none lg:border-r lg:border-line lg:pt-0 lg:shadow-none",
        )}
      >
        <div className="hidden border-b border-line px-6 pb-4 pt-5 lg:block">
          <h1 className="display text-[28px] text-ink">{s.title}</h1>
          <div className="mt-4">{filterBar}</div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 pb-2.5 pt-3 lg:px-6 lg:pt-4">
          <div className={clsx("order-last w-full min-w-0 lg:order-none lg:w-auto", mobileView === "map" && "sr-only lg:not-sr-only")}>
            <p className="truncate text-[15px] font-semibold text-ink" data-testid="result-count" aria-live="polite">
              {count} <span className="font-normal text-muted">{s.near(state.place.name)}</span>
            </p>
            <p className="hidden text-[12.5px] text-faint lg:block">{s.sortedByDistance}</p>
          </div>
          <div className="flex w-full shrink-0 items-center justify-between gap-2 lg:w-auto">
            {tabs}
            <button
              type="button"
              onClick={() => setMobileView((view) => (view === "map" ? "list" : "map"))}
              className="press inline-flex h-11 items-center gap-2 rounded-full bg-ink px-4 text-[13.5px] font-semibold text-paper lg:hidden"
              data-testid="view-toggle"
            >
              {mobileView === "map" ? <List size={16} aria-hidden /> : <MapIcon size={16} aria-hidden />}
              {mobileView === "map" ? s.list : s.map}
            </button>
          </div>
        </div>

        {/* phone, map mode: results as a swipeable rail */}
        {mobileView === "map" ? (
          <div ref={railRef} className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 lg:hidden">
            {items === 0 ? <p className="py-6 text-[14px] text-muted">{tab === "coaches" ? s.emptyTitle : t.site.venues.empty}</p> : null}
            {tab === "coaches"
              ? coaches.map((coach) => (
                  <div key={coach.id} data-item-id={coach.id} className="w-[310px] shrink-0 snap-center">
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
      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title={s.filters} closeLabel={t.common.actions.close}>
        <div className="space-y-6 pt-2">
          <div>
            <p className="mb-2.5 text-[13px] font-semibold text-ink">{s.distance}</p>
            <div className="flex flex-wrap gap-2">
              {[null, ...RADIUS_OPTIONS].map((km) => (
                <button
                  key={String(km)}
                  type="button"
                  onClick={() => update({ radiusKm: km })}
                  aria-pressed={state.radiusKm === km}
                  className={clsx(
                    "press h-10 rounded-full border px-4 text-[14px] font-medium",
                    state.radiusKm === km ? "border-ink bg-ink text-paper" : "border-line2 text-ink2",
                  )}
                >
                  {km ? s.within(km) : s.anyDistance}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2.5 text-[13px] font-semibold text-ink">{s.price}</p>
            <div className="flex flex-wrap gap-2">
              {[null, ...PRICE_OPTIONS].map((price) => (
                <button
                  key={String(price)}
                  type="button"
                  onClick={() => update({ maxPrice: price })}
                  aria-pressed={state.maxPrice === price}
                  className={clsx(
                    "press h-10 rounded-full border px-4 text-[14px] font-medium",
                    state.maxPrice === price ? "border-ink bg-ink text-paper" : "border-line2 text-ink2",
                  )}
                >
                  {price ? s.upTo(formatPrice(price * 100, locale)) : s.anyPrice}
                </button>
              ))}
            </div>
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span className="text-[14.5px] font-medium text-ink">{s.showVenues}</span>
            <input
              type="checkbox"
              checked={state.showVenues}
              onChange={(event) => update({ showVenues: event.target.checked })}
              className="h-5 w-5 accent-ink"
            />
          </label>
          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              block
              onClick={() => update({ sport: null, radiusKm: null, maxPrice: null, showVenues: true, place: DEFAULT_SEARCH_PLACE })}
            >
              {s.reset}
            </Button>
            <Button block onClick={() => setFiltersOpen(false)}>
              {s.apply(coaches.length)}
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
