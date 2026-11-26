import Link from "next/link";
import { ArrowRight, ArrowUpRight, BadgeCheck, FileCheck2, Map as MapIcon, ShieldCheck, UserRoundCheck } from "lucide-react";
import { EventIcon, PlaceIcon } from "@/components/brand/kind-icon";
import { SportIcon } from "@/components/brand/sport-icon";
import { CoachCard } from "@/components/coach/coach-card";
import { HomeEvents } from "@/components/events/home-events";
import { HomeFinder } from "@/components/site/home-finder";
import { HomeMap } from "@/components/site/home-map";
import { SiteFooter } from "@/components/site/site-footer";
import { ButtonLink } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { getFavoriteCoachIds, listPublicCoaches, listSports } from "@/lib/data/coaches";
import { listPublicEvents } from "@/lib/data/events";
import { listPublicVenues } from "@/lib/data/venues";
import { GYM_CATEGORIES } from "@/lib/domain";
import { mapHref } from "@/lib/explore";
import { parisDateKey } from "@/lib/format";
import { localizedName } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { searchCoaches, searchEvents, searchVenues } from "@/lib/search";
import { buildSearchUrl, DEFAULT_SEARCH_PLACE } from "@/lib/search-params";

export default async function HomePage() {
  const [{ t, locale }, user, sports, allCoaches, allVenues, allEvents] = await Promise.all([
    getI18n(),
    getSessionUser(),
    listSports(),
    listPublicCoaches(),
    listPublicVenues(),
    listPublicEvents(),
  ]);
  const h = t.site.home;
  const x = t.explore.home;
  const nav = t.common.nav;
  const place = DEFAULT_SEARCH_PLACE;
  const coaches = searchCoaches(allCoaches, { center: place });
  const gyms = searchVenues(allVenues, { center: place, radiusKm: 10, categories: GYM_CATEGORIES });
  const clubs = searchVenues(allVenues, { center: place, categories: ["club"] });
  const spots = searchVenues(allVenues, { center: place, categories: ["street_workout"] });
  const events = searchEvents(allEvents, { center: place, today: parisDateKey(new Date()) });
  const favorites = user ? await getFavoriteCoachIds(user.id) : [];
  const coachHref = user?.role === "coach" ? "/pro" : user ? "/devenir-coach" : "/inscription?role=coach";
  const finderSports = sports.map(({ id, slug, name_fr, name_en, icon }) => ({ id, slug, name_fr, name_en, icon }));
  const coachCount = (slug: string) => allCoaches.filter((coach) => coach.sports.some((sport) => sport.slug === slug)).length;

  // what the map holds, as quick links under the search and as its legend
  const layers = [
    { key: "coaches" as const, tone: "coach", label: nav.coaches, count: coaches.length, href: "/coachs" },
    { key: "clubs" as const, tone: "club", label: nav.clubs, count: clubs.length, href: "/clubs" },
    { key: "spots" as const, tone: "street_workout", label: nav.streetWorkout, count: spots.length, href: "/street-workout" },
    { key: "events" as const, tone: "event", label: nav.events, count: events.length, href: "/evenements" },
  ];

  return (
    <>
      {/* ------------------------------------------------------------ hero: Trouver mon COACH */}
      <section className="on-dark bg-night relative isolate overflow-hidden text-paper">
        <img src="/demo/hero.jpg" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-25 mix-blend-luminosity" fetchPriority="high" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-ink to-transparent" />
        <div aria-hidden className="animate-float bg-vivid absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full opacity-30 blur-3xl" />
        <div className="mx-auto max-w-[1320px] px-4 pb-10 pt-10 md:px-8 md:pb-16 md:pt-20">
          <p className="animate-fade-up inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] ring-1 ring-white/15">
            <span aria-hidden className="h-2 w-2 rounded-full bg-volt" />
            {x.eyebrow}
          </p>
          <div className="animate-fade-up mt-6" style={{ animationDelay: "60ms" }}>
            <HomeFinder sports={finderSports} />
          </div>
          <p className="animate-fade-up mt-6 max-w-2xl text-[16px] leading-relaxed text-white/75 md:text-[18px]" style={{ animationDelay: "120ms" }}>
            {x.subtitle}
          </p>
          <ul className="animate-fade-up no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0" style={{ animationDelay: "180ms" }} aria-label={x.quick}>
            <li className="shrink-0">
              <Link href="/carte" className="press bg-bold inline-flex h-11 items-center gap-2 rounded-full px-4 text-[14px] font-semibold text-white shadow-glow">
                <MapIcon size={16} aria-hidden />
                {nav.map}
              </Link>
            </li>
            {layers.map((layer) => (
              <li key={layer.key} className="shrink-0">
                <Link
                  href={layer.href}
                  data-tone={layer.tone}
                  className="press inline-flex h-11 items-center gap-2 rounded-full bg-white/10 px-4 text-[14px] font-medium text-white ring-1 ring-white/15 hover:bg-white/15"
                >
                  <span aria-hidden className="tone-solid h-2.5 w-2.5 rounded-full" />
                  {layer.label}
                  <span className="tabular text-[12.5px] text-white/60">{layer.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------------ events, right under the search */}
      <HomeEvents events={events} t={t} locale={locale} />

      {/* ------------------------------------------------------------ disciplines */}
      <section className="bg-sand">
        <div className="mx-auto max-w-[1320px] px-4 py-12 md:px-8 md:py-16">
          <h2 className="display text-[30px] text-ink md:text-[42px]">{x.disciplinesTitle}</h2>
          <p className="mt-3 max-w-xl text-[15.5px] leading-relaxed text-muted">{x.disciplinesText}</p>
          <ul className="stagger mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {sports.map((sport) => (
              <li key={sport.id}>
                <Link
                  href={buildSearchUrl({ sport: sport.slug })}
                  data-tone={sport.slug}
                  className="tone-cover hover-lift group relative flex h-[132px] flex-col justify-between overflow-hidden rounded-[24px] p-4"
                >
                  <span aria-hidden className="absolute -bottom-5 -right-4 opacity-20 transition-transform duration-500 ease-out-soft group-hover:-rotate-12 group-hover:scale-125">
                    <SportIcon icon={sport.icon} size={104} />
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                    <SportIcon icon={sport.icon} size={20} />
                  </span>
                  <span>
                    <span className="display block text-[18px] leading-tight">{localizedName(sport, locale)}</span>
                    <span className="mt-1 block text-[12.5px] font-medium opacity-80">{x.coachCount(coachCount(sport.slug))}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------------ coaches */}
      <section className="mx-auto max-w-[1320px] px-4 py-14 md:px-8 md:py-20">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="display text-[32px] text-ink md:text-[44px]">{h.nearTitle(place.name)}</h2>
            <p className="mt-3 max-w-xl text-[15.5px] leading-relaxed text-muted">{h.nearText}</p>
          </div>
          <ButtonLink href="/coachs" variant="secondary" iconRight={ArrowRight}>
            {h.seeAllCoaches}
          </ButtonLink>
        </div>
        {coaches.length === 0 ? (
          <p className="mt-10 rounded-[24px] bg-sand px-6 py-12 text-center text-[15px] text-muted">{h.emptyCoaches}</p>
        ) : (
          <div className="stagger mt-9 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
            {coaches.slice(0, 4).map((coach, index) => (
              <CoachCard key={coach.id} coach={coach} t={t} locale={locale} favorite={favorites.includes(coach.id)} signedIn={Boolean(user)} eager={index < 2} />
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------ the map */}
      <section className="on-dark bg-night text-paper">
        <div className="mx-auto grid max-w-[1320px] gap-8 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-[0.78fr_1.22fr] lg:items-center lg:gap-14">
          <div>
            <p className="eyebrow text-volt">{x.mapEyebrow}</p>
            <h2 className="display mt-4 text-[32px] md:text-[46px]">{x.mapTitle}</h2>
            <p className="mt-4 max-w-md text-[15.5px] leading-relaxed text-white/70">{x.mapText}</p>
            <ul className="mt-6 flex flex-wrap gap-2" aria-label={x.mapLegend}>
              {[...layers, { key: "venues" as const, tone: "gym", label: nav.venues, count: gyms.length, href: "/salles" }].map((layer) => (
                <li key={layer.key}>
                  <Link
                    href={mapHref({ layer: layer.key })}
                    data-tone={layer.tone}
                    className="press inline-flex h-9 items-center gap-2 rounded-full bg-white/8 px-3.5 text-[13px] font-medium ring-1 ring-white/15 hover:bg-white/15"
                  >
                    <span aria-hidden className="tone-solid h-2.5 w-2.5 rounded-full" />
                    {layer.label}
                  </Link>
                </li>
              ))}
            </ul>
            <ButtonLink href="/carte" size="lg" variant="accent" iconRight={ArrowUpRight} className="mt-8" data-testid="home-map-cta">
              {x.mapCta}
            </ButtonLink>
          </div>
          <div className="bg-vivid rounded-[34px] p-[3px] shadow-pop">
            <div className="h-[420px] overflow-hidden rounded-[31px] bg-paper text-ink md:h-[520px]">
              <HomeMap center={place} coaches={coaches} venues={[...clubs, ...spots, ...gyms]} events={events} zoom={12.4} />
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ clubs and street workout */}
      <section className="mx-auto max-w-[1320px] px-4 py-14 md:px-8 md:py-20">
        <h2 className="display text-[32px] text-ink md:text-[44px]">{x.placesTitle}</h2>
        <p className="mt-3 max-w-xl text-[15.5px] leading-relaxed text-muted">{x.placesText}</p>
        <div className="mt-9 grid gap-5 md:grid-cols-2">
          {[
            { href: "/clubs", tone: "club", category: "club", title: x.clubsTitle, text: x.clubsText, cta: x.clubsCta, count: x.clubsCount(clubs.length) },
            { href: "/street-workout", tone: "street_workout", category: "street_workout", title: x.spotsTitle, text: x.spotsText, cta: x.spotsCta, count: x.spotsCount(spots.length) },
          ].map((card) => (
            <Link key={card.href} href={card.href} data-tone={card.tone} className="hover-lift group relative isolate overflow-hidden rounded-[30px] bg-ink p-7 text-paper md:p-9">
              <span aria-hidden className="tone-solid absolute -right-20 -top-24 -z-10 h-64 w-64 rounded-full opacity-90 transition-transform duration-700 ease-out-soft group-hover:scale-125" />
              <span aria-hidden className="absolute -bottom-8 right-4 -z-10 opacity-15 transition-transform duration-700 ease-out-soft group-hover:-rotate-6 group-hover:scale-110">
                <PlaceIcon category={card.category} size={190} />
              </span>
              <span className="tone-solid inline-flex h-12 w-12 items-center justify-center rounded-2xl ring-4 ring-ink">
                <PlaceIcon category={card.category} size={24} />
              </span>
              <p className="mt-6 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-white/60">{card.count}</p>
              <h3 className="display mt-2 max-w-[13ch] text-[28px] md:text-[34px]">{card.title}</h3>
              <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-white/75">{card.text}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-[14.5px] font-semibold">
                {card.cta}
                <ArrowRight size={17} aria-hidden className="transition-transform duration-300 group-hover:translate-x-1.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ how it works */}
      <section className="bg-sand">
        <div className="mx-auto max-w-[1320px] px-4 py-14 md:px-8 md:py-20">
          <h2 className="display text-[32px] text-ink md:text-[44px]">{h.howTitle}</h2>
          <ol className="stagger mt-9 grid gap-4 md:grid-cols-3 md:gap-5">
            {[
              { step: h.how.one, tone: "running" },
              { step: h.how.two, tone: "pilates" },
              { step: h.how.three, tone: "event" },
            ].map(({ step, tone }, index) => (
              <li key={step.title} data-tone={tone} className="hover-lift rounded-[24px] border border-line bg-paper p-6 md:p-7">
                <span className="wordmark tone-fill text-[44px]">0{index + 1}</span>
                <h3 className="mt-5 text-[19px] font-semibold tracking-tight text-ink">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------------ trust */}
      <section className="border-b border-line bg-paper">
        <div className="mx-auto grid max-w-[1320px] gap-10 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow text-gold-ink">{h.trustEyebrow}</p>
            <h2 className="display mt-4 text-[32px] text-ink md:text-[44px]">{h.trustTitle}</h2>
            <p className="mt-4 max-w-lg text-[15.5px] leading-relaxed text-muted">{h.trustText}</p>
          </div>
          <ul className="space-y-3">
            {[
              { icon: BadgeCheck, text: h.trustPoints.card },
              { icon: FileCheck2, text: h.trustPoints.insurance },
              { icon: UserRoundCheck, text: h.trustPoints.human },
            ].map((point) => (
              <li key={point.text} className="hover-lift flex items-center gap-4 rounded-[20px] bg-sand px-5 py-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-ink ring-1 ring-inset ring-gold-line">
                  <point.icon size={20} aria-hidden />
                </span>
                <span className="text-[15.5px] font-medium text-ink">{point.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------------ coach call */}
      <section className="mx-auto max-w-[1320px] px-4 py-14 md:px-8 md:py-20">
        <div className="on-dark bg-night relative isolate overflow-hidden rounded-[32px] px-6 py-12 text-paper md:px-14 md:py-16">
          <img src="/demo/gym.jpg" alt="" loading="lazy" className="absolute inset-y-0 right-0 -z-10 hidden h-full w-1/2 object-cover opacity-35 mix-blend-luminosity md:block" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/85 to-transparent" />
          <p className="eyebrow inline-flex items-center gap-2 text-volt">
            <ShieldCheck size={14} aria-hidden />
            {h.coachEyebrow}
          </p>
          <h2 className="display mt-4 max-w-[18ch] text-[32px] md:text-[48px]">{h.coachTitle}</h2>
          <p className="mt-4 max-w-md text-[15.5px] leading-relaxed text-white/75">{h.coachText}</p>
          <ButtonLink href={coachHref} size="lg" variant="volt" iconRight={ArrowRight} className="mt-8">
            {user?.role === "coach" ? t.common.nav.coachSpace : h.coachCta}
          </ButtonLink>
          <span aria-hidden className="absolute bottom-6 right-6 hidden opacity-40 md:block">
            <EventIcon kind="competition" size={36} />
          </span>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
