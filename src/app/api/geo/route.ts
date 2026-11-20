import { NextResponse, type NextRequest } from "next/server";
import { searchCommunes } from "@/lib/geo";

export type GeoResult = { label: string; name: string; postcode: string; context: string; lat: number; lng: number };

type BanFeature = {
  geometry: { coordinates: [number, number] };
  properties: { label: string; name: string; city?: string; postcode?: string; context?: string; type: string };
};

const local = (query: string): GeoResult[] =>
  searchCommunes(query).map((place) => ({
    label: `${place.name} (${place.postcode})`,
    name: place.name,
    postcode: place.postcode,
    context: place.dep,
    lat: place.lat,
    lng: place.lng,
  }));

/**
 * Place search for France, backed by the national address base (Géoplateforme / BAN):
 * open data, no key. `type=address` searches full addresses (used by the venue editor),
 * the default searches towns. Falls back to the built-in launch-area list if the
 * service is unreachable, so search keeps working.
 */
export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 120);
  const wantsAddress = request.nextUrl.searchParams.get("type") === "address";
  if (query.length < 2) return NextResponse.json({ results: local(query) });

  const url = new URL("https://data.geopf.fr/geocodage/search");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "6");
  url.searchParams.set("autocomplete", "1");
  if (!wantsAddress) url.searchParams.set("type", "municipality");

  try {
    const response = await fetch(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(3500) });
    if (!response.ok) throw new Error(`geocoder ${response.status}`);
    const body = (await response.json()) as { features?: BanFeature[] };
    const results: GeoResult[] = (body.features ?? []).map((feature) => ({
      label: wantsAddress ? feature.properties.label : `${feature.properties.city ?? feature.properties.name} (${feature.properties.postcode ?? ""})`,
      name: feature.properties.city ?? feature.properties.name,
      postcode: feature.properties.postcode ?? "",
      context: feature.properties.context ?? "",
      lat: feature.geometry.coordinates[1],
      lng: feature.geometry.coordinates[0],
    }));
    return NextResponse.json({ results: results.length ? results : wantsAddress ? [] : local(query) });
  } catch {
    return NextResponse.json({ results: wantsAddress ? [] : local(query) });
  }
}
