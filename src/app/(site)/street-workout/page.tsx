import type { Metadata } from "next";
import Link from "next/link";
import { SearchX, Sun } from "lucide-react";
import { ListingHero } from "@/components/places/listing-hero";
import { buildSpotUrl, countSpotFilters, parseSpotParams, spotFilters } from "@/components/places/params";
import { PlaceCard } from "@/components/places/place-card";
import { AlsoRow } from "@/components/places/place-detail";
import { SpotFilterBar } from "@/components/places/place-filters";
import { HomeMap } from "@/components/site/home-map";
import { SiteFooter } from "@/components/site/site-footer";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { listPublicVenues } from "@/lib/data/venues";
import { getI18n } from "@/lib/i18n/server";
import { searchVenues } from "@/lib/search";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const [{ t }, params] = await Promise.all([getI18n(), searchParams]);
  const state = parseSpotParams(params);
  return { title: `${t.places.spots.metaTitle} · ${state.place.name}`, description: t.places.spots.metaDescription };
}

export default async function StreetWorkoutPage({ searchParams }: PageProps) {
  const [params, { t, locale }, all] = await Promise.all([searchParams, getI18n(), listPublicVenues()]);
  const s = t.places.spots;
  const state = parseSpotParams(params);
  const everySpot = all.filter((place) => place.category === "street_workout");
  const spots = searchVenues(all, spotFilters(state));
  const filtered = countSpotFilters(state) > 0;

  return (
    <>
      <ListingHero
        category="street_workout"
        eyebrow={s.eyebrow}
        headline={s.headline}
        accent={s.headlineAccent}
        text={s.text}
        stats={[s.results(everySpot.length), s.freeCount(everySpot.filter((spot) => spot.isFree).length), s.alwaysOpenCount(everySpot.filter((spot) => spot.alwaysOpen).length)]}
        note={
          <p className="inline-flex items-center gap-2 text-[13.5px] font-medium text-white/75">
            <Sun size={15} aria-hidden className="tone-fill" />
            {s.freeNote}
          </p>
        }
      />
      <div className="mx-auto max-w-[1320px] px-4 py-6 md:px-8 md:py-10">
        <SpotFilterBar state={state} t={t} />

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,42%)] lg:gap-8">
          <div className="order-2 min-w-0 lg:order-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[16px] font-semibold text-ink" data-testid="place-count" aria-live="polite">
                {s.results(spots.length)} <span className="font-normal text-muted">{t.places.list.near(state.place.name)}</span>
              </p>
              <p className="hidden text-[12.5px] text-faint sm:block">{t.places.list.sortedByDistance}</p>
            </div>
            {spots.length === 0 ? (
              <EmptyState
                className="mt-5"
                icon={SearchX}
                title={s.empty}
                text={s.emptyText}
                action={
                  filtered ? (
                    <Link href={buildSpotUrl({ place: state.place })} scroll={false} className={buttonClass({ variant: "secondary" })}>
                      {t.places.filters.reset}
                    </Link>
                  ) : undefined
                }
              />
            ) : (
              <div className="stagger mt-5 grid gap-5 sm:grid-cols-2">
                {spots.map((spot) => (
                  <PlaceCard key={spot.id} place={spot} sports={[]} t={t} locale={locale} />
                ))}
              </div>
            )}
          </div>
          <div className="order-1 lg:order-2">
            <div className="h-[300px] overflow-hidden rounded-[28px] border border-line bg-sand2 shadow-card md:h-[380px] lg:sticky lg:top-[92px] lg:h-[calc(100dvh-124px)] lg:min-h-[420px]">
              <HomeMap center={state.place} coaches={[]} venues={spots} />
            </div>
          </div>
        </div>

        <AlsoRow current="spots" t={t} />
      </div>
      <SiteFooter />
    </>
  );
}
