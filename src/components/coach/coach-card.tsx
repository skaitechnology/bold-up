import Link from "next/link";
import { clsx } from "clsx";
import { MapPin } from "lucide-react";
import { SportIcon } from "@/components/brand/sport-icon";
import { DemoBadge, VerifiedBadge } from "@/components/ui/badge";
import { formatDistance, formatPrice } from "@/lib/format";
import { localizedName } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n";
import type { CoachCard as Coach } from "@/lib/search";
import { CoachPortrait } from "./coach-portrait";
import { FavoriteButton } from "./favorite-button";

type Props = {
  coach: Coach;
  t: Dictionary;
  locale: Locale;
  favorite: boolean;
  signedIn: boolean;
  eager?: boolean;
};

function Meta({ coach, locale }: Pick<Props, "coach" | "locale">) {
  return (
    <p className="flex min-w-0 items-center gap-1.5 text-[13.5px] text-muted">
      <MapPin size={14} aria-hidden className="shrink-0" />
      <span className="truncate">
        {coach.city}
        {coach.distanceKm != null ? ` · ${formatDistance(coach.distanceKm, locale)}` : ""}
      </span>
    </p>
  );
}

function Price({ coach, t, locale }: Pick<Props, "coach" | "t" | "locale">) {
  if (coach.minPriceCents == null) return null;
  return (
    <p className="shrink-0 text-[13.5px] text-muted">
      {t.common.from} <span className="text-[15.5px] font-semibold text-ink">{formatPrice(coach.minPriceCents, locale)}</span>
    </p>
  );
}

/** Portrait card for grids: the photo carries the card, the name sits on it. */
export function CoachCard({ coach, t, locale, favorite, signedIn, eager }: Props) {
  return (
    <article className="group relative" data-tone={coach.sports[0]?.slug ?? "coach"}>
      <Link href={`/coach/${coach.slug}`} className="block" data-testid="coach-card">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[24px] bg-sand2 transition-shadow duration-300 group-hover:shadow-lift">
          <span aria-hidden className="tone-solid absolute inset-x-0 bottom-0 z-10 h-1.5 origin-left scale-x-[0.28] transition-transform duration-500 ease-out-soft group-hover:scale-x-100" />
          <div className="h-full w-full transition-transform duration-700 ease-out-soft group-hover:scale-[1.04]">
            <CoachPortrait photoPath={coach.photoPath} name={coach.displayName} eager={eager} />
          </div>
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/10" />
          <div className="absolute left-3.5 top-3.5 flex flex-wrap items-center gap-1.5">
            <VerifiedBadge label={t.common.verified} size="sm" glass />
          </div>
          <div className="absolute inset-x-0 bottom-0 p-4">
            <h3 className="display text-[23px] text-white">{coach.displayName}</h3>
            <p className="mt-1.5 line-clamp-1 text-[13.5px] text-white/80">{coach.headline}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 px-1">
          <Meta coach={coach} locale={locale} />
          <Price coach={coach} t={t} locale={locale} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 px-1">
          {coach.sports.slice(0, 3).map((sport) => (
            <span key={sport.id} data-tone={sport.slug} className="tone-soft inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold">
              <SportIcon icon={sport.icon} size={12} />
              {localizedName(sport, locale)}
            </span>
          ))}
          {coach.isDemo ? <DemoBadge label={t.common.demo} /> : null}
        </div>
      </Link>
      <FavoriteButton coachId={coach.id} initial={favorite} signedIn={signedIn} className="absolute right-3.5 top-3.5" />
    </article>
  );
}

/** Horizontal card for the result list next to the map. */
export function CoachRow({
  coach,
  t,
  locale,
  favorite,
  signedIn,
  active,
  onHover,
}: Props & { active?: boolean; onHover?: (id: string | null) => void }) {
  return (
    <article
      className={clsx(
        "group relative rounded-[22px] border bg-paper p-2.5 transition",
        active ? "tone-border shadow-lift" : "border-line hover:border-line2 hover:shadow-card",
      )}
      data-tone={coach.sports[0]?.slug ?? "coach"}
      onMouseEnter={onHover ? () => onHover(coach.id) : undefined}
      onMouseLeave={onHover ? () => onHover(null) : undefined}
      data-coach-id={coach.id}
    >
      <Link href={`/coach/${coach.slug}`} className="flex gap-3.5" data-testid="coach-card">
        <div className="relative h-[124px] w-[104px] shrink-0 overflow-hidden rounded-2xl bg-sand2">
          <CoachPortrait photoPath={coach.photoPath} name={coach.displayName} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col py-1 pr-10">
          <div className="flex flex-wrap items-center gap-1.5">
            <VerifiedBadge label={t.common.verified} size="sm" />
            {coach.isDemo ? <DemoBadge label={t.common.demo} /> : null}
          </div>
          <h3 className="display mt-2 truncate text-[19px] text-ink">{coach.displayName}</h3>
          <p className="mt-1 line-clamp-1 text-[13.5px] text-muted">{coach.headline}</p>
          <div className="mt-auto flex items-end justify-between gap-3 pt-2">
            <Meta coach={coach} locale={locale} />
            <Price coach={coach} t={t} locale={locale} />
          </div>
        </div>
      </Link>
      <FavoriteButton coachId={coach.id} initial={favorite} signedIn={signedIn} variant="outline" className="absolute right-3 top-3 !h-9 !w-9" />
    </article>
  );
}
