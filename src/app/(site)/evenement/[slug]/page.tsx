import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BarChart3, Building2, CalendarDays, CalendarPlus, Clock, Globe, Info, Layers, MapPin, Navigation, Ticket } from "lucide-react";
import type { ReactNode } from "react";
import { EventIcon } from "@/components/brand/kind-icon";
import { SportIcon } from "@/components/brand/sport-icon";
import { CoachCard } from "@/components/coach/coach-card";
import { ShareButton } from "@/components/coach/share-button";
import { CountdownPill, DateTile, EventCardView } from "@/components/events/event-card";
import { eventCountdown, eventDateLabel, fullDate, isMultiDay } from "@/components/events/utils";
import { PinMap } from "@/components/map/area-map";
import { SiteFooter } from "@/components/site/site-footer";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, Notice } from "@/components/ui/misc";
import { getSessionUser } from "@/lib/auth/session";
import { getFavoriteCoachIds, listPublicCoaches, listSports } from "@/lib/data/coaches";
import { getEventBySlug, listPublicEvents } from "@/lib/data/events";
import type { EventKind, EventLevel } from "@/lib/domain";
import { formatPrice, parisDateKey } from "@/lib/format";
import { localizedName } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { searchCoaches, searchEvents } from "@/lib/search";
import { buildSearchUrl } from "@/lib/search-params";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [event, { t }] = await Promise.all([getEventBySlug(slug), getI18n()]);
  if (!event) return { title: t.common.notFound.title, robots: { index: false } };
  return {
    title: `${event.name} — ${t.events.kinds[event.kind as EventKind]}${event.city ? ` · ${event.city}` : ""}`,
    description: event.summary || t.events.metaDescription,
    alternates: { canonical: `/evenement/${event.slug}` },
    // fictional or unpublished content has no business in a search engine
    robots: event.is_demo || !event.is_published ? { index: false } : undefined,
  };
}

function Fact({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3.5 rounded-[20px] bg-sand px-4 py-3.5">
      <span className="tone-soft mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">{icon}</span>
      <div className="min-w-0">
        <dt className="text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">{label}</dt>
        <dd className="mt-0.5 text-[15px] font-medium leading-snug text-ink">{children}</dd>
      </div>
    </div>
  );
}

export default async function EventPage({ params }: PageProps) {
  const { slug } = await params;
  const [event, { t, locale }, user, allCoaches, allEvents, sports] = await Promise.all([
    getEventBySlug(slug),
    getI18n(),
    getSessionUser(),
    listPublicCoaches(),
    listPublicEvents(),
    listSports(),
  ]);
  if (!event) notFound();

  const e = t.events;
  const d = e.detail;
  const kind = event.kind as EventKind;
  const today = parisDateKey(new Date());
  const dated = { startsOn: event.starts_on, endsOn: event.ends_on };
  const over = eventCountdown(dated, today).state === "past";
  const startTime = event.start_time ? event.start_time.slice(0, 5) : null;
  const center = { lat: event.lat, lng: event.lng };
  const address = [event.address, [event.postal_code, event.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const price = event.is_free ? e.free : event.price_from_cents != null ? e.priceFrom(formatPrice(event.price_from_cents, locale)) : e.priceUnknown;

  const sport = event.sport_slug ? (sports.find((item) => item.slug === event.sport_slug) ?? null) : null;
  // coaches of the event's discipline first, then the nearest ones to fill the row
  const sportCoaches = sport ? searchCoaches(allCoaches, { sport: sport.slug, center }).slice(0, 4) : [];
  const nearest = searchCoaches(allCoaches, { center, radiusKm: 20 }).filter((coach) => !sportCoaches.some((item) => item.id === coach.id));
  const coaches = [...sportCoaches, ...nearest].slice(0, 4);
  // the wording only names the discipline when every coach shown practises it
  const coachesMatchSport = sport !== null && sportCoaches.length > 0 && sportCoaches.length === coaches.length;
  const sportHasCoaches = sport !== null && sportCoaches.length > 0;
  const favorites = user && coaches.length ? await getFavoriteCoachIds(user.id) : [];
  const others = searchEvents(allEvents, { today, center })
    .filter((item) => item.id !== event.id)
    .slice(0, 3);

  return (
    <>
      <div className="mx-auto max-w-[1320px] px-4 py-6 md:px-8 md:py-10" data-tone={kind}>
        <Link href="/evenements" className="inline-flex items-center gap-2 text-[14px] font-medium text-muted hover:text-ink">
          <ArrowLeft size={16} aria-hidden />
          {d.back}
        </Link>

        {!event.is_published ? (
          <Notice tone="warn" icon={Info} className="mt-4">
            {d.unpublished}
          </Notice>
        ) : null}

        {/* ------------------------------------------------------------ hero */}
        <header className="tone-cover on-dark relative isolate mt-5 overflow-hidden rounded-[28px] md:rounded-[36px]">
          {/* keeps the white text readable on every tone, the light ones included */}
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-tr from-ink/90 via-ink/55 to-ink/10" />
          <EventIcon kind={kind} size={420} className="animate-float absolute -right-16 -top-10 -z-10 hidden -rotate-12 opacity-20 md:block" />
          <EventIcon kind={kind} size={220} className="absolute -right-10 -top-6 -z-10 -rotate-12 opacity-20 md:hidden" />
          <div className="flex flex-col gap-6 p-5 pt-8 md:flex-row md:items-end md:gap-8 md:p-10 md:pt-24">
            <DateTile dateKey={event.starts_on} locale={locale} size="lg" className="animate-pop" />
            <div className="min-w-0 flex-1">
              <div className="animate-fade-up flex flex-wrap items-center gap-2">
                <Badge tone="glass">
                  <EventIcon kind={kind} size={13.5} />
                  {e.kinds[kind]}
                </Badge>
                <CountdownPill event={dated} today={today} t={t} />
                {event.is_demo ? <span className="inline-flex h-7 items-center rounded-md border border-dashed border-white/50 px-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/85">{t.common.demo}</span> : null}
              </div>
              <h1 className="display animate-fade-up mt-4 text-[34px] sm:text-[44px] md:text-[60px]" style={{ animationDelay: "60ms" }} data-testid="event-name">
                {event.name}
              </h1>
              <p className="animate-fade-up capitalize-first mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[15px] text-white/85 md:text-[16.5px]" style={{ animationDelay: "120ms" }}>
                <span className="inline-flex items-center gap-2">
                  <CalendarDays size={17} aria-hidden />
                  {eventDateLabel(dated, locale, e.dateRange)}
                </span>
                {event.city ? (
                  <span className="inline-flex items-center gap-2">
                    <MapPin size={17} aria-hidden />
                    {[event.place_name, event.city].filter(Boolean).join(" · ")}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-12">
          {/* ------------------------------------------------------------ main column */}
          <div className="min-w-0">
            {event.is_demo ? (
              <div className="mb-7" data-testid="event-demo-notice">
                <Notice tone="neutral" icon={Info} title={d.demoTitle}>
                  {d.demoText}
                </Notice>
              </div>
            ) : null}
            {over ? (
              <Notice tone="warn" icon={Info} className="mb-7">
                {d.past}
              </Notice>
            ) : null}

            {event.summary ? <p className="max-w-2xl text-[19px] font-medium leading-snug tracking-tight text-ink md:text-[22px]">{event.summary}</p> : null}

            <section className="mt-8">
              <h2 className="display text-[22px] text-ink md:text-[26px]">{d.infoTitle}</h2>
              <dl className="stagger mt-4 grid gap-3 sm:grid-cols-2">
                <Fact icon={<CalendarDays size={18} aria-hidden />} label={d.facts.date}>
                  <span className="capitalize-first block">
                    {isMultiDay(dated) ? e.dateRange(fullDate(event.starts_on, locale), fullDate(event.ends_on as string, locale)) : fullDate(event.starts_on, locale)}
                  </span>
                </Fact>
                {startTime ? (
                  <Fact icon={<Clock size={18} aria-hidden />} label={d.facts.time}>
                    <span className="tabular">{startTime}</span> <span className="text-[13px] font-normal text-muted">· {d.parisTime}</span>
                  </Fact>
                ) : null}
                <Fact icon={<MapPin size={18} aria-hidden />} label={d.facts.place}>
                  {event.place_name || event.city}
                  {event.place_name && event.city ? <span className="block text-[13.5px] font-normal text-muted">{address || event.city}</span> : null}
                </Fact>
                <Fact icon={<Ticket size={18} aria-hidden />} label={d.facts.price}>
                  <span className="capitalize-first block">{price}</span>
                </Fact>
                <Fact icon={<BarChart3 size={18} aria-hidden />} label={d.facts.level}>
                  {e.levels[event.level as EventLevel]}
                </Fact>
                {event.organizer ? (
                  <Fact icon={<Building2 size={18} aria-hidden />} label={d.facts.organizer}>
                    {event.organizer}
                  </Fact>
                ) : null}
              </dl>
            </section>

            {event.formats.length ? (
              <section className="mt-8">
                <h2 className="display flex items-center gap-2.5 text-[22px] text-ink md:text-[26px]">
                  <Layers size={20} aria-hidden className="tone-text" />
                  {d.facts.formats}
                </h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {event.formats.map((format) => (
                    <li key={format} className="tone-soft inline-flex h-10 items-center rounded-full px-4 text-[14px] font-semibold">
                      {format}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {event.description ? (
              <section className="mt-8">
                <h2 className="display text-[22px] text-ink md:text-[26px]">{d.about}</h2>
                <p className="mt-4 max-w-2xl whitespace-pre-line text-[16px] leading-[1.7] text-ink2">{event.description}</p>
              </section>
            ) : null}
          </div>

          {/* ------------------------------------------------------------ where + actions */}
          <aside className="space-y-5">
            <Card className="overflow-hidden">
              <div className="h-[260px]">
                <PinMap center={center} title={event.name} kind="event" tone={kind} fallback={t.site.search.mapUnavailable} className="h-full w-full" />
              </div>
              <div className="space-y-3 p-5">
                <h2 className="text-[17px] font-semibold tracking-tight text-ink">{d.whereTitle}</h2>
                <p className="flex items-start gap-3 text-[14.5px] text-ink2">
                  <MapPin size={17} aria-hidden className="mt-0.5 shrink-0 text-muted" />
                  <span>
                    {event.place_name ? <span className="block font-medium text-ink">{event.place_name}</span> : null}
                    {address || event.city}
                  </span>
                </p>
                {event.website ? (
                  <a href={event.website} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-3 text-[14.5px] text-ink2 hover:text-ink">
                    <Globe size={17} aria-hidden className="shrink-0 text-muted" />
                    <span className="truncate">{d.website}</span>
                  </a>
                ) : null}
                <a
                  href={`https://www.openstreetmap.org/directions?to=${event.lat}%2C${event.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="press mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-line2 text-[14.5px] font-semibold text-ink hover:border-ink"
                  data-testid="event-directions"
                >
                  <Navigation size={16} aria-hidden />
                  {d.directions}
                </a>
              </div>
            </Card>

            <Card className="space-y-3 p-5">
              {!over ? (
                <a
                  href={`/api/events/${event.slug}/ics`}
                  download={`${event.slug}.ics`}
                  className="press bg-bold inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-full text-[15.5px] font-semibold text-white shadow-glow hover:brightness-110"
                  data-testid="event-ics"
                >
                  <CalendarPlus size={18} aria-hidden />
                  {d.addToCalendar}
                </a>
              ) : null}
              <div className="flex justify-center">
                <ShareButton url={`/evenement/${event.slug}`} title={d.shareTitle(event.name)} variant="full" />
              </div>
            </Card>
          </aside>
        </div>

        {/* ------------------------------------------------------------ prepare with a coach */}
        {coaches.length ? (
          <section className="mt-14" data-tone={coachesMatchSport && sport ? sport.slug : undefined}>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                {coachesMatchSport && sport ? (
                  <Badge tone="tone">
                    <SportIcon icon={sport.icon} size={13.5} />
                    {localizedName(sport, locale)}
                  </Badge>
                ) : null}
                <h2 className="display mt-3 text-[28px] text-ink md:text-[36px]">{d.prepareTitle}</h2>
                <p className="mt-2.5 max-w-xl text-[15.5px] leading-relaxed text-muted">
                  {coachesMatchSport && sport ? d.prepareSportText(localizedName(sport, locale).toLowerCase()) : d.prepareText}
                </p>
              </div>
              <ButtonLink href={buildSearchUrl({ sport: sportHasCoaches && sport ? sport.slug : null })} variant="secondary" iconRight={ArrowRight} className="shrink-0">
                {sportHasCoaches && sport ? d.prepareSportCta(localizedName(sport, locale)) : d.prepareCta}
              </ButtonLink>
            </div>
            <div className="mt-7 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
              {coaches.map((coach) => (
                <CoachCard key={coach.id} coach={coach} t={t} locale={locale} favorite={favorites.includes(coach.id)} signedIn={Boolean(user)} />
              ))}
            </div>
          </section>
        ) : null}

        {/* ------------------------------------------------------------ other events */}
        {others.length ? (
          <section className="mt-14">
            <div className="flex items-end justify-between gap-4">
              <h2 className="display text-[28px] text-ink md:text-[36px]">{d.otherTitle}</h2>
              <Link href="/evenements" className="hidden shrink-0 items-center gap-1.5 text-[14.5px] font-semibold text-ink underline-offset-4 hover:underline sm:inline-flex">
                {d.seeAll}
                <ArrowRight size={16} aria-hidden />
              </Link>
            </div>
            <ul className="stagger mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((item) => (
                <li key={item.id}>
                  <EventCardView event={item} t={t} locale={locale} today={today} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      <SiteFooter />
    </>
  );
}
