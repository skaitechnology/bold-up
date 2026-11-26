"use client";

import { MapView, type MapMarkerKind } from "@/components/map/map-view";
import type { LatLng } from "@/lib/geo";

/** Small map showing an approximate area (a disc), never a precise address. */
export function AreaMap({ center, radiusKm, fallback, className }: { center: LatLng; radiusKm: number; fallback: string; className?: string }) {
  return <MapView center={center} zoom={11.5} radiusKm={radiusKm} cooperative fallback={fallback} className={className} />;
}

/** Small map with a single pin, for a place or an event with a public location. */
export function PinMap({
  center,
  title,
  partner,
  kind = "venue",
  tone,
  fallback,
  className,
}: {
  center: LatLng;
  title: string;
  partner?: boolean;
  /** What the pin stands for: decides its shape and icon. */
  kind?: Exclude<MapMarkerKind, "coach">;
  /** Colour key (a venue category or an event kind). Defaults to the kind. */
  tone?: string;
  fallback: string;
  className?: string;
}) {
  const key = tone ?? (kind === "venue" ? "gym" : kind);
  return (
    <MapView
      center={center}
      zoom={14.5}
      markers={[{ id: "pin", kind, lat: center.lat, lng: center.lng, label: "", title, partner, tone: key, icon: key }]}
      activeId="pin"
      cooperative
      fallback={fallback}
      className={className}
    />
  );
}
