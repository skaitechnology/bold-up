import Link from "next/link";
import { ArrowRight, ArrowUpRight, BadgeCheck, FileCheck2, ShieldCheck, UserRoundCheck } from "lucide-react";
import { SportIcon } from "@/components/brand/sport-icon";
import { CoachCard } from "@/components/coach/coach-card";
import { HomeMap } from "@/components/site/home-map";
import { HomeSearch } from "@/components/site/home-search";
import { SiteFooter } from "@/components/site/site-footer";
import { ButtonLink } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { getFavoriteCoachIds, listPublicCoaches, listSports } from "@/lib/data/coaches";
import { listPublicVenues } from "@/lib/data/venues";
import { localizedName } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { searchCoaches, searchVenues } from "@/lib/search";
import { buildSearchUrl, DEFAULT_SEARCH_PLACE } from "@/lib/search-params";

export default async function HomePage() {
  const [{ t, locale }, user, sports, allCoaches, allVenues] = await Promise.all([
    getI18n(),
    getSessionUser(),
    listSports(),
    listPublicCoaches(),
    listPublicVenues(),
  ]);
  const h = t.site.home;
  const place = DEFAULT_SEARCH_PLACE;
  const coaches = searchCoaches(allCoaches, { center: place });
  const venues = searchVenues(allVenues, { center: place, radiusKm: 10 });
  const favorites = user ? await getFavoriteCoachIds(user.id) : [];
  const coachHref = user?.role === "coach" ? "/pro" : user ? "/devenir-coach" : "/inscription?role=coach";

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section className="on-dark relative isolate overflow-hidden bg-ink text-paper">
        <img src="/demo/hero.jpg" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-55" fetchPriority="high" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/85 to-ink/30" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-ink to-transparent" />
        <div className="mx-auto max-w-[1320px] px-4 pb-14 pt-16 md:px-8 md:pb-24 md:pt-28">
          <p className="eyebrow animate-fade-up text-gold">{h.eyebrow}</p>
          <h1 className="display animate-fade-up mt-5 max-w-[15ch] text-[44px] sm:text-[60px] md:text-[84px]" style={{ animationDelay: "60ms" }}>
            {h.title}
          </h1>
          <p className="animate-fade-up mt-6 max-w-xl text-[17px] leading-relaxed text-white/80 md:text-[19px]" style={{ animationDelay: "120ms" }}>
            {h.subtitle}
          </p>
          <div className="animate-fade-up mt-9 max-w-3xl" style={{ animationDelay: "180ms" }}>
            <HomeSearch sports={sports} />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ sports */}
      <section className="border-b border-line bg-paper">
        <div className="mx-auto max-w-[1320px] px-4 py-8 md:px-8 md:py-10">
          <h2 className="eyebrow text-muted">{h.sportsTitle}</h2>
          <ul className="no-scrollbar -mx-4 mt-4 flex gap-2.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
            {sports.map((sport) => (
              <li key={sport.id} className="shrink-0">
                <Link
                  href={buildSearchUrl({ sport: sport.slug })}
                  className="press inline-flex h-12 items-center gap-2.5 rounded-full border border-line2 bg-paper px-5 text-[14.5px] font-medium text-ink hover:border-ink hover:bg-ink hover:text-paper"
                >
                  <SportIcon icon={sport.icon} size={18} />
                  {localizedName(sport, locale)}
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
          <div className="mt-9 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
            {coaches.slice(0, 4).map((coach, index) => (
              <CoachCard
                key={coach.id}
                coach={coach}
                t={t}
                locale={locale}
                favorite={favorites.includes(coach.id)}
                signedIn={Boolean(user)}
                eager={index < 2}
              />
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------ map */}
      <section className="bg-sand">
        <div className="mx-auto grid max-w-[1320px] gap-8 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-14">
          <div>
            <h2 className="display text-[32px] text-ink md:text-[44px]">{h.mapTitle}</h2>
            <p className="mt-4 max-w-md text-[15.5px] leading-relaxed text-muted">{h.mapText}</p>
            <ButtonLink href="/coachs" size="lg" iconRight={ArrowUpRight} className="mt-7">
              {h.mapCta}
            </ButtonLink>
          </div>
          <div className="h-[380px] overflow-hidden rounded-[28px] border border-line bg-paper shadow-card md:h-[480px]">
            <HomeMap center={place} coaches={coaches} venues={venues} />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ how it works */}
      <section className="mx-auto max-w-[1320px] px-4 py-14 md:px-8 md:py-20">
        <h2 className="display text-[32px] text-ink md:text-[44px]">{h.howTitle}</h2>
        <ol className="mt-9 grid gap-4 md:grid-cols-3 md:gap-5">
          {[h.how.one, h.how.two, h.how.three].map((step, index) => (
            <li key={step.title} className="rounded-[24px] border border-line bg-paper p-6 md:p-7">
              <span className="wordmark text-[40px] text-line2">0{index + 1}</span>
              <h3 className="mt-5 text-[19px] font-semibold tracking-tight text-ink">{step.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------------------ trust */}
      <section className="border-y border-line bg-paper">
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
              <li key={point.text} className="flex items-center gap-4 rounded-[20px] bg-sand px-5 py-4">
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
        <div className="on-dark relative isolate overflow-hidden rounded-[32px] bg-ink px-6 py-12 text-paper md:px-14 md:py-16">
          <img src="/demo/gym.jpg" alt="" loading="lazy" className="absolute inset-y-0 right-0 -z-10 hidden h-full w-1/2 object-cover opacity-45 md:block" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink to-ink/20" />
          <p className="eyebrow inline-flex items-center gap-2 text-gold">
            <ShieldCheck size={14} aria-hidden />
            {h.coachEyebrow}
          </p>
          <h2 className="display mt-4 max-w-[18ch] text-[32px] md:text-[48px]">{h.coachTitle}</h2>
          <p className="mt-4 max-w-md text-[15.5px] leading-relaxed text-white/75">{h.coachText}</p>
          <ButtonLink href={coachHref} size="lg" variant="inverse" iconRight={ArrowRight} className="mt-8">
            {user?.role === "coach" ? t.common.nav.coachSpace : h.coachCta}
          </ButtonLink>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
