"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { clsx } from "clsx";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { MAP_STYLE_URL } from "@/lib/env";
import type { LatLng } from "@/lib/geo";

export type MapMarker = {
  id: string;
  kind: "coach" | "venue";
  lat: number;
  lng: number;
  /** Text inside the pin (a price for coaches). Venues show a dot. */
  label: string;
  title: string;
  partner?: boolean;
};

type Props = {
  center: LatLng;
  zoom?: number;
  markers?: MapMarker[];
  activeId?: string | null;
  onSelect?: (id: string | null) => void;
  /** The visitor's own position, shown as a dot (only ever rendered locally). */
  me?: LatLng | null;
  /** Draws a soft disc around the center, e.g. a coach's approximate service area. */
  radiusKm?: number | null;
  /** Changing this value re-frames the map around the markers. */
  fitKey?: string;
  /** Bump to fly back to `center`. */
  recenterSignal?: number;
  /** Page-friendly gestures: two fingers / ctrl to zoom, so the page keeps scrolling. */
  cooperative?: boolean;
  fallback: string;
  className?: string;
};

function circlePolygon(center: LatLng, radiusKm: number, steps = 72) {
  const coordinates: [number, number][] = [];
  const latRad = (center.lat * Math.PI) / 180;
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dLat = (radiusKm / 110.574) * Math.cos(angle);
    const dLng = (radiusKm / (111.32 * Math.cos(latRad))) * Math.sin(angle);
    coordinates.push([center.lng + dLng, center.lat + dLat]);
  }
  return { type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [coordinates] } };
}

/**
 * Real interactive map (MapLibre GL + OpenStreetMap data served by OpenFreeMap).
 * Pins are DOM elements so they stay sharp, accessible and easy to restyle.
 */
export function MapView({
  center,
  zoom = 12.5,
  markers = [],
  activeId,
  onSelect,
  me,
  radiusKm,
  fitKey,
  recenterSignal,
  cooperative,
  fallback,
  className,
}: Props) {
  const { lat: centerLat, lng: centerLng } = center;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const libRef = useRef<typeof import("maplibre-gl") | null>(null);
  const markerRefs = useRef(new Map<string, { marker: Marker; element: HTMLButtonElement }>());
  const meRef = useRef<Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // ---- create the map once
  useEffect(() => {
    let cancelled = false;
    const markersStore = markerRefs.current;

    (async () => {
      try {
        const lib = await import("maplibre-gl");
        if (cancelled || !containerRef.current) return;
        libRef.current = lib;
        const map = new lib.Map({
          container: containerRef.current,
          style: MAP_STYLE_URL,
          center: [center.lng, center.lat],
          zoom,
          minZoom: 8,
          maxZoom: 17,
          attributionControl: { compact: true },
          cooperativeGestures: cooperative,
          dragRotate: false,
          pitchWithRotate: false,
        });
        map.touchZoomRotate.disableRotation();
        map.addControl(new lib.NavigationControl({ showCompass: false }), "top-right");
        map.on("load", () => {
          if (cancelled) return;
          setReady(true);
        });
        map.on("click", () => onSelectRef.current?.(null));
        map.on("error", (event) => {
          // A style that cannot be fetched leaves an empty canvas: show the fallback instead.
          if (!map.isStyleLoaded() && /style|fetch|network/i.test(String(event.error?.message ?? ""))) setFailed(true);
        });
        mapRef.current = map;
      } catch {
        setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      markersStore.forEach(({ marker }) => marker.remove());
      markersStore.clear();
      meRef.current?.remove();
      meRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // The map is created once; later prop changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- pins
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!ready || !map || !lib) return;
    const store = markerRefs.current;
    const wanted = new Set(markers.map((marker) => marker.id));

    for (const [id, entry] of store) {
      if (!wanted.has(id)) {
        entry.marker.remove();
        store.delete(id);
      }
    }
    for (const item of markers) {
      const existing = store.get(item.id);
      if (existing) {
        existing.marker.setLngLat([item.lng, item.lat]);
        if (item.kind === "coach") existing.element.textContent = item.label;
        continue;
      }
      const element = document.createElement("button");
      element.type = "button";
      element.className = "bu-pin";
      element.dataset.kind = item.kind;
      element.dataset.testid = `pin-${item.kind}`;
      if (item.partner) element.dataset.partner = "true";
      element.setAttribute("aria-label", item.title);
      element.title = item.title;
      if (item.kind === "coach") element.textContent = item.label;
      else element.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="6"/></svg>';
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelectRef.current?.(item.id);
      });
      const marker = new lib.Marker({ element, anchor: "center" }).setLngLat([item.lng, item.lat]).addTo(map);
      store.set(item.id, { marker, element });
    }
  }, [markers, ready]);

  // ---- active pin
  useEffect(() => {
    for (const [id, entry] of markerRefs.current) {
      const active = id === activeId;
      entry.element.setAttribute("data-active", active ? "true" : "false");
      entry.element.style.setProperty("z-index", active ? "6" : "");
    }
  }, [activeId, markers, ready]);

  // ---- visitor position
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!ready || !map || !lib) return;
    meRef.current?.remove();
    meRef.current = null;
    if (me) {
      const element = document.createElement("div");
      element.className = "bu-pin-me";
      meRef.current = new lib.Marker({ element }).setLngLat([me.lng, me.lat]).addTo(map);
    }
  }, [me, ready]);

  // ---- service-area disc
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const sourceId = "bu-radius";
    if (map.getLayer(`${sourceId}-fill`)) map.removeLayer(`${sourceId}-fill`);
    if (map.getLayer(`${sourceId}-line`)) map.removeLayer(`${sourceId}-line`);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
    if (!radiusKm) return;
    const center = { lat: centerLat, lng: centerLng };
    map.addSource(sourceId, { type: "geojson", data: circlePolygon(center, radiusKm) });
    map.addLayer({ id: `${sourceId}-fill`, type: "fill", source: sourceId, paint: { "fill-color": "#111111", "fill-opacity": 0.07 } });
    map.addLayer({
      id: `${sourceId}-line`,
      type: "line",
      source: sourceId,
      paint: { "line-color": "#111111", "line-opacity": 0.35, "line-width": 1.5, "line-dasharray": [2, 2] },
    });
    const latPad = radiusKm / 110.574;
    const lngPad = radiusKm / (111.32 * Math.cos((center.lat * Math.PI) / 180));
    map.fitBounds(
      [
        [center.lng - lngPad, center.lat - latPad],
        [center.lng + lngPad, center.lat + latPad],
      ],
      { padding: 28, duration: 0 },
    );
  }, [radiusKm, centerLat, centerLng, ready]);

  // ---- frame the results
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!ready || !map || !lib || fitKey === undefined) return;
    if (markers.length === 0) {
      map.easeTo({ center: [center.lng, center.lat], zoom, duration: 500 });
      return;
    }
    const bounds = new lib.LngLatBounds([center.lng, center.lat], [center.lng, center.lat]);
    for (const marker of markers) bounds.extend([marker.lng, marker.lat]);
    map.fitBounds(bounds, { padding: { top: 70, bottom: 70, left: 60, right: 60 }, maxZoom: 14, duration: 600 });
    // Only re-frame when the search itself changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, ready]);

  // ---- explicit recenter
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !recenterSignal) return;
    map.easeTo({ center: [center.lng, center.lat], zoom: Math.max(map.getZoom(), zoom), duration: 600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterSignal]);

  return (
    <div className={clsx("relative overflow-hidden bg-sand2", className)} data-testid="map" data-ready={ready ? "true" : "false"}>
      {/* MapLibre sets position:relative on its container, so it is sized with h/w rather than inset. */}
      <div ref={containerRef} className="h-full w-full" />
      {!ready && !failed ? <div className="skeleton absolute inset-0 !rounded-none" aria-hidden /> : null}
      {failed ? (
        <div className="absolute inset-0 flex items-center justify-center bg-sand px-6 text-center text-[14px] text-muted">{fallback}</div>
      ) : null}
    </div>
  );
}
