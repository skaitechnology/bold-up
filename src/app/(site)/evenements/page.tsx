import type { Metadata } from "next";
import Link from "next/link";
import { CalendarX2 } from "lucide-react";
import { EventIcon } from "@/components/brand/kind-icon";
import { EventCardView } from "@/components/events/event-card";
import { EventsPlacePicker } from "@/components/events/events-place-picker";
import { buildEventsUrl, hasEventFilters, parseEventParams, type EventsState } from "@/components/events/utils";
import { HomeMap } from "@/components/site/home-map";
import { SiteFooter } from "@/components/site/site-footer";
import { ButtonLink } from "@/components/ui/button";
import { ChipLink } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/misc";
import { listPublicEvents } from "@/lib/data/events";
import { EVENT_KINDS } from "@/lib/domain";
import { parisDateKey } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { RADIUS_OPTIONS, searchEvents } from "@/lib/search";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const [{ t }, params] = await Promise.all([getI18n(), searchParams]);
  const state = parseEventParams(params);
  const title = state.kind ? `${t.events.kindsPlural[state.kind]} · ${state.place.name}` : `${t.events.metaTitle} · ${state.place.name}`;
  return { title, description: t.events.metaDescription, alternates: { canonical: "/evenements" } };
}

export default async function EventsPage({ searchParams }: PageProps) {
  const [params, { t, locale }, all] = await Promise.all([searchParams, getI18n(), listPublicEvents()]);
  const e = t.events;
  const f = e.filters;
  const state = parseEventParams(params);
  const today = parisDateKey(new Date());

  const filters = { center: state.place, radiusKm: state.radiusKm, sport: state.sport, today, period: state.period, freeOnly: state.freeOnly, sort: state.sort };
  const events = searchEvents(all, { ...filters, kind: state.kind });
  // how many events each type would show with the other filters kept as they are
  const withoutKind = searchEvents(all, filters);
  const countOf = (kind: string) => withoutKind.filter((event) => event.kind === kind).length;

  const url = (patch: Partial<EventsState>) => buildEventsUrl({ ...state, ...patch });
  const label = "eyebrow shrink-0 text-faint";
  const divider = <span aria-hidden className="mx-1.5 h-6 w-px shrink-0 bg-line2" />;

  return (
    <>
      {/* ------------------------------------------------------------ header */}
      <section className="on-dark bg-night relative isolate overflow-hidden text-paper">
        <EventIcon kind="competition" size={340} className="animate-float absolute -right-10 -top-8 -z-10 hidden rotate-12 text-white/[0.06] md:block" />
        <div className="mx-auto max-w-[1320px] px-4 pb-9 pt-10 md:px-8 md:pb-14 md:pt-16">
          <p className="eyebrow animate-fade-up text-volt">{e.eyebrow}</p>
          <h1 className="display animate-fade-up mt-4 text-[40px] sm:text-[52px] md:text-[68px]" style={{ animationDelay: "60ms" }}>
            {e.heading}
          </h1>
          <p className="animate-fade-up mt-4 max-w-xl text-[16px] leading-relaxed text-white/80 md:text-[17.5px]" style={{ animationDelay: "120ms" }}>
            {e.intro}
          </p>
          <div className="animate-fade-up mt-7 max-w-md" style={{ animationDelay: "180ms" }}>
            <p className="eyebrow mb-2 text-white/60">{f.city}</p>
            <EventsPlacePicker state={state} label={f.city} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1320px] px-4 py-6 md:px-8 md:py-9">
        {/* ------------------------------------------------------------ filters */}
        <nav aria-label={f.label} className="space-y-3">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label={f.type}>
            <ChipLink href={url({ kind: null })} active={!state.kind} tone="event" data-testid="event-type-all">
              {f.allTypes}
              <span className="tabular opacity-70">{withoutKind.length}</span>
            </ChipLink>
            {EVENT_KINDS.map((kind) => {
              const active = state.kind === kind;
              return (
                <ChipLink key={kind} href={url({ kind: active ? null : kind })} active={active} tone={kind} data-testid={`event-type-${kind}`}>
                  <EventIcon kind={kind} size={15} className={active ? undefined : "tone-text"} />
                  {e.kindsPlural[kind]}
                  <span className="tabular opacity-70">{countOf(kind)}</span>
                </ChipLink>
              );
            })}
          </div>

          <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
            <span className={label}>{f.period}</span>
            <ChipLink size="sm" href={url({ period: null })} active={!state.period} tone="event">
              {f.anyPeriod}
            </ChipLink>
            <ChipLink size="sm" href={url({ period: "month" })} active={state.period === "month"} tone="event" data-testid="event-period-month">
              {f.month}
            </ChipLink>
            <ChipLink size="sm" href={url({ period: "quarter" })} active={state.period === "quarter"} tone="event" data-testid="event-period-quarter">
              {f.quarter}
            </ChipLink>
            {divider}
            <span className={label}>{f.radius}</span>
            <ChipLink size="sm" href={url({ radiusKm: null })} active={!state.radiusKm} tone="event">
              {f.anyRadius}
            </ChipLink>
            {RADIUS_OPTIONS.map((km) => (
              <ChipLink key={km} size="sm" href={url({ radiusKm: km })} active={state.radiusKm === km} tone="event" data-testid={`event-radius-${km}`}>
                {f.within(km)}
              </ChipLink>
            ))}
            {divider}
            <ChipLink size="sm" href={url({ freeOnly: !state.freeOnly })} active={state.freeOnly} tone="remise-en-forme" data-testid="event-free">
              {f.free}
            </ChipLink>
            {divider}
            <span className={label}>{f.sort}</span>
            <ChipLink size="sm" href={url({ sort: "date" })} active={state.sort === "date"}>
              {f.sortDate}
            </ChipLink>
            <ChipLink size="sm" href={url({ sort: "distance" })} active={state.sort === "distance"} data-testid="event-sort-distance">
              {f.sortDistance}
            </ChipLink>
          </div>
        </nav>

        <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-[15.5px] font-semibold text-ink" data-testid="event-count" aria-live="polite">
            {e.results(events.length)} <span className="font-normal text-muted">{e.near(state.place.name)}</span>
          </p>
          {hasEventFilters(state) ? (
            <Link href={buildEventsUrl({ place: state.place })} scroll={false} className="text-[13.5px] font-semibold text-ink underline underline-offset-4">
              {f.reset}
            </Link>
          ) : null}
        </div>

        {/* ------------------------------------------------------------ map + cards */}
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,40%)] lg:items-start">
          <section aria-label={e.mapTitle} className="h-[300px] overflow-hidden rounded-[28px] border border-line bg-sand2 shadow-card md:h-[380px] lg:sticky lg:top-[92px] lg:order-2 lg:h-[calc(100dvh-124px)]">
            <HomeMap center={state.place} coaches={[]} venues={[]} events={events} />
          </section>

          <div className="lg:order-1">
            {events.length === 0 ? (
              <EmptyState
                icon={CalendarX2}
                title={e.emptyTitle}
                text={e.emptyText}
                action={
                  <ButtonLink href={buildEventsUrl({ place: state.place })} variant="secondary">
                    {f.reset}
                  </ButtonLink>
                }
              />
            ) : (
              <ul className="stagger grid gap-5 sm:grid-cols-2">
                {events.map((event) => (
                  <li key={event.id}>
                    <EventCardView event={event} t={t} locale={locale} today={today} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
