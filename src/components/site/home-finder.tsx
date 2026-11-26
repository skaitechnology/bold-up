"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { ArrowRight, LayoutGrid, Map as MapIcon, Search, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { EventIcon, PlaceIcon } from "@/components/brand/kind-icon";
import { SportIcon } from "@/components/brand/sport-icon";
import { buildEventsUrl } from "@/components/events/utils";
import { buildClubUrl, buildSpotUrl } from "@/components/places/params";
import { Button, buttonClass } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EVENT_KINDS, type EventKind } from "@/lib/domain";
import { mapHref, type ExploreLayer } from "@/lib/explore";
import { formatPrice } from "@/lib/format";
import { localizedName } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { PRICE_OPTIONS, RADIUS_OPTIONS, type CoachLocation, type CoachSort, type EventPeriod, type SportRef } from "@/lib/search";
import { buildSearchUrl, DEFAULT_SEARCH_PLACE, type Availability, type SearchPlace } from "@/lib/search-params";
import { CityCombobox } from "./city-combobox";

type Kind = "coach" | "club" | "spot" | "event";
const KINDS: Kind[] = ["coach", "club", "spot", "event"];
const KIND_TONE: Record<Kind, string> = { coach: "coach", club: "club", spot: "street_workout", event: "event" };
const KIND_LAYER: Record<Kind, ExploreLayer> = { coach: "coaches", club: "clubs", spot: "spots", event: "events" };
const AVAILABILITIES: Availability[] = ["today", "week", "weekend"];
const LOCATIONS: CoachLocation[] = ["home", "gym", "outdoor", "online"];

function Group({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="mb-2 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/**
 * The home page's one question — "Trouver mon COACH" — with a magnifier that opens the
 * whole search in place: disciplines with their icons, then where, budget, availability…
 * The same panel also finds a club, a street workout spot or an event.
 */
export function HomeFinder({ sports }: { sports: SportRef[] }) {
  const { t, locale } = useI18n();
  const h = t.explore.home;
  const f = t.explore.search;
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [kind, setKind] = useState<Kind>("coach");
  const [sport, setSport] = useState<string | null>(null);
  const [place, setPlace] = useState<SearchPlace>(DEFAULT_SEARCH_PLACE);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [location, setLocation] = useState<CoachLocation | null>(null);
  const [sort, setSort] = useState<CoachSort>("distance");
  const [eventKind, setEventKind] = useState<EventKind | null>(null);
  const [period, setPeriod] = useState<EventPeriod | null>(null);

  const toggle = () => {
    setOpen((value) => !value);
    // keep the question in view above the panel that opens under it
    if (!open) requestAnimationFrame(() => rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const reset = () => {
    setSport(null);
    setPlace(DEFAULT_SEARCH_PLACE);
    setRadiusKm(null);
    setMaxPrice(null);
    setAvailability(null);
    setLocation(null);
    setSort("distance");
    setEventKind(null);
    setPeriod(null);
  };

  const href =
    kind === "coach"
      ? buildSearchUrl({ sport, place, radiusKm, maxPrice, availability, location, sort })
      : kind === "club"
        ? buildClubUrl({ sport, place, radiusKm })
        : kind === "spot"
          ? buildSpotUrl({ place, radiusKm })
          : buildEventsUrl({ kind: eventKind, period, place, radiusKm });
  const withDiscipline = kind === "coach" || kind === "club";

  return (
    <div ref={rootRef} className="scroll-mt-[84px] md:scroll-mt-[96px]">
      <div
        onClick={toggle}
        className={clsx(
          "group flex cursor-pointer items-center justify-between gap-4 rounded-[30px] px-5 py-4 ring-1 backdrop-blur-md transition-colors duration-300 md:rounded-[44px] md:px-9 md:py-7",
          open ? "bg-white/[0.13] ring-white/40" : "bg-white/[0.07] ring-white/20 hover:bg-white/[0.11]",
        )}
      >
        <h1 className="display text-[38px] leading-[0.94] sm:text-[58px] md:text-[80px] lg:text-[96px]">
          {h.findMy} <span className="text-bold-gradient">{h.coach}</span>
        </h1>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            toggle();
          }}
          aria-expanded={open}
          aria-controls="home-finder"
          aria-label={open ? h.closeSearch : h.openSearch}
          title={open ? h.closeSearch : h.openSearch}
          data-testid="home-search-open"
          className="press flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-vivid text-white shadow-glow transition-transform duration-300 ease-spring group-hover:-rotate-6 group-hover:scale-110 md:h-[88px] md:w-[88px]"
        >
          {open ? <X className="h-6 w-6 md:h-9 md:w-9" aria-hidden /> : <Search className="h-6 w-6 md:h-9 md:w-9" strokeWidth={2.4} aria-hidden />}
        </button>
      </div>

      {open ? (
        <div id="home-finder" className="on-light animate-fade-up mt-3 rounded-[28px] bg-paper p-4 text-ink shadow-pop md:rounded-[34px] md:p-7" data-testid="home-finder">
          {/* what are you looking for */}
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label={f.looking}>
            {KINDS.map((key) => (
              <Chip key={key} active={kind === key} tone={KIND_TONE[key]} onClick={() => setKind(key)} data-testid={`home-kind-${key}`}>
                {key === "coach" ? (
                  <Search size={15} aria-hidden />
                ) : key === "event" ? (
                  <EventIcon kind="competition" size={15} />
                ) : (
                  <PlaceIcon category={key === "club" ? "club" : "street_workout"} size={15} />
                )}
                {f.kinds[key]}
              </Chip>
            ))}
          </div>

          {/* disciplines, each with its icon and its colour */}
          {withDiscipline ? (
            <div className="mt-5">
              <p className="mb-2 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-muted">{f.discipline}</p>
              <div className="stagger grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6" role="group" aria-label={f.discipline}>
                <button
                  type="button"
                  aria-pressed={!sport}
                  onClick={() => setSport(null)}
                  className={clsx(
                    "press flex flex-col items-center gap-2 rounded-[20px] border px-2 py-3 text-center",
                    !sport ? "border-ink bg-ink text-paper shadow-lift" : "border-transparent bg-sand text-ink2 hover:border-ink",
                  )}
                >
                  <span className={clsx("flex h-11 w-11 items-center justify-center rounded-2xl", !sport ? "bg-white/15" : "bg-paper")}>
                    <LayoutGrid size={21} aria-hidden />
                  </span>
                  <span className="text-[12.5px] font-semibold leading-tight">{f.allDisciplines}</span>
                </button>
                {sports.map((item) => {
                  const active = sport === item.slug;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      data-tone={item.slug}
                      data-testid={`home-sport-${item.slug}`}
                      onClick={() => setSport(active ? null : item.slug)}
                      className={clsx(
                        "press group/tile flex flex-col items-center gap-2 rounded-[20px] border px-2 py-3 text-center",
                        active ? "tone-solid tone-border shadow-lift" : "tone-soft border-transparent hover:tone-border",
                      )}
                    >
                      <span
                        className={clsx(
                          "flex h-11 w-11 items-center justify-center rounded-2xl transition-transform duration-300 ease-spring group-hover/tile:scale-110",
                          active ? "bg-white/25" : "bg-paper",
                        )}
                      >
                        <SportIcon icon={item.icon} size={22} />
                      </span>
                      <span className="text-[12.5px] font-semibold leading-tight">{localizedName(item, locale)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {kind === "event" ? (
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Group label={f.eventType}>
                <Chip active={!eventKind} onClick={() => setEventKind(null)}>
                  {f.allTypes}
                </Chip>
                {EVENT_KINDS.map((key) => (
                  <Chip key={key} active={eventKind === key} tone={key} onClick={() => setEventKind(eventKind === key ? null : key)}>
                    <EventIcon kind={key} size={15} className={eventKind === key ? undefined : "tone-fill"} />
                    {t.events.kinds[key]}
                  </Chip>
                ))}
              </Group>
              <Group label={f.period}>
                {([null, "month", "quarter"] as const).map((key) => (
                  <Chip key={String(key)} active={period === key} onClick={() => setPeriod(key)}>
                    {f.periodOptions[key ?? "all"]}
                  </Chip>
                ))}
              </Group>
            </div>
          ) : null}

          {/* where */}
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="home-city" className="mb-2 block text-[12.5px] font-semibold uppercase tracking-[0.08em] text-muted">
                {f.where}
              </label>
              <CityCombobox value={place} onChange={(next) => setPlace({ name: next.name, lat: next.lat, lng: next.lng, isMe: next.isMe })} inputId="home-city" />
            </div>
            <Group label={f.radius}>
              <Chip active={!radiusKm} onClick={() => setRadiusKm(null)}>
                {f.anyRadius}
              </Chip>
              {RADIUS_OPTIONS.map((km) => (
                <Chip key={km} active={radiusKm === km} onClick={() => setRadiusKm(km)}>
                  {t.site.search.within(km)}
                </Chip>
              ))}
            </Group>
          </div>

          {/* coach-only filters */}
          {kind === "coach" ? (
            <>
              <button
                type="button"
                onClick={() => setMore((value) => !value)}
                aria-expanded={more}
                className="press mt-5 inline-flex h-10 items-center gap-2 rounded-full border border-line2 px-4 text-[13.5px] font-semibold text-ink md:hidden"
              >
                <SlidersHorizontal size={15} aria-hidden />
                {more ? f.lessFilters : f.moreFilters}
              </button>
              <div className={clsx("mt-5 gap-5 md:grid md:grid-cols-2", more ? "grid" : "hidden")}>
                <Group label={f.budget}>
                  <Chip active={!maxPrice} onClick={() => setMaxPrice(null)}>
                    {f.anyBudget}
                  </Chip>
                  {PRICE_OPTIONS.map((price) => (
                    <Chip key={price} active={maxPrice === price} onClick={() => setMaxPrice(price)}>
                      {t.site.search.upTo(formatPrice(price * 100, locale))}
                    </Chip>
                  ))}
                </Group>
                <Group label={f.availability}>
                  <Chip active={!availability} onClick={() => setAvailability(null)}>
                    {f.anyAvailability}
                  </Chip>
                  {AVAILABILITIES.map((key) => (
                    <Chip key={key} active={availability === key} onClick={() => setAvailability(key)}>
                      {f.availabilityOptions[key]}
                    </Chip>
                  ))}
                </Group>
                <Group label={f.location}>
                  <Chip active={!location} onClick={() => setLocation(null)}>
                    {f.anyLocation}
                  </Chip>
                  {LOCATIONS.map((key) => (
                    <Chip key={key} active={location === key} onClick={() => setLocation(key)}>
                      {f.locationOptions[key]}
                    </Chip>
                  ))}
                </Group>
                <Group label={f.sort}>
                  {(["distance", "price"] as const).map((key) => (
                    <Chip key={key} active={sort === key} onClick={() => setSort(key)}>
                      {f.sortOptions[key]}
                    </Chip>
                  ))}
                </Group>
              </div>
            </>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" onClick={reset}>
              {f.reset}
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href={mapHref({ layer: KIND_LAYER[kind], sport: withDiscipline ? sport : null })} className={buttonClass({ variant: "secondary", size: "lg" })}>
                <MapIcon size={17} aria-hidden />
                {f.onMap}
              </Link>
              <Button size="lg" variant="accent" iconRight={ArrowRight} onClick={() => router.push(href)} data-testid="home-search">
                {f.submit[kind]}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-3 pl-2 text-[13.5px] text-white/60 md:pl-9">{h.searchHint}</p>
      )}
    </div>
  );
}
