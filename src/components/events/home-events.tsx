import { clsx } from "clsx";
import { ArrowRight } from "lucide-react";
import { EventIcon } from "@/components/brand/kind-icon";
import { ButtonLink } from "@/components/ui/button";
import { ChipLink } from "@/components/ui/chip";
import { EVENT_KINDS } from "@/lib/domain";
import { parisDateKey } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { EventCard } from "@/lib/search";
import { EventCardView } from "./event-card";
import { buildEventsUrl } from "./utils";

/** On phones the rail scrolls sideways; from tablet up it becomes a grid of the next four. */
const RAIL_SIZE = 6;
const GRID_SIZE = 4;

/**
 * The "Évènements" section of the home page, right under the hero.
 * Presentational: the caller passes upcoming events, already filtered and sorted.
 */
export function HomeEvents({ events, t, locale }: { events: EventCard[]; t: Dictionary; locale: Locale }) {
  const e = t.events;
  const today = parisDateKey(new Date());
  const shown = events.slice(0, RAIL_SIZE);
  // only offer the kinds that actually have something coming up
  const kinds = EVENT_KINDS.filter((kind) => events.some((event) => event.kind === kind));

  return (
    <section aria-labelledby="home-events-title" className="relative overflow-hidden border-b border-line bg-paper" data-testid="home-events">
      <div className="mx-auto max-w-[1320px] px-4 py-12 md:px-8 md:py-16">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="eyebrow text-flame-gradient inline-block">{e.home.eyebrow}</p>
            <h2 id="home-events-title" className="display mt-3 text-[34px] text-ink md:text-[48px]">
              {e.home.title}
            </h2>
            <p className="mt-3 max-w-xl text-[15.5px] leading-relaxed text-muted">{e.home.intro}</p>
          </div>
          <ButtonLink href="/evenements" variant="secondary" iconRight={ArrowRight} className="hidden shrink-0 md:inline-flex">
            {e.home.seeAll}
          </ButtonLink>
        </div>

        {kinds.length ? (
          <ul className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
            {kinds.map((kind) => (
              <li key={kind} className="shrink-0">
                <ChipLink href={buildEventsUrl({ kind })} tone={kind}>
                  <EventIcon kind={kind} size={15} className="tone-text" />
                  {e.kindsPlural[kind]}
                </ChipLink>
              </li>
            ))}
          </ul>
        ) : null}

        {shown.length === 0 ? (
          <p className="mt-8 rounded-[24px] bg-sand px-6 py-12 text-center text-[15px] text-muted">{e.home.empty}</p>
        ) : (
          <ul className="no-scrollbar stagger -mx-4 mt-7 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4">
            {shown.map((event, index) => (
              <li key={event.id} className={clsx("w-[78vw] max-w-[300px] shrink-0 snap-center md:w-auto md:max-w-none", index >= GRID_SIZE && "md:hidden")}>
                <EventCardView event={event} t={t} locale={locale} today={today} />
              </li>
            ))}
          </ul>
        )}

        <ButtonLink href="/evenements" variant="secondary" block iconRight={ArrowRight} className="mt-6 md:hidden">
          {e.home.seeAll}
        </ButtonLink>
      </div>
    </section>
  );
}
