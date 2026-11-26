// Vocabulary of the live map, shared by the server page (which reads the URL) and the
// client component (which writes it back).

export const EXPLORE_LAYERS = ["all", "coaches", "clubs", "spots", "events", "venues"] as const;
export type ExploreLayer = (typeof EXPLORE_LAYERS)[number];

/** French URL value of each layer (`/carte?couche=…`). */
export const LAYER_PARAM: Record<Exclude<ExploreLayer, "all">, string> = {
  coaches: "coachs",
  clubs: "clubs",
  spots: "street-workout",
  events: "evenements",
  venues: "salles",
};

export function parseLayer(value: string | undefined): ExploreLayer {
  return EXPLORE_LAYERS.find((key) => key !== "all" && LAYER_PARAM[key] === value) ?? "all";
}

/** Link to the map with a layer, a discipline or a pin preselected. */
export function mapHref(options: { layer?: ExploreLayer; sport?: string | null; id?: string } = {}): string {
  const params = new URLSearchParams();
  if (options.layer && options.layer !== "all") params.set("couche", LAYER_PARAM[options.layer]);
  if (options.sport) params.set("sport", options.sport);
  if (options.id) params.set("id", options.id);
  const query = params.toString();
  return query ? `/carte?${query}` : "/carte";
}
