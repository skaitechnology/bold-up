import type { Metadata } from "next";
import { Discovery } from "@/components/site/discovery";
import { getSessionUser } from "@/lib/auth/session";
import { getFavoriteCoachIds, listPublicCoaches, listSports } from "@/lib/data/coaches";
import { listPublicVenues } from "@/lib/data/venues";
import { localizedName } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { searchCoaches, searchVenues } from "@/lib/search";
import { parseSearchParams } from "@/lib/search-params";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const [{ t, locale }, params, sports] = await Promise.all([getI18n(), searchParams, listSports()]);
  const state = parseSearchParams(params);
  const sport = sports.find((item) => item.slug === state.sport);
  const title = sport ? `${localizedName(sport, locale)} · ${state.place.name}` : `${t.site.search.metaTitle} · ${state.place.name}`;
  return { title, description: t.site.search.metaDescription };
}

export default async function CoachesPage({ searchParams }: PageProps) {
  const [params, user, sports, allCoaches, allVenues] = await Promise.all([
    searchParams,
    getSessionUser(),
    listSports(),
    listPublicCoaches(),
    listPublicVenues(),
  ]);
  const state = parseSearchParams(params);
  const coaches = searchCoaches(allCoaches, {
    sport: state.sport,
    center: state.place,
    radiusKm: state.radiusKm,
    maxPriceCents: state.maxPrice ? state.maxPrice * 100 : null,
  });
  const venues = state.showVenues ? searchVenues(allVenues, { center: state.place, radiusKm: state.radiusKm ?? 12 }) : [];
  const favoriteIds = user ? await getFavoriteCoachIds(user.id) : [];

  return <Discovery state={state} sports={sports} coaches={coaches} venues={venues} favoriteIds={favoriteIds} signedIn={Boolean(user)} />;
}
