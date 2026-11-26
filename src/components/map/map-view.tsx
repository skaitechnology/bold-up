"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { clsx } from "clsx";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { EventIcon, PlaceIcon } from "@/components/brand/kind-icon";
import { SportIcon } from "@/components/brand/sport-icon";
import { MAP_STYLE_URL } from "@/lib/env";
import { initials } from "@/lib/format";
import { distanceKm, type LatLng } from "@/lib/geo";
import { applyMapTheme, AREA_COLOR } from "./map-theme";

export type MapMarkerKind = "coach" | "venue" | "club" | "street_workout" | "event";

export type MapMarker = {
  id: string;
  kind: MapMarkerKind;
  lat: number;
  lng: number;
  /** Short text under the pin: a price for coaches, a date for events. */
  label: string;
  title: string;
  partner?: boolean;
  /** Colour key (sport slug, venue category, event kind). Defaults to the kind. */
  tone?: string;
  /** Coach portrait. Without one, the pin shows initials. */
  photo?: string | null;
  /** Icon key: a sport icon for coaches, a venue category, an event kind. */
  icon?: string;
};

type Padding = { top: number; bottom: number; left: number; right: number };

/** What a parent can ask the map to do (its own buttons, placed where it likes). */
export type MapApi = { zoomBy: (delta: number) => void; fitAll: () => void };

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
  /** When framing, leave out markers farther than this from the center (a far-away one would shrink everything). */
  fitRadiusKm?: number;
  /** Bump to fly back to `center`. */
  recenterSignal?: number;
  /** Page-friendly gestures: two fingers / ctrl to zoom, so the page keeps scrolling. */
  cooperative?: boolean;
  /**
   * Groups pins that would overlap into a counted bubble that splits as you zoom in.
   * "places" leaves coaches out of it: every coach of a result list keeps their own pin.
   */
  cluster?: boolean | "places";
  /** MapLibre's own zoom buttons (top right). Turn off when the parent draws its own. */
  controls?: boolean;
  /** Filled with the map's actions once it is ready. */
  apiRef?: { current: MapApi | null };
  /** Flies to a pin when it is tapped. */
  focusOnSelect?: boolean;
  /** Flies to this marker. Change `nonce` to fly again to the same one. */
  focus?: { id: string; nonce: number } | null;
  /** Tilts the camera and raises the buildings. */
  pitched?: boolean;
  /** Room taken by overlays (search bar, preview card), kept clear when framing. */
  padding?: Partial<Padding>;
  /** Accessible name of a cluster bubble. */
  clusterLabel?: (count: number) => string;
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

// ---------------------------------------------------------------- clustering

/** What is drawn at one spot: a single pin, or a bubble standing for several. */
type Node = { id: string; lat: number; lng: number; items: MapMarker[]; element: HTMLDivElement };

const CLUSTER_RADIUS_PX = 46;
/** From this zoom on every pin is shown on its own. */
const CLUSTER_MAX_ZOOM = 15.2;
const KIND_ORDER: MapMarkerKind[] = ["coach", "event", "club", "street_workout", "venue"];

/**
 * Greedy screen-space clustering: pins closer than a thumb's width merge into one bubble.
 * People and places never merge with each other, so portraits stay visible, and the
 * selected pin always stands alone.
 */
function groupMarkers(map: MapLibreMap, markers: MapMarker[], activeId: string | null | undefined, enabled: boolean | "places") {
  const groups: { lat: number; lng: number; items: MapMarker[] }[] = [];
  const single = (marker: MapMarker) => groups.push({ lat: marker.lat, lng: marker.lng, items: [marker] });
  if (!enabled || map.getZoom() >= CLUSTER_MAX_ZOOM) {
    markers.forEach(single);
    return groups;
  }
  const points = markers.map((marker) => ({ marker, point: map.project([marker.lng, marker.lat]) }));
  const used = new Set<number>();
  points.forEach((anchor, i) => {
    if (used.has(i)) return;
    used.add(i);
    const people = anchor.marker.kind === "coach";
    if (anchor.marker.id === activeId || (people && enabled === "places")) return single(anchor.marker);
    const items = [anchor.marker];
    for (let j = i + 1; j < points.length; j++) {
      const other = points[j]!;
      if (used.has(j) || other.marker.id === activeId || (other.marker.kind === "coach") !== people) continue;
      const dx = anchor.point.x - other.point.x;
      const dy = anchor.point.y - other.point.y;
      if (dx * dx + dy * dy < CLUSTER_RADIUS_PX * CLUSTER_RADIUS_PX) {
        items.push(other.marker);
        used.add(j);
      }
    }
    if (items.length === 1) return single(anchor.marker);
    groups.push({
      lat: items.reduce((sum, item) => sum + item.lat, 0) / items.length,
      lng: items.reduce((sum, item) => sum + item.lng, 0) / items.length,
      items,
    });
  });
  return groups;
}

/** Everything about a marker that changes how it is drawn. */
const markerSignature = (marker: MapMarker) =>
  `${marker.id}@${marker.lat},${marker.lng}:${marker.kind}:${marker.label}:${marker.tone ?? ""}:${marker.icon ?? ""}:${marker.photo ?? ""}:${marker.partner ? 1 : 0}:${marker.title}`;
const nodeSignature = (node: Node) => `${node.id}@${node.lat},${node.lng}>${node.items.map(markerSignature).join("+")}`;
const NO_MARKERS: MapMarker[] = [];

const nodeId = (items: MapMarker[]) =>
  items.length === 1
    ? items[0]!.id
    : `cluster:${items
        .map((item) => item.id)
        .sort()
        .join("|")}`;

// ---------------------------------------------------------------- pins

function Pin({ item, active, onClick }: { item: MapMarker; active: boolean; onClick: () => void }) {
  const fallbackKey = item.kind === "venue" ? "gym" : item.kind;
  return (
    <button
      type="button"
      className="bu-pin"
      data-kind={item.kind}
      data-tone={item.tone ?? fallbackKey}
      data-active={active ? "true" : "false"}
      data-partner={item.partner ? "true" : undefined}
      data-testid={`pin-${item.kind}`}
      aria-label={item.title}
      aria-pressed={active}
      title={item.title}
      onClick={onClick}
    >
      <span className="bu-pin-body">
        {item.kind === "coach" ? (
          <>
            <span className="bu-pin-avatar">
              {item.photo ? <img src={item.photo} alt="" draggable={false} /> : <span className="bu-pin-initials">{initials(item.title)}</span>}
              {item.icon ? (
                <span className="bu-pin-badge">
                  <SportIcon icon={item.icon} size={12} />
                </span>
              ) : null}
            </span>
            {item.label ? <span className="bu-pin-label">{item.label}</span> : null}
          </>
        ) : item.kind === "event" ? (
          <>
            <span className="bu-pin-tile">
              <EventIcon kind={item.icon ?? "local"} size={20} />
            </span>
            {item.label ? <span className="bu-pin-label">{item.label}</span> : null}
          </>
        ) : (
          <span className="bu-pin-tile">
            <PlaceIcon category={item.icon ?? fallbackKey} size={item.kind === "venue" ? 15 : 19} />
          </span>
        )}
      </span>
    </button>
  );
}

/** The ring of a bubble shows what it holds: one slice per kind of pin. */
function clusterRing(items: MapMarker[]): string {
  const slices: string[] = [];
  let from = 0;
  for (const kind of KIND_ORDER) {
    const share = (items.filter((item) => item.kind === kind).length / items.length) * 100;
    if (share === 0) continue;
    slices.push(`var(--kind-${kind}) ${from}% ${from + share}%`);
    from += share;
  }
  return `conic-gradient(${slices.join(", ")})`;
}

function Cluster({ items, label, onClick }: { items: MapMarker[]; label: string; onClick: () => void }) {
  const style = { "--size": `${Math.min(68, 42 + items.length * 2)}px`, "--ring": clusterRing(items) } as CSSProperties;
  return (
    <button type="button" className="bu-cluster" style={style} aria-label={label} title={label} data-testid="pin-cluster" onClick={onClick}>
      <span>{items.length}</span>
    </button>
  );
}

// ---------------------------------------------------------------- map

/**
 * The live map (MapLibre GL + OpenStreetMap data served by OpenFreeMap), in Bold Up's own
 * colours. Pins are real DOM elements rendered by React: coach portraits, one shape and
 * colour per kind of place, bubbles that split as you zoom in.
 */
export function MapView({
  center,
  zoom = 12.5,
  markers = NO_MARKERS,
  activeId,
  onSelect,
  me,
  radiusKm,
  fitKey,
  fitRadiusKm,
  recenterSignal,
  cooperative,
  cluster = true,
  controls = true,
  apiRef,
  focusOnSelect,
  focus,
  pitched,
  padding,
  clusterLabel,
  fallback,
  className,
}: Props) {
  const { lat: centerLat, lng: centerLng } = center;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const libRef = useRef<typeof import("maplibre-gl") | null>(null);
  const pinsRef = useRef(new Map<string, { marker: Marker; element: HTMLDivElement }>());
  const meRef = useRef<Marker | null>(null);
  const live = useRef({ onSelect, markers, activeId, cluster, padding });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [nodes, setNodes] = useState<Node[]>([]);

  useEffect(() => {
    live.current = { onSelect, markers, activeId, cluster, padding };
  });

  const framePadding = useCallback((): Padding => {
    const extra = live.current.padding ?? {};
    return { top: 70 + (extra.top ?? 0), bottom: 70 + (extra.bottom ?? 0), left: 60 + (extra.left ?? 0), right: 60 + (extra.right ?? 0) };
  }, []);

  /** Works out which pins and bubbles to draw at the current zoom, and places them. */
  const layout = useCallback(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib) return;
    const store = pinsRef.current;
    const next: Node[] = groupMarkers(map, live.current.markers, live.current.activeId, live.current.cluster).map((group) => {
      const id = nodeId(group.items);
      let entry = store.get(id);
      if (!entry) {
        const element = document.createElement("div");
        const first = group.items[0]!;
        // a coach or event pin has a label under it: anchor on the picture, not on the whole block
        const offset: [number, number] | undefined = group.items.length > 1 ? undefined : first.kind === "coach" ? [0, -29] : first.kind === "event" ? [0, -23] : undefined;
        const marker = new lib.Marker({ element, anchor: offset ? "top" : "center", offset }).setLngLat([group.lng, group.lat]).addTo(map);
        entry = { marker, element };
        store.set(id, entry);
      } else {
        entry.marker.setLngLat([group.lng, group.lat]);
      }
      return { id, lat: group.lat, lng: group.lng, items: group.items, element: entry.element };
    });
    // Same pins at the same spots: keep the current ones, so nothing re-renders (or loops).
    setNodes((current) => (current.length === next.length && current.every((node, index) => nodeSignature(node) === nodeSignature(next[index]!)) ? current : next));
  }, []);

  // ---- create the map once
  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    const store = pinsRef.current;

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
          maxZoom: 18,
          attributionControl: { compact: true },
          cooperativeGestures: cooperative,
          dragRotate: false,
          pitchWithRotate: false,
        });
        map.touchZoomRotate.disableRotation();
        if (controls) map.addControl(new lib.NavigationControl({ showCompass: false }), "top-right");
        map.on("load", () => {
          if (cancelled) return;
          applyMapTheme(map);
          setReady(true);
        });
        // pins regroup while zooming; panning never changes which pins overlap
        map.on("zoom", () => {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(layout);
        });
        map.on("click", (event) => {
          const target = event.originalEvent?.target;
          if (target instanceof Element && target.closest(".maplibregl-marker")) return;
          live.current.onSelect?.(null);
        });
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
      cancelAnimationFrame(frame);
      store.forEach(({ marker }) => marker.remove());
      store.clear();
      meRef.current?.remove();
      meRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // The map is created once; later prop changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- pins: lay out again whenever what is drawn changes. Compared by content, not by
  // array identity: parents often build the list inline, a new array on every render.
  const markersKey = markers.map(markerSignature).join("|");
  useEffect(() => {
    if (ready) layout();
  }, [markersKey, activeId, cluster, ready, layout]);

  // ---- take away the pins that are no longer drawn (after React has left them)
  useEffect(() => {
    const wanted = new Set(nodes.map((node) => node.id));
    for (const [id, entry] of pinsRef.current) {
      if (!wanted.has(id)) {
        entry.marker.remove();
        pinsRef.current.delete(id);
      }
    }
  }, [nodes]);

  const flyTo = useCallback((target: LatLng, minZoom = 13.6) => {
    const map = mapRef.current;
    if (!map) return;
    const extra = live.current.padding ?? {};
    map.flyTo({
      center: [target.lng, target.lat],
      zoom: Math.max(map.getZoom(), minZoom),
      offset: [((extra.left ?? 0) - (extra.right ?? 0)) / 2, ((extra.top ?? 0) - (extra.bottom ?? 0)) / 2],
      duration: 900,
      curve: 1.35,
      essential: true,
    });
  }, []);

  const selectPin = (item: MapMarker) => {
    onSelect?.(item.id);
    if (focusOnSelect) flyTo(item);
  };

  /** A bubble opens up: the camera moves in until its pins come apart. */
  const openCluster = (items: MapMarker[]) => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib) return;
    const first = items[0]!;
    const bounds = new lib.LngLatBounds([first.lng, first.lat], [first.lng, first.lat]);
    for (const item of items) bounds.extend([item.lng, item.lat]);
    map.fitBounds(bounds, { padding: framePadding(), maxZoom: Math.min(16.5, Math.max(CLUSTER_MAX_ZOOM + 0.3, map.getZoom() + 2.5)), duration: 750 });
  };

  // ---- actions offered to the parent
  useEffect(() => {
    if (!apiRef || !ready) return;
    apiRef.current = {
      zoomBy: (delta) => mapRef.current?.easeTo({ zoom: mapRef.current.getZoom() + delta, duration: 350 }),
      fitAll: () => {
        const map = mapRef.current;
        const lib = libRef.current;
        const all = live.current.markers;
        if (!map || !lib || all.length === 0) return;
        const bounds = new lib.LngLatBounds([all[0]!.lng, all[0]!.lat], [all[0]!.lng, all[0]!.lat]);
        for (const marker of all) bounds.extend([marker.lng, marker.lat]);
        map.fitBounds(bounds, { padding: framePadding(), maxZoom: 14.5, duration: 800 });
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, ready, framePadding]);

  // ---- fly to a marker chosen outside the map (a card in a list)
  const focusId = focus?.id;
  const focusNonce = focus?.nonce;
  useEffect(() => {
    if (!ready || !focusId) return;
    const target = live.current.markers.find((marker) => marker.id === focusId);
    if (target) flyTo(target);
  }, [focusId, focusNonce, ready, flyTo]);

  // ---- tilt
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || pitched === undefined) return;
    map.easeTo({ pitch: pitched ? 56 : 0, bearing: pitched ? -14 : 0, zoom: pitched ? Math.max(map.getZoom(), 14.4) : map.getZoom(), duration: 900 });
  }, [pitched, ready]);

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
    map.addLayer({ id: `${sourceId}-fill`, type: "fill", source: sourceId, paint: { "fill-color": AREA_COLOR, "fill-opacity": 0.12 } });
    map.addLayer({
      id: `${sourceId}-line`,
      type: "line",
      source: sourceId,
      paint: { "line-color": AREA_COLOR, "line-opacity": 0.7, "line-width": 2, "line-dasharray": [2, 2] },
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
    const near = fitRadiusKm ? markers.filter((marker) => distanceKm(center, marker) <= fitRadiusKm) : markers;
    const bounds = new lib.LngLatBounds([center.lng, center.lat], [center.lng, center.lat]);
    for (const marker of near.length ? near : markers) bounds.extend([marker.lng, marker.lat]);
    map.fitBounds(bounds, { padding: framePadding(), maxZoom: 14, duration: 700 });
    // Only re-frame when the search itself changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, ready]);

  // ---- explicit recenter
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !recenterSignal) return;
    map.flyTo({ center: [center.lng, center.lat], zoom: Math.max(map.getZoom(), zoom), duration: 800, curve: 1.3, essential: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterSignal]);

  return (
    <div className={clsx("relative overflow-hidden bg-sand2", className)} data-testid="map" data-ready={ready ? "true" : "false"}>
      {/* MapLibre sets position:relative on its container, so it is sized with h/w rather than inset. */}
      <div ref={containerRef} className="h-full w-full" />
      {nodes.map((node) =>
        createPortal(
          node.items.length === 1 ? (
            <Pin item={node.items[0]!} active={node.items[0]!.id === activeId} onClick={() => selectPin(node.items[0]!)} />
          ) : (
            <Cluster items={node.items} label={clusterLabel ? clusterLabel(node.items.length) : String(node.items.length)} onClick={() => openCluster(node.items)} />
          ),
          node.element,
          node.id,
        ),
      )}
      {!ready && !failed ? <div className="skeleton absolute inset-0 !rounded-none" aria-hidden /> : null}
      {failed ? (
        <div className="absolute inset-0 flex items-center justify-center bg-sand px-6 text-center text-[14px] text-muted">{fallback}</div>
      ) : null}
    </div>
  );
}
