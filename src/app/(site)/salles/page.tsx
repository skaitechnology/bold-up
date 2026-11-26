import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { AlsoRow } from "@/components/places/place-detail";
import { HomeMap } from "@/components/site/home-map";
import { SiteFooter } from "@/components/site/site-footer";
import { VenueCard } from "@/components/site/venue-card";
import { ChipLink } from "@/components/ui/chip";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { listPublicVenues } from "@/lib/data/venues";
import { GYM_CATEGORIES } from "@/lib/domain";
import { getI18n } from "@/lib/i18n/server";
import { searchVenues } from "@/lib/search";
import { DEFAULT_SEARCH_PLACE } from "@/lib/search-params";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.site.venues.metaTitle, description: t.site.venues.metaDescription };
}

export default async function VenuesPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const [params, { t, locale }, all] = await Promise.all([searchParams, getI18n(), listPublicVenues()]);
  const v = t.site.venues;
  // Clubs and street workout spots have their own listings (/clubs, /street-workout).
  const category = (GYM_CATEGORIES as readonly string[]).includes(params.type ?? "") ? (params.type as string) : null;
  const present = GYM_CATEGORIES.filter((item) => all.some((venue) => venue.category === item));
  const venues = searchVenues(all, { center: DEFAULT_SEARCH_PLACE, category, categories: GYM_CATEGORIES });

  return (
    <>
      <div className="mx-auto max-w-[1320px] px-4 py-8 md:px-8 md:py-12">
        <PageHeader title={v.title} text={v.text} />
        <div className="mt-7 h-[300px] overflow-hidden rounded-[28px] border border-line shadow-card md:h-[400px]">
          <HomeMap center={DEFAULT_SEARCH_PLACE} coaches={[]} venues={venues} />
        </div>
        <div className="no-scrollbar -mx-4 mt-7 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          <ChipLink href="/salles" active={!category}>
            {v.all}
          </ChipLink>
          {present.map((item) => (
            <ChipLink key={item} href={`/salles?type=${item}`} active={category === item} tone={item}>
              {t.common.venueCategories[item]}
            </ChipLink>
          ))}
        </div>
        {venues.length === 0 ? (
          <EmptyState className="mt-6" icon={Building2} title={v.empty} />
        ) : (
          <div className="stagger mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} t={t} locale={locale} />
            ))}
          </div>
        )}
        <p className="mt-8 text-[12.5px] text-faint">{v.osmSource}</p>
        <AlsoRow current="venues" t={t} />
      </div>
      <SiteFooter />
    </>
  );
}
