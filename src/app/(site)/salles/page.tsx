import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { Building2 } from "lucide-react";
import { HomeMap } from "@/components/site/home-map";
import { SiteFooter } from "@/components/site/site-footer";
import { VenueCard } from "@/components/site/venue-card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { listPublicVenues } from "@/lib/data/venues";
import { VENUE_CATEGORIES } from "@/lib/domain";
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
  const category = (VENUE_CATEGORIES as readonly string[]).includes(params.type ?? "") ? (params.type as string) : null;
  const present = VENUE_CATEGORIES.filter((item) => all.some((venue) => venue.category === item));
  const venues = searchVenues(all, { center: DEFAULT_SEARCH_PLACE, category });
  const chip = (active: boolean) =>
    clsx("press inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-[13.5px] font-medium", active ? "border-ink bg-ink text-paper" : "border-line2 bg-paper text-ink2 hover:border-ink");

  return (
    <>
      <div className="mx-auto max-w-[1320px] px-4 py-8 md:px-8 md:py-12">
        <PageHeader title={v.title} text={v.text} />
        <div className="mt-7 h-[300px] overflow-hidden rounded-[28px] border border-line md:h-[400px]">
          <HomeMap center={DEFAULT_SEARCH_PLACE} coaches={[]} venues={venues} />
        </div>
        <div className="no-scrollbar -mx-4 mt-7 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          <Link href="/salles" className={chip(!category)}>
            {v.all}
          </Link>
          {present.map((item) => (
            <Link key={item} href={`/salles?type=${item}`} className={chip(category === item)}>
              {t.common.venueCategories[item]}
            </Link>
          ))}
        </div>
        {venues.length === 0 ? (
          <EmptyState className="mt-6" icon={Building2} title={v.empty} />
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} t={t} locale={locale} />
            ))}
          </div>
        )}
        <p className="mt-8 text-[12.5px] text-faint">{v.osmSource}</p>
      </div>
      <SiteFooter />
    </>
  );
}
