import Link from "next/link";
import { MapPin } from "lucide-react";
import { PlaceIcon } from "@/components/brand/kind-icon";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { placeHref } from "@/lib/domain";
import { formatDistance } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { mediaUrl } from "@/lib/media";
import type { VenueCard as Venue } from "@/lib/search";

/** Honest venue card: an official partner and an unclaimed public listing never look alike. */
export function VenueCard({ venue, t, locale }: { venue: Venue; t: Dictionary; locale: Locale }) {
  const photo = mediaUrl(venue.photoPath, "venue-media");
  return (
    <Link href={placeHref(venue)} data-tone={venue.category} className="hover-lift group flex h-full flex-col overflow-hidden rounded-[24px] border border-line bg-paper" data-testid="venue-card">
      <div className="relative aspect-[16/9] overflow-hidden bg-sand2">
        {photo ? (
          <img src={photo} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.04]" />
        ) : (
          <div className="tone-soft flex h-full w-full items-center justify-center">
            <span className="transition-transform duration-500 ease-out-soft group-hover:-rotate-6 group-hover:scale-110">
              <PlaceIcon category={venue.category} size={48} />
            </span>
          </div>
        )}
        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          {venue.partner ? (
            <Badge tone="gold" size="sm">
              {t.site.venues.partner}
            </Badge>
          ) : (
            <Badge tone="neutral" size="sm" className="!bg-paper/92">
              {venue.claimed ? t.site.venues.claimed : t.site.venues.unclaimed}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-[17px] font-semibold tracking-tight text-ink">{venue.name}</h3>
        <p className="mt-1 text-[13.5px] text-muted">{t.common.venueCategories[venue.category]}</p>
        <p className="mt-auto flex items-center gap-1.5 pt-3 text-[13.5px] text-muted">
          <MapPin size={14} aria-hidden className="shrink-0" />
          <span className="truncate">
            {venue.city}
            {venue.distanceKm != null ? ` · ${formatDistance(venue.distanceKm, locale)}` : ""}
          </span>
          {venue.isDemo ? <DemoBadge label={t.common.demo} className="ml-auto" /> : null}
        </p>
      </div>
    </Link>
  );
}
