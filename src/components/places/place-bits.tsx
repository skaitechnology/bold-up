import Link from "next/link";
import { clsx } from "clsx";
import { SportIcon } from "@/components/brand/sport-icon";
import { isPlaceFeature } from "@/lib/domain";
import { localizedName, type Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { buildSearchUrl } from "@/lib/search-params";
import { FeatureIcon } from "./feature-icon";

export type SportLite = { slug: string; name_fr: string; name_en: string; icon: string };

/** Label of a facility: translated when it is a known key, shown as written otherwise. */
export function featureLabel(feature: string, t: Dictionary): string {
  return isPlaceFeature(feature) ? t.places.features[feature] : feature;
}

/** Keeps the sports of a place that exist in the catalogue, in catalogue order. */
export function sportsOf(slugs: readonly string[], sports: readonly SportLite[]): SportLite[] {
  return sports.filter((sport) => slugs.includes(sport.slug));
}

/** Small coloured discipline pill. Becomes a link to the coach search when `link` is set. */
export function SportPill({ sport, locale, size = "sm", link }: { sport: SportLite; locale: Locale; size?: "sm" | "md"; link?: boolean }) {
  const className = clsx(
    "tone-soft inline-flex shrink-0 items-center whitespace-nowrap rounded-full font-semibold",
    size === "sm" ? "h-6 gap-1.5 px-2.5 text-[12px]" : "press h-10 gap-2 px-4 text-[14px]",
    link && "transition hover:brightness-95",
  );
  const content = (
    <>
      <SportIcon icon={sport.icon} size={size === "sm" ? 12 : 16} />
      {localizedName(sport, locale)}
    </>
  );
  if (link) {
    return (
      <Link href={buildSearchUrl({ sport: sport.slug })} data-tone={sport.slug} className={className} data-testid="place-sport">
        {content}
      </Link>
    );
  }
  return (
    <span data-tone={sport.slug} className={className}>
      {content}
    </span>
  );
}

/** Facility pills for a card: the first few, then "+n". */
export function FeaturePills({ features, t, max = 3 }: { features: readonly string[]; t: Dictionary; max?: number }) {
  const shown = features.slice(0, max);
  const rest = features.length - shown.length;
  return (
    <>
      {shown.map((feature) => (
        <span key={feature} className="inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-sand2 px-2.5 text-[12px] font-medium text-ink2">
          <FeatureIcon feature={feature} size={12} />
          {featureLabel(feature, t)}
        </span>
      ))}
      {rest > 0 ? <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-sand px-2 text-[12px] font-semibold text-muted">{t.places.list.more(rest)}</span> : null}
    </>
  );
}

/** Facility tiles for a detail page: icon in a tone-coloured square, label next to it. */
export function FeatureGrid({ features, t, tone }: { features: readonly string[]; t: Dictionary; tone: string }) {
  return (
    <ul className="stagger grid gap-2.5 sm:grid-cols-2" data-tone={tone}>
      {features.map((feature) => (
        <li key={feature} className="flex items-center gap-3 rounded-2xl border border-line bg-paper px-3.5 py-3" data-testid="place-feature">
          <span className="tone-soft flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <FeatureIcon feature={feature} size={19} />
          </span>
          <span className="min-w-0 text-[14.5px] font-medium text-ink">{featureLabel(feature, t)}</span>
        </li>
      ))}
    </ul>
  );
}
