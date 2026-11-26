import Link from "next/link";
import { RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { SportIcon } from "@/components/brand/sport-icon";
import { ChipLink } from "@/components/ui/chip";
import { localizedName, type Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { RADIUS_OPTIONS } from "@/lib/search";
import { CityFilter } from "./city-filter";
import { FeatureIcon } from "./feature-icon";
import {
  buildClubUrl,
  buildSpotUrl,
  CLUB_AUDIENCES,
  CLUB_PRACTICES,
  countClubFilters,
  countSpotFilters,
  SPOT_EQUIPMENT,
  toggleEquipment,
  type ClubState,
  type SpotState,
} from "./params";
import type { SportLite } from "./place-bits";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
      <p className="eyebrow shrink-0 text-faint md:w-[112px]">{label}</p>
      <div className="no-scrollbar -mx-4 flex min-w-0 items-center gap-2 overflow-x-auto px-4 pb-0.5 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">{children}</div>
    </div>
  );
}

function Panel({ count, resetHref, t, children }: { count: number; resetHref: string; t: Dictionary; children: ReactNode }) {
  return (
    <section aria-label={t.places.filters.title} className="animate-fade-up rounded-[26px] border border-line bg-paper p-4 shadow-card md:p-5" data-testid="place-filters">
      <div className="space-y-3.5">{children}</div>
      {count > 0 ? (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3.5">
          <p className="text-[13px] font-medium text-muted">{t.places.filters.active(count)}</p>
          <Link
            href={resetHref}
            scroll={false}
            className="press inline-flex h-9 items-center gap-2 rounded-full border border-line2 px-3.5 text-[13px] font-semibold text-ink hover:border-ink"
            data-testid="filters-reset"
          >
            <RotateCcw size={14} aria-hidden />
            {t.places.filters.reset}
          </Link>
        </div>
      ) : null}
    </section>
  );
}

function WhereRow({ place, radiusKm, baseUrl, radiusHref, tone, t }: { place: ClubState["place"]; radiusKm: number | null; baseUrl: string; radiusHref: (km: number | null) => string; tone: string; t: Dictionary }) {
  const f = t.places.filters;
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
      <p className="eyebrow shrink-0 text-faint md:w-[112px]">{f.city}</p>
      <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-center">
        <CityFilter place={place} radiusKm={radiusKm} baseUrl={baseUrl} className="min-w-0 lg:w-[320px] lg:shrink-0" />
        <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:overflow-visible md:px-0" role="group" aria-label={f.radius}>
          {[null, ...RADIUS_OPTIONS].map((km) => (
            <ChipLink key={String(km)} href={radiusHref(km)} active={radiusKm === km} tone={tone} size="sm" data-testid={`radius-${km ?? "all"}`}>
              {km ? f.within(km) : f.anyRadius}
            </ChipLink>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Filters of /clubs: where, discipline, audience, practice, accessibility. All of it is URL state. */
export function ClubFilterBar({ state, sports, t, locale }: { state: ClubState; sports: readonly SportLite[]; t: Dictionary; locale: Locale }) {
  const c = t.places.clubs;
  const url = (patch: Partial<ClubState>) => buildClubUrl({ ...state, ...patch });
  return (
    <Panel count={countClubFilters(state)} resetHref={buildClubUrl({ place: state.place })} t={t}>
      <WhereRow
        place={state.place}
        radiusKm={state.radiusKm}
        baseUrl={buildClubUrl({ ...state, place: undefined, radiusKm: null })}
        radiusHref={(km) => url({ radiusKm: km })}
        tone="club"
        t={t}
      />
      <Row label={c.discipline}>
        <ChipLink href={url({ sport: null })} active={!state.sport} size="sm">
          {c.allDisciplines}
        </ChipLink>
        {sports.map((sport) => (
          <ChipLink
            key={sport.slug}
            href={url({ sport: state.sport === sport.slug ? null : sport.slug })}
            active={state.sport === sport.slug}
            tone={sport.slug}
            size="sm"
            data-testid={`club-sport-${sport.slug}`}
          >
            {/* the discipline colour shows on the icon until the chip is selected and takes it whole */}
            <span className={state.sport === sport.slug ? undefined : "tone-fill"}>
              <SportIcon icon={sport.icon} size={14} />
            </span>
            {localizedName(sport, locale)}
          </ChipLink>
        ))}
      </Row>
      <Row label={c.audience}>
        {CLUB_AUDIENCES.map((audience) => (
          <ChipLink
            key={audience}
            href={url({ audience: state.audience === audience ? null : audience })}
            active={state.audience === audience}
            tone="club"
            size="sm"
            data-testid={`club-audience-${audience}`}
          >
            <FeatureIcon feature={audience} size={14} />
            {t.places.features[audience]}
          </ChipLink>
        ))}
      </Row>
      <Row label={c.practice}>
        {CLUB_PRACTICES.map((practice) => (
          <ChipLink
            key={practice}
            href={url({ practice: state.practice === practice ? null : practice })}
            active={state.practice === practice}
            tone="club"
            size="sm"
            data-testid={`club-practice-${practice}`}
          >
            <FeatureIcon feature={practice} size={14} />
            {t.places.features[practice]}
          </ChipLink>
        ))}
        <ChipLink href={url({ accessible: !state.accessible })} active={state.accessible} tone="club" size="sm" data-testid="club-accessible">
          <FeatureIcon feature="accessible" size={14} />
          {t.places.features.accessible}
        </ChipLink>
      </Row>
    </Panel>
  );
}

/** Filters of /street-workout: where, equipment (several at once), comfort, round-the-clock access. */
export function SpotFilterBar({ state, t }: { state: SpotState; t: Dictionary }) {
  const s = t.places.spots;
  const url = (patch: Partial<SpotState>) => buildSpotUrl({ ...state, ...patch });
  const comfort = [
    { key: "lighting", active: state.lighting, href: url({ lighting: !state.lighting }) },
    { key: "water", active: state.water, href: url({ water: !state.water }) },
    { key: "covered", active: state.covered, href: url({ covered: !state.covered }) },
  ] as const;
  return (
    <Panel count={countSpotFilters(state)} resetHref={buildSpotUrl({ place: state.place })} t={t}>
      <WhereRow
        place={state.place}
        radiusKm={state.radiusKm}
        baseUrl={buildSpotUrl({ ...state, place: undefined, radiusKm: null })}
        radiusHref={(km) => url({ radiusKm: km })}
        tone="street_workout"
        t={t}
      />
      <Row label={s.equipment}>
        {SPOT_EQUIPMENT.map((item) => (
          <ChipLink
            key={item}
            href={url({ equipment: toggleEquipment(state, item) })}
            active={state.equipment.includes(item)}
            tone="street_workout"
            size="sm"
            data-testid={`spot-equipment-${item}`}
          >
            <FeatureIcon feature={item} size={14} />
            {t.places.features[item]}
          </ChipLink>
        ))}
      </Row>
      <Row label={s.comfort}>
        {comfort.map((item) => (
          <ChipLink key={item.key} href={item.href} active={item.active} tone="street_workout" size="sm" data-testid={`spot-${item.key}`}>
            <FeatureIcon feature={item.key} size={14} />
            {t.places.features[item.key]}
          </ChipLink>
        ))}
      </Row>
      <Row label={s.access}>
        <ChipLink href={url({ alwaysOpen: !state.alwaysOpen })} active={state.alwaysOpen} tone="street_workout" size="sm" data-testid="spot-always-open">
          {s.alwaysOpenLong}
        </ChipLink>
      </Row>
    </Panel>
  );
}
