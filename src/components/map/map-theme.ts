import type { Map as MapLibreMap } from "maplibre-gl";

/**
 * BOLD UP's own look for the base map: soft lilac land, vivid water and parks, white
 * roads, lavender buildings. Applied at runtime on top of an OpenMapTiles style
 * (OpenFreeMap "liberty" by default), by source layer, so it survives style updates.
 * Colours here are map paint, read by WebGL: they cannot be CSS variables.
 */
const C = {
  land: "#f4f2fb",
  residential: "#efecf9",
  water: "#8fd3ff",
  waterLabel: "#1b6fb0",
  park: "#bfeeb8",
  wood: "#a9e3a6",
  grass: "#d2f4c9",
  sand: "#fdf1cf",
  pitch: "#a7e7b4",
  school: "#fff0d2",
  hospital: "#ffe3ec",
  building: "#e0d8f7",
  buildingEdge: "#cdc2f0",
  building3d: "#d3c8f5",
  road: "#ffffff",
  roadCasing: "#dcd5ee",
  major: "#ffe9a8",
  majorCasing: "#f4c95d",
  path: "#cfc6ea",
  rail: "#c4bbdf",
  boundary: "#b3a6e0",
  label: "#3a3360",
  labelMinor: "#6a6390",
  halo: "#ffffff",
} as const;

type AnyLayer = { id: string; type: string; "source-layer"?: string; paint?: Record<string, unknown> };

export function applyMapTheme(map: MapLibreMap) {
  const layers = (map.getStyle()?.layers ?? []) as AnyLayer[];
  const paint = (id: string, property: string, value: unknown) => {
    try {
      map.setPaintProperty(id, property, value);
    } catch {
      // a property this layer type does not have: leave the layer as it is
    }
  };
  const hide = (id: string) => {
    try {
      map.setLayoutProperty(id, "visibility", "none");
    } catch {
      // nothing to hide
    }
  };
  const fill = (id: string, color: string, opacity = 1) => {
    paint(id, "fill-pattern", undefined);
    paint(id, "fill-color", color);
    paint(id, "fill-opacity", opacity);
  };

  for (const layer of layers) {
    const { id, type } = layer;
    const source = layer["source-layer"] ?? "";

    if (type === "background") paint(id, "background-color", C.land);
    else if (type === "raster") hide(id);
    else if (type === "fill") {
      if (source === "water") fill(id, C.water);
      else if (source === "park") fill(id, C.park, 0.85);
      else if (source === "landcover") fill(id, /wood|forest/.test(id) ? C.wood : /sand/.test(id) ? C.sand : /ice/.test(id) ? "#ffffff" : C.grass, 0.9);
      else if (source === "landuse")
        fill(id, /pitch|track/.test(id) ? C.pitch : /school/.test(id) ? C.school : /hospital/.test(id) ? C.hospital : /cemetery/.test(id) ? C.grass : C.residential, 0.9);
      else if (source === "building") {
        fill(id, C.building);
        paint(id, "fill-outline-color", C.buildingEdge);
      } else if (source === "aeroway") fill(id, C.residential);
      else if (source === "transportation") hide(id);
    } else if (type === "fill-extrusion") {
      paint(id, "fill-extrusion-color", C.building3d);
      paint(id, "fill-extrusion-opacity", 0.82);
    } else if (type === "line") {
      if (source === "waterway") paint(id, "line-color", C.water);
      else if (source === "park") paint(id, "line-color", C.wood);
      else if (source === "boundary") paint(id, "line-color", C.boundary);
      else if (source === "aeroway") paint(id, "line-color", C.road);
      else if (source === "transportation") {
        const casing = /casing/.test(id);
        const major = /motorway|trunk|primary/.test(id);
        if (/rail|transit/.test(id)) paint(id, "line-color", C.rail);
        else if (/path|pedestrian|track|steps/.test(id) && !casing) paint(id, "line-color", C.path);
        else paint(id, "line-color", casing ? (major ? C.majorCasing : C.roadCasing) : major ? C.major : C.road);
      }
    } else if (type === "symbol") {
      // our own pins are the points of interest: the base map's icons would compete with them
      if (source === "poi" && !/transit/.test(id)) hide(id);
      else if (source === "transportation" || /shield/.test(id)) hide(id);
      else {
        const water = source === "water_name" || source === "waterway";
        const minor = source === "transportation_name" || /other|village/.test(id);
        paint(id, "text-color", water ? C.waterLabel : minor ? C.labelMinor : C.label);
        paint(id, "text-halo-color", C.halo);
        paint(id, "text-halo-width", 1.4);
      }
    }
  }
}

/** Colours of the service-area disc drawn around a coach's town. */
export const AREA_COLOR = "#6c3bff";
