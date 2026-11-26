import Link from "next/link";
import { clsx } from "clsx";
import { ArrowUpRight, MapPin } from "lucide-react";
import { PlaceIcon } from "@/components/brand/kind-icon";
import { DemoBadge } from "@/components/ui/badge";
import { placeHref } from "@/lib/domain";
import { formatDistance } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { VenueCard } from "@/lib/search";
import { splitFacilities, SPOT_EQUIPMENT } from "./params";
import { FeaturePills, SportPill, sportsOf, type SportLite } from "./place-bits";

/**
 * Card for a club or a street workout spot. There is no photo for these places, so the
 * cover is designed: the discipline colour for a club, night and volt for an outdoor spot.
 */
export function PlaceCard({ place, sports, t, locale, compact }: { place: VenueCard; sports: readonly SportLite[]; t: Dictionary; locale: Locale; compact?: boolean }) {
  const isSpot = place.category === "street_workout";
  const placeSports = sportsOf(place.sports, sports);
  const { known } = splitFacilities(place.facilities);
  // apparatus first: it is what a visitor looks for on a spot
  const equipment = [...known.filter((item) => (SPOT_EQUIPMENT as readonly string[]).includes(item)), ...known.filter((item) => !(SPOT_EQUIPMENT as readonly string[]).includes(item))];
  const coverTone = isSpot ? "street_workout" : (placeSports[0]?.slug ?? "club");

  return (
    <Link
      href={placeHref(place)}
      data-testid="place-card"
      data-kind={place.category}
      className={clsx("hover-lift group flex h-full flex-col overflow-hidden rounded-[26px] border border-line bg-paper", compact && "w-[280px] shrink-0 snap-start")}
    >
      <div data-tone={coverTone} className={clsx("relative overflow-hidden", compact ? "h-[104px]" : "h-[132px]", isSpot ? "bg-ink" : "tone-cover")}>
        {isSpot ? <span aria-hidden className="tone-solid absolute -right-8 -top-10 h-32 w-32 rounded-full opacity-35 blur-2xl" /> : null}
        <span
          aria-hidden
          className={clsx(
            "absolute -bottom-5 -right-3 transition-transform duration-500 ease-out-soft group-hover:-translate-y-1.5 group-hover:-rotate-6 group-hover:scale-110",
            isSpot ? "tone-fill opacity-90" : "text-white/30",
          )}
        >
          <PlaceIcon category={place.category} size={compact ? 92 : 112} />
        </span>
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          {/* volt on night for a spot; white on the discipline colour for a club, so it never blends in */}
          <span data-tone={place.category} className={clsx("inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-bold", isSpot ? "tone-solid" : "bg-paper text-ink")}>
            <span className={clsx(!isSpot && "tone-text")}>
              <PlaceIcon category={place.category} size={12} />
            </span>
            {t.common.venueCategories[place.category]}
          </span>
          {isSpot && place.isFree ? <span className="inline-flex h-6 items-center rounded-full bg-paper px-2.5 text-[11.5px] font-bold text-ink">{t.places.spots.free}</span> : null}
          {isSpot && place.alwaysOpen ? <span className="inline-flex h-6 items-center rounded-full bg-paper/15 px-2.5 text-[11.5px] font-bold text-white ring-1 ring-inset ring-white/30">{t.places.spots.alwaysOpen}</span> : null}
        </div>
        {place.distanceKm != null ? (
          <span className="absolute bottom-3 left-3 inline-flex h-7 items-center gap-1 rounded-full bg-paper px-2.5 text-[12px] font-bold tabular text-ink shadow-card">
            <MapPin size={12} aria-hidden />
            {formatDistance(place.distanceKm, locale)}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[17px] font-semibold leading-snug tracking-tight text-ink">{place.name}</h3>
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sand text-ink transition group-hover:bg-ink group-hover:text-paper">
            <ArrowUpRight size={16} aria-hidden />
          </span>
        </div>
        <p className="mt-1 flex items-center gap-2 text-[13.5px] text-muted">
          <span className="truncate">{place.city}</span>
          {place.isDemo ? <DemoBadge label={t.common.demo} /> : null}
        </p>
        <div className="no-scrollbar -mx-1 mt-auto flex flex-wrap items-center gap-1.5 px-1 pt-3.5">
          {isSpot ? <FeaturePills features={equipment} t={t} max={compact ? 2 : 3} /> : placeSports.map((sport) => <SportPill key={sport.slug} sport={sport} locale={locale} />)}
        </div>
      </div>
    </Link>
  );
}
