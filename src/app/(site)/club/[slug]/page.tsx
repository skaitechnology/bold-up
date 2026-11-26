import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { CoachCard } from "@/components/coach/coach-card";
import { splitFacilities } from "@/components/places/params";
import { FeatureGrid, SportPill, sportsOf } from "@/components/places/place-bits";
import { BackLink, NearbyPlaces, PlaceHero, PlaceInquiryCard, PlaceLocationCard, SectionTitle } from "@/components/places/place-detail";
import { SiteFooter } from "@/components/site/site-footer";
import { ButtonLink } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { getFavoriteCoachIds, listPublicCoaches, listSports } from "@/lib/data/coaches";
import { getVenueBySlug, listPublicVenues } from "@/lib/data/venues";
import { formatDistance } from "@/lib/format";
import { distanceKm } from "@/lib/geo";
import { getI18n } from "@/lib/i18n/server";
import { searchCoaches, searchVenues } from "@/lib/search";
import { buildSearchUrl, DEFAULT_SEARCH_PLACE } from "@/lib/search-params";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [venue, { t }] = await Promise.all([getVenueBySlug(slug), getI18n()]);
  if (!venue || venue.category !== "club") return { title: t.common.notFound.title, robots: { index: false } };
  return {
    title: `${venue.name} — ${t.common.venueCategories.club}${venue.city ? ` · ${venue.city}` : ""}`,
    description: venue.description || t.places.clubs.metaDescription,
    alternates: { canonical: `/club/${venue.slug}` },
    // fictional listings stay out of search engines
    robots: venue.is_demo ? { index: false } : undefined,
  };
}

export default async function ClubPage({ params }: PageProps) {
  const { slug } = await params;
  const [venue, { t, locale }, user, allCoaches, allPlaces, sports] = await Promise.all([
    getVenueBySlug(slug),
    getI18n(),
    getSessionUser(),
    listPublicCoaches(),
    listPublicVenues(),
    listSports(),
  ]);
  if (!venue || venue.category !== "club") notFound();
  const c = t.places.clubs;
  const center = { lat: venue.lat, lng: venue.lng };
  const clubSports = sportsOf(venue.sports, sports);
  const tone = clubSports[0]?.slug ?? "club";
  const { known, other } = splitFacilities(venue.facilities);

  const away = distanceKm(DEFAULT_SEARCH_PLACE, center);
  const where = [venue.city, venue.city !== DEFAULT_SEARCH_PLACE.name ? t.places.list.fromCity(formatDistance(away, locale), DEFAULT_SEARCH_PLACE.name) : venue.address]
    .filter(Boolean)
    .join(" · ");

  // coaches who teach one of the club's disciplines, nearest first
  const coaches = searchCoaches(allCoaches, { center, radiusKm: 15 })
    .filter((coach) => coach.sports.some((sport) => venue.sports.includes(sport.slug)))
    .slice(0, 4);
  const others = searchVenues(allPlaces, { categories: ["club"], center })
    .filter((place) => place.id !== venue.id)
    .slice(0, 3);
  const favorites = user && coaches.length ? await getFavoriteCoachIds(user.id) : [];

  return (
    <>
      <div className="mx-auto max-w-[1320px] px-4 py-6 md:px-8 md:py-10">
        <BackLink href="/clubs">{c.back}</BackLink>
        <div className="mt-5">
          <PlaceHero place={venue} tone={tone} where={where} t={t} />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-12">
          <div className="min-w-0 space-y-10">
            {venue.description ? (
              <section>
                <h2 className="display text-[24px] text-ink md:text-[28px]">{c.about}</h2>
                <p className="mt-4 max-w-2xl whitespace-pre-line text-[16px] leading-[1.7] text-ink2">{venue.description}</p>
                {venue.is_demo ? <p className="mt-3 text-[12.5px] text-faint">{c.demoHint}</p> : null}
              </section>
            ) : venue.is_demo ? (
              <p className="text-[12.5px] text-faint">{c.demoHint}</p>
            ) : null}

            {clubSports.length ? (
              <section>
                <h2 className="display text-[24px] text-ink md:text-[28px]">{c.disciplines}</h2>
                <p className="mt-2 text-[14px] text-muted">{c.disciplinesHint}</p>
                <div className="stagger mt-4 flex flex-wrap gap-2">
                  {clubSports.map((sport) => (
                    <SportPill key={sport.slug} sport={sport} locale={locale} size="md" link />
                  ))}
                </div>
              </section>
            ) : null}

            {known.length + other.length ? (
              <section>
                <h2 className="display text-[24px] text-ink md:text-[28px]">{c.services}</h2>
                <div className="mt-4">
                  <FeatureGrid features={[...known, ...other]} t={t} tone="club" />
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-5">
            <PlaceLocationCard place={venue} tone="club" t={t} />
            {venue.partner_status !== "partner" ? <PlaceInquiryCard venueId={venue.id} t={t} /> : null}
          </aside>
        </div>

        {coaches.length ? (
          <section className="mt-14">
            <SectionTitle
              title={c.nearbyCoaches}
              text={c.nearbyCoachesText}
              action={
                <ButtonLink href={buildSearchUrl({ sport: clubSports[0]?.slug ?? null })} variant="secondary" iconRight={ArrowRight}>
                  {c.seeCoaches}
                </ButtonLink>
              }
            />
            <div className="stagger mt-7 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
              {coaches.map((coach) => (
                <CoachCard key={coach.id} coach={coach} t={t} locale={locale} favorite={favorites.includes(coach.id)} signedIn={Boolean(user)} />
              ))}
            </div>
          </section>
        ) : null}

        <NearbyPlaces title={c.others} places={others} sports={sports} allHref="/clubs" allLabel={c.back} t={t} locale={locale} />
      </div>
      <SiteFooter />
    </>
  );
}
