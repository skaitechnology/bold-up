import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { ListingHero } from "@/components/places/listing-hero";
import { buildClubUrl, clubFilters, countClubFilters, parseClubParams } from "@/components/places/params";
import { PlaceCard } from "@/components/places/place-card";
import { AlsoRow } from "@/components/places/place-detail";
import { ClubFilterBar } from "@/components/places/place-filters";
import { HomeMap } from "@/components/site/home-map";
import { SiteFooter } from "@/components/site/site-footer";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { listSports } from "@/lib/data/coaches";
import { listPublicVenues } from "@/lib/data/venues";
import { localizedName } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { searchVenues } from "@/lib/search";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const [{ t, locale }, params, sports] = await Promise.all([getI18n(), searchParams, listSports()]);
  const state = parseClubParams(params);
  const sport = sports.find((item) => item.slug === state.sport);
  return {
    title: sport ? `${t.places.clubs.title} · ${localizedName(sport, locale)} · ${state.place.name}` : `${t.places.clubs.metaTitle} · ${state.place.name}`,
    description: t.places.clubs.metaDescription,
  };
}

export default async function ClubsPage({ searchParams }: PageProps) {
  const [params, { t, locale }, all, sports] = await Promise.all([searchParams, getI18n(), listPublicVenues(), listSports()]);
  const c = t.places.clubs;
  const state = parseClubParams(params);
  const everyClub = all.filter((place) => place.category === "club");
  // only the disciplines that at least one club offers
  const present = sports.filter((sport) => everyClub.some((club) => club.sports.includes(sport.slug)));
  const clubs = searchVenues(all, clubFilters(state));
  const filtered = countClubFilters(state) > 0;

  return (
    <>
      <ListingHero
        category="club"
        eyebrow={c.eyebrow}
        headline={c.headline}
        accent={c.headlineAccent}
        text={c.text}
        stats={[c.results(everyClub.length), c.disciplinesCount(present.length)]}
      />
      <div className="mx-auto max-w-[1320px] px-4 py-6 md:px-8 md:py-10">
        <ClubFilterBar state={state} sports={present} t={t} locale={locale} />

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,42%)] lg:gap-8">
          <div className="order-2 min-w-0 lg:order-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[16px] font-semibold text-ink" data-testid="place-count" aria-live="polite">
                {c.results(clubs.length)} <span className="font-normal text-muted">{t.places.list.near(state.place.name)}</span>
              </p>
              <p className="hidden text-[12.5px] text-faint sm:block">{t.places.list.sortedByDistance}</p>
            </div>
            {clubs.length === 0 ? (
              <EmptyState
                className="mt-5"
                icon={SearchX}
                title={c.empty}
                text={c.emptyText}
                action={
                  filtered ? (
                    <Link href={buildClubUrl({ place: state.place })} scroll={false} className={buttonClass({ variant: "secondary" })}>
                      {t.places.filters.reset}
                    </Link>
                  ) : undefined
                }
              />
            ) : (
              <div className="stagger mt-5 grid gap-5 sm:grid-cols-2">
                {clubs.map((club) => (
                  <PlaceCard key={club.id} place={club} sports={sports} t={t} locale={locale} />
                ))}
              </div>
            )}
          </div>
          <div className="order-1 lg:order-2">
            <div className="h-[300px] overflow-hidden rounded-[28px] border border-line bg-sand2 shadow-card md:h-[380px] lg:sticky lg:top-[92px] lg:h-[calc(100dvh-124px)] lg:min-h-[420px]">
              <HomeMap center={state.place} coaches={[]} venues={clubs} />
            </div>
          </div>
        </div>

        <AlsoRow current="clubs" t={t} />
      </div>
      <SiteFooter />
    </>
  );
}
