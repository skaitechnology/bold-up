// Geography helpers. Coordinates are WGS84 (lat, lng in degrees).

export type LatLng = { lat: number; lng: number };

export type Place = {
  name: string;
  postcode: string;
  /** French département code, e.g. "94" */
  dep: string;
  lat: number;
  lng: number;
};

/** Launch area. Town centroids come from the French national address base (BAN). */
export const COMMUNES: readonly Place[] = [
  { name: "Créteil", postcode: "94000", dep: "94", lat: 48.78451, lng: 2.45298 },
  { name: "Maisons-Alfort", postcode: "94700", dep: "94", lat: 48.80168, lng: 2.44032 },
  { name: "Saint-Maur-des-Fossés", postcode: "94100", dep: "94", lat: 48.79994, lng: 2.4918 },
  { name: "Alfortville", postcode: "94140", dep: "94", lat: 48.79718, lng: 2.42152 },
  { name: "Bonneuil-sur-Marne", postcode: "94380", dep: "94", lat: 48.7734, lng: 2.48964 },
  { name: "Choisy-le-Roi", postcode: "94600", dep: "94", lat: 48.76411, lng: 2.41281 },
  { name: "Vitry-sur-Seine", postcode: "94400", dep: "94", lat: 48.78946, lng: 2.39568 },
  { name: "Joinville-le-Pont", postcode: "94340", dep: "94", lat: 48.82033, lng: 2.47193 },
  { name: "Champigny-sur-Marne", postcode: "94500", dep: "94", lat: 48.81721, lng: 2.52127 },
  { name: "Valenton", postcode: "94460", dep: "94", lat: 48.74932, lng: 2.45916 },
  { name: "Limeil-Brévannes", postcode: "94450", dep: "94", lat: 48.74791, lng: 2.49242 },
  { name: "Sucy-en-Brie", postcode: "94370", dep: "94", lat: 48.77067, lng: 2.5284 },
  { name: "Charenton-le-Pont", postcode: "94220", dep: "94", lat: 48.82395, lng: 2.40713 },
  { name: "Saint-Maurice", postcode: "94410", dep: "94", lat: 48.81794, lng: 2.44166 },
  { name: "Ivry-sur-Seine", postcode: "94200", dep: "94", lat: 48.81275, lng: 2.38643 },
  { name: "Vincennes", postcode: "94300", dep: "94", lat: 48.84728, lng: 2.43778 },
  { name: "Nogent-sur-Marne", postcode: "94130", dep: "94", lat: 48.83747, lng: 2.48091 },
  { name: "Villeneuve-Saint-Georges", postcode: "94190", dep: "94", lat: 48.73878, lng: 2.4497 },
  { name: "Thiais", postcode: "94320", dep: "94", lat: 48.76047, lng: 2.38699 },
  { name: "Boissy-Saint-Léger", postcode: "94470", dep: "94", lat: 48.75128, lng: 2.52001 },
  { name: "Fontenay-sous-Bois", postcode: "94120", dep: "94", lat: 48.85003, lng: 2.47351 },
  { name: "Le Perreux-sur-Marne", postcode: "94170", dep: "94", lat: 48.8435, lng: 2.50442 },
  { name: "Saint-Mandé", postcode: "94160", dep: "94", lat: 48.84153, lng: 2.41944 },
  { name: "Villejuif", postcode: "94800", dep: "94", lat: 48.79347, lng: 2.361 },
  { name: "Orly", postcode: "94310", dep: "94", lat: 48.74229, lng: 2.39525 },
  { name: "Chennevières-sur-Marne", postcode: "94430", dep: "94", lat: 48.7949, lng: 2.5415 },
  { name: "Ormesson-sur-Marne", postcode: "94490", dep: "94", lat: 48.78814, lng: 2.5342 },
  { name: "Villiers-sur-Marne", postcode: "94350", dep: "94", lat: 48.82784, lng: 2.5492 },
  { name: "Le Kremlin-Bicêtre", postcode: "94270", dep: "94", lat: 48.80818, lng: 2.35582 },
  { name: "Cachan", postcode: "94230", dep: "94", lat: 48.79135, lng: 2.33152 },
  { name: "L'Haÿ-les-Roses", postcode: "94240", dep: "94", lat: 48.77685, lng: 2.34199 },
  { name: "Montreuil", postcode: "93100", dep: "93", lat: 48.86373, lng: 2.44936 },
  { name: "Paris", postcode: "75001", dep: "75", lat: 48.859, lng: 2.347 },
];

export const DEFAULT_PLACE: Place = COMMUNES[0]!;

/** Great-circle distance in kilometres (haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371.0088;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Instant, offline suggestions from the launch-area list (name or postcode prefix). */
export function searchCommunes(query: string, limit = 6): Place[] {
  const q = normalize(query);
  if (!q) return COMMUNES.slice(0, limit);
  const starts: Place[] = [];
  const contains: Place[] = [];
  for (const place of COMMUNES) {
    const name = normalize(place.name);
    if (name.startsWith(q) || place.postcode.startsWith(q)) starts.push(place);
    else if (name.includes(q)) contains.push(place);
  }
  return [...starts, ...contains].slice(0, limit);
}

export function findCommune(name: string | null | undefined): Place | undefined {
  if (!name) return undefined;
  const q = normalize(name);
  return COMMUNES.find((place) => normalize(place.name) === q);
}

/**
 * Moves a point by a small pseudo-random offset (up to `maxMeters`), stable for a given seed.
 * Used so a coach is shown around their town, never at a precise address.
 */
export function jitter(point: LatLng, seed: string, maxMeters = 700): LatLng {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const angle = ((h >>> 0) % 3600) / 3600 * 2 * Math.PI;
  const radius = (0.35 + (((h >>> 12) % 1000) / 1000) * 0.65) * maxMeters;
  const dLat = (radius * Math.cos(angle)) / 111_320;
  const dLng = (radius * Math.sin(angle)) / (111_320 * Math.cos((point.lat * Math.PI) / 180));
  return { lat: +(point.lat + dLat).toFixed(5), lng: +(point.lng + dLng).toFixed(5) };
}
