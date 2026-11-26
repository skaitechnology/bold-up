import type { Metadata } from "next";
import { ExploreMap } from "@/components/explore/explore-map";
import { listPublicCoaches, listSports } from "@/lib/data/coaches";
import { listPublicEvents } from "@/lib/data/events";
import { listPublicVenues } from "@/lib/data/venues";
import { parseLayer } from "@/lib/explore";
import { parisDateKey } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { parsePlace } from "@/lib/search-params";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.explore.metaTitle, description: t.explore.metaDescription };
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** The live map: every coach, club, street workout spot, gym and event of the area. */
export default async function MapPage({ searchParams }: PageProps) {
  const [params, coaches, venues, events, sports] = await Promise.all([searchParams, listPublicCoaches(), listPublicVenues(), listPublicEvents(), listSports()]);
  const layer = parseLayer(first(params.couche));
  const sport = first(params.sport)?.match(/^[a-z0-9-]{2,40}$/)?.[0] ?? null;
  const activeId = first(params.id)?.match(/^[0-9a-f-]{36}$/)?.[0] ?? null;

  return (
    <ExploreMap
      coaches={coaches}
      venues={venues}
      events={events}
      sports={sports.map(({ id, slug, name_fr, name_en, icon }) => ({ id, slug, name_fr, name_en, icon }))}
      today={parisDateKey(new Date())}
      initial={{ layer, sport: sport && sports.some((item) => item.slug === sport) ? sport : null, place: parsePlace(params), activeId }}
    />
  );
}
