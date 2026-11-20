"use client";

import { MapView } from "@/components/map/map-view";
import type { LatLng } from "@/lib/geo";

/** Small map showing an approximate area (a disc), never a precise address. */
export function AreaMap({ center, radiusKm, fallback, className }: { center: LatLng; radiusKm: number; fallback: string; className?: string }) {
  return <MapView center={center} zoom={11.5} radiusKm={radiusKm} cooperative fallback={fallback} className={className} />;
}

/** Small map with a single pin, for a venue with a public address. */
export function PinMap({ center, title, partner, fallback, className }: { center: LatLng; title: string; partner?: boolean; fallback: string; className?: string }) {
  return (
    <MapView
      center={center}
      zoom={14.5}
      markers={[{ id: "venue", kind: "venue", lat: center.lat, lng: center.lng, label: "", title, partner }]}
      activeId="venue"
      cooperative
      fallback={fallback}
      className={className}
    />
  );
}
