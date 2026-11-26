import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, HandCoins, Sun, Trees } from "lucide-react";
import { CoachCard } from "@/components/coach/coach-card";
import { splitFacilities, SPOT_EQUIPMENT } from "@/components/places/params";
import { FeatureGrid } from "@/components/places/place-bits";
import { BackLink, HeroBadge, NearbyPlaces, PlaceHero, PlaceLocationCard, SectionTitle } from "@/components/places/place-detail";
import { SiteFooter } from "@/components/site/site-footer";
import { ButtonLink } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { getFavoriteCoachIds, listPublicCoaches } from "@/lib/data/coaches";
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
  if (!venue || venue.category !== "street_workout") return { title: t.common.notFound.title, robots: { index: false } };
  return {
    title: `${venue.name} — ${t.common.venueCategories.street_workout}${venue.city ? ` · ${venue.city}` : ""}`,
    description: venue.description || t.places.spots.metaDescription,
    alternates: { canonical: `/street-workout/${venue.slug}` },
    robots: venue.is_demo ? { index: false } : undefined,
  };
}

export default async function StreetWorkoutSpotPage({ params }: PageProps) {
  const { slug } = await params;
  const [venue, { t, locale }, user, allCoaches, allPlaces] = await Promise.all([getVenueBySlug(slug), getI18n(), getSessionUser(), listPublicCoaches(), listPublicVenues()]);
  if (!venue || venue.category !== "street_workout") notFound();
  const s = t.places.spots;
  const center = { lat: venue.lat, lng: venue.lng };
  const { known, other } = splitFacilities(venue.facilities);
  const isApparatus = (item: string) => (SPOT_EQUIPMENT as readonly string[]).includes(item);
  const features = [...known.filter(isApparatus), ...known.filter((item) => !isApparatus(item)), ...other];

  const away = distanceKm(DEFAULT_SEARCH_PLACE, center);
  const where = [venue.address, venue.city, t.places.list.fromCity(formatDistance(away, locale), DEFAULT_SEARCH_PLACE.name)].filter(Boolean).join(" · ");

  // coaches who run outdoor sessions around this spot
  const coaches = searchCoaches(allCoaches, { center, radiusKm: 10, location: "outdoor" }).slice(0, 4);
  const others = searchVenues(allPlaces, { categories: ["street_workout"], center })
    .filter((place) => place.id !== venue.id)
    .slice(0, 3);
  const favorites = user && coaches.length ? await getFavoriteCoachIds(user.id) : [];
  const coachSearch = buildSearchUrl({ location: "outdoor", place: { name: venue.city ?? DEFAULT_SEARCH_PLACE.name, lat: venue.lat, lng: venue.lng } });

  const facts = [
    venue.is_free ? { icon: HandCoins, text: s.accessFree } : null,
    { icon: Clock, text: venue.always_open ? s.accessAlways : s.accessPark },
  ].filter((fact): fact is NonNullable<typeof fact> => Boolean(fact));

  return (
    <>
      <div className="mx-auto max-w-[1320px] px-4 py-6 md:px-8 md:py-10">
        <BackLink href="/street-workout">{s.back}</BackLink>
        <div className="mt-5">
          <PlaceHero
            place={venue}
            tone="street_workout"
            where={where}
            t={t}
            badges={
              <>
                {venue.is_free ? <HeroBadge solid>{s.free}</HeroBadge> : null}
                <HeroBadge>
                  <Clock size={13} aria-hidden />
                  {venue.always_open ? s.alwaysOpen : s.parkHours}
                </HeroBadge>
                <HeroBadge>
                  <Trees size={13} aria-hidden />
                  {s.outdoors}
                </HeroBadge>
              </>
            }
          />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-12">
          <div className="min-w-0 space-y-10">
            {venue.description ? (
              <section>
                <h2 className="display text-[24px] text-ink md:text-[28px]">{s.about}</h2>
                <p className="mt-4 max-w-2xl whitespace-pre-line text-[16px] leading-[1.7] text-ink2">{venue.description}</p>
              </section>
            ) : null}

            {features.length ? (
              <section>
                <h2 className="display text-[24px] text-ink md:text-[28px]">{s.equipmentTitle}</h2>
                <div className="mt-4">
                  <FeatureGrid features={features} t={t} tone="street_workout" />
                </div>
              </section>
            ) : null}

            <section data-tone="street_workout">
              <h2 className="display text-[24px] text-ink md:text-[28px]">{s.goodToKnow}</h2>
              <ul className="mt-4 space-y-2.5">
                {facts.map((fact) => (
                  <li key={fact.text} className="flex items-center gap-3 rounded-2xl bg-sand px-4 py-3.5 text-[14.5px] font-medium text-ink">
                    <span className="tone-solid flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                      <fact.icon size={17} aria-hidden />
                    </span>
                    {fact.text}
                  </li>
                ))}
              </ul>
              {venue.is_demo ? <p className="mt-3 text-[12.5px] text-faint">{s.demoHint}</p> : null}
            </section>
          </div>

          <aside className="space-y-5">
            <PlaceLocationCard place={venue} tone="street_workout" t={t} />
            <div data-tone="street_workout" className="on-dark relative isolate overflow-hidden rounded-[24px] bg-ink p-5 text-paper">
              <span aria-hidden className="tone-solid absolute -right-10 -top-12 -z-10 h-36 w-36 rounded-full opacity-35 blur-2xl" />
              <p className="eyebrow inline-flex items-center gap-2 text-white/70">
                <Sun size={14} aria-hidden className="tone-fill" />
                {s.outdoors}
              </p>
              <h2 className="display mt-3 text-[22px]">{s.nearbyCoaches}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-white/75">{s.nearbyCoachesText}</p>
              <ButtonLink href={coachSearch} variant="volt" block iconRight={ArrowRight} className="mt-4" data-testid="spot-find-coach">
                {s.findOutdoorCoach}
              </ButtonLink>
            </div>
          </aside>
        </div>

        {coaches.length ? (
          <section className="mt-14">
            <SectionTitle title={s.nearbyCoaches} text={s.nearbyCoachesText} />
            <div className="stagger mt-7 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
              {coaches.map((coach) => (
                <CoachCard key={coach.id} coach={coach} t={t} locale={locale} favorite={favorites.includes(coach.id)} signedIn={Boolean(user)} />
              ))}
            </div>
          </section>
        ) : null}

        <NearbyPlaces title={s.others} places={others} sports={[]} allHref="/street-workout" allLabel={s.back} t={t} locale={locale} />
      </div>
      <SiteFooter />
    </>
  );
}
