/**
 * Demo content for V2: sports clubs, street workout spots and sports events.
 *
 * Everything here is fictional, flagged `is_demo` and shown with the "Démo" label.
 * Places are positioned around real towns and parks of the launch area so the map
 * looks like the real thing; dates are computed from the day the seed runs, so the
 * events section is never empty.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/database.types";
import { findCommune, jitter } from "../../src/lib/geo";

type DB = SupabaseClient<Database>;

const TZ = "Europe/Paris";
const parisKey = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const addDays = (key: string, days: number) => {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

function near(city: string, seed: string, maxMeters = 900) {
  const commune = findCommune(city);
  if (!commune) throw new Error(`Unknown commune in demo data: ${city}`);
  return { ...jitter(commune, seed, maxMeters), postal_code: commune.postcode, city: commune.name };
}

type ClubSeed = { slug: string; name: string; city: string; sports: string[]; facilities: string[]; description: string; address: string };

const CLUBS: ClubSeed[] = [
  {
    slug: "boxing-club-du-lac",
    name: "Boxing Club du Lac",
    city: "Créteil",
    sports: ["boxe", "preparation-physique"],
    facilities: ["competition", "leisure", "kids", "adults", "changing_rooms"],
    address: "Quartier du Lac",
    description:
      "Club de boxe anglaise et de boxe éducative. Cours loisir trois soirs par semaine, groupe compétition, école de boxe pour les 8-15 ans le mercredi et le samedi.",
  },
  {
    slug: "les-foulees-du-val-de-marne",
    name: "Les Foulées du Val-de-Marne",
    city: "Maisons-Alfort",
    sports: ["running"],
    facilities: ["leisure", "competition", "adults"],
    address: "Bords de Marne",
    description:
      "Club de course à pied : sorties en groupe le long de la Marne, séances de fractionné sur piste, préparation aux 10 km, semi-marathons et marathons de la région.",
  },
  {
    slug: "cercle-aquatique-des-bords-de-marne",
    name: "Cercle Aquatique des Bords de Marne",
    city: "Saint-Maur-des-Fossés",
    sports: ["natation"],
    facilities: ["competition", "leisure", "kids", "adults", "changing_rooms", "accessible"],
    address: "Centre nautique",
    description:
      "Natation sportive et loisir, de l'école de nage au groupe maîtres. Créneaux adultes le midi et le soir, perfectionnement des quatre nages et eau libre à la belle saison.",
  },
  {
    slug: "yoga-club-soleil-levant",
    name: "Yoga Club Soleil Levant",
    city: "Vincennes",
    sports: ["yoga", "pilates"],
    facilities: ["leisure", "adults", "accessible"],
    address: "Près du Bois de Vincennes",
    description:
      "Association de yoga et de pilates. Hatha, vinyasa et yoga doux, en petits groupes de douze personnes. Séances en plein air au bois dès le printemps.",
  },
  {
    slug: "force-et-forme-alfortville",
    name: "Force & Forme Alfortville",
    city: "Alfortville",
    sports: ["musculation", "cross-training"],
    facilities: ["leisure", "competition", "adults", "changing_rooms", "parking"],
    address: "Quartier des berges",
    description:
      "Club associatif de musculation et d'haltérophilie. Plateau de charges libres, section force athlétique, encadrement des débutants par des bénévoles diplômés.",
  },
  {
    slug: "team-cross-94",
    name: "Team Cross 94",
    city: "Vitry-sur-Seine",
    sports: ["cross-training", "preparation-physique"],
    facilities: ["competition", "leisure", "adults", "changing_rooms", "parking"],
    address: "Zone d'activités des Ardoines",
    description:
      "Club de cross-training : séances collectives matin, midi et soir, préparation aux compétitions par équipes et aux courses de fitness indoor.",
  },
  {
    slug: "club-omnisports-de-bonneuil",
    name: "Club Omnisports de Bonneuil",
    city: "Bonneuil-sur-Marne",
    sports: ["fitness", "remise-en-forme", "running"],
    facilities: ["leisure", "kids", "adults", "changing_rooms", "parking", "accessible"],
    address: "Complexe sportif",
    description:
      "Club omnisports ouvert à tous : gym d'entretien, fitness, marche nordique et course à pied. Sections enfants, adultes et seniors, tarifs selon le quotient familial.",
  },
  {
    slug: "punch-academie-champigny",
    name: "Punch Académie Champigny",
    city: "Champigny-sur-Marne",
    sports: ["boxe", "fitness"],
    facilities: ["competition", "leisure", "kids", "adults", "changing_rooms"],
    address: "Quartier du Tremblay",
    description:
      "Boxe française, kick-boxing et cardio-boxe. Cours mixtes, section féminine et entraînement des compétiteurs régionaux.",
  },
  {
    slug: "pilates-et-posture-joinville",
    name: "Pilates & Posture Joinville",
    city: "Joinville-le-Pont",
    sports: ["pilates", "remise-en-forme"],
    facilities: ["leisure", "adults", "accessible"],
    address: "Bords de Marne",
    description:
      "Association de pilates au sol et de gym posturale. Groupes de niveau, séances douces pour la reprise d'activité et le dos.",
  },
  {
    slug: "triathlon-club-de-choisy",
    name: "Triathlon Club de Choisy",
    city: "Choisy-le-Roi",
    sports: ["natation", "running"],
    facilities: ["competition", "adults", "changing_rooms", "parking"],
    address: "Parc interdépartemental des sports",
    description:
      "Triathlon et duathlon, du format découverte au longue distance. Trois entraînements de natation, deux de course à pied et une sortie vélo par semaine.",
  },
];

type SpotSeed = { slug: string; name: string; city: string; lat: number; lng: number; facilities: string[]; always_open: boolean; address: string; description: string };

const SPOTS: SpotSeed[] = [
  {
    slug: "street-workout-ile-de-loisirs-creteil",
    name: "Street workout de l'Île de loisirs",
    city: "Créteil",
    lat: 48.7724,
    lng: 2.4502,
    facilities: ["pull_up_bars", "parallel_bars", "monkey_bars", "rings", "abs_bench", "water"],
    always_open: false,
    address: "Île de loisirs, côté lac",
    description: "Grande aire au bord du lac : six barres de traction de hauteurs différentes, barres parallèles, pont de singe et anneaux. Sol amortissant, point d'eau à 50 m.",
  },
  {
    slug: "spot-parc-dupeyroux-creteil",
    name: "Spot du Parc Dupeyroux",
    city: "Créteil",
    lat: 48.7936,
    lng: 2.4627,
    facilities: ["pull_up_bars", "parallel_bars", "abs_bench", "lighting"],
    always_open: false,
    address: "Parc Dupeyroux",
    description: "Petit spot ombragé au cœur du parc : barres de traction, dips et banc à abdominaux. Calme le matin, idéal pour débuter.",
  },
  {
    slug: "spot-des-bords-de-marne-saint-maur",
    name: "Spot des Bords de Marne",
    city: "Saint-Maur-des-Fossés",
    lat: 48.8049,
    lng: 2.4995,
    facilities: ["pull_up_bars", "parallel_bars", "stall_bars", "lighting", "water"],
    always_open: true,
    address: "Promenade des bords de Marne",
    description: "Barres et espalier le long de la promenade, sur le parcours des coureurs. Éclairé le soir, fontaine à proximité.",
  },
  {
    slug: "barres-du-parc-du-tremblay",
    name: "Barres du Parc du Tremblay",
    city: "Champigny-sur-Marne",
    lat: 48.8247,
    lng: 2.5015,
    facilities: ["pull_up_bars", "parallel_bars", "monkey_bars", "rings", "abs_bench", "stall_bars", "water"],
    always_open: false,
    address: "Parc du Tremblay",
    description: "L'un des spots les plus complets du secteur : cage de street workout, anneaux, espalier et barres basses pour les mouvements au sol.",
  },
  {
    slug: "street-workout-bois-de-vincennes",
    name: "Street workout du Bois de Vincennes",
    city: "Vincennes",
    lat: 48.8329,
    lng: 2.4413,
    facilities: ["pull_up_bars", "parallel_bars", "abs_bench", "covered"],
    always_open: true,
    address: "Bois de Vincennes, près du lac Daumesnil",
    description: "Aire en sous-bois, en partie abritée. Très fréquentée le week-end, ambiance d'entraide entre pratiquants.",
  },
  {
    slug: "spot-parc-des-lilas-vitry",
    name: "Spot du Parc des Lilas",
    city: "Vitry-sur-Seine",
    lat: 48.7806,
    lng: 2.3771,
    facilities: ["pull_up_bars", "parallel_bars", "monkey_bars", "lighting"],
    always_open: false,
    address: "Parc départemental des Lilas",
    description: "Structure moderne sur le plateau du parc, avec vue dégagée. Barres hautes pour les muscle-ups, pont de singe et barres parallèles larges.",
  },
  {
    slug: "spot-de-la-plage-bleue-valenton",
    name: "Spot de la Plage Bleue",
    city: "Valenton",
    lat: 48.7571,
    lng: 2.4716,
    facilities: ["pull_up_bars", "parallel_bars", "abs_bench", "water"],
    always_open: false,
    address: "Parc de la Plage Bleue",
    description: "Barres et bancs au bord du plan d'eau. À combiner avec le tour du lac en footing : 1,9 km de boucle plate.",
  },
  {
    slug: "spot-des-berges-de-seine-alfortville",
    name: "Spot des Berges de Seine",
    city: "Alfortville",
    lat: 48.7921,
    lng: 2.4138,
    facilities: ["pull_up_bars", "parallel_bars", "rings", "lighting"],
    always_open: true,
    address: "Quai Blanqui",
    description: "Spot urbain sur les quais, éclairé toute la nuit. Barres de traction, dips et anneaux, face à la Seine.",
  },
  {
    slug: "spot-parc-interdepartemental-choisy",
    name: "Spot du Parc interdépartemental",
    city: "Choisy-le-Roi",
    lat: 48.7683,
    lng: 2.4301,
    facilities: ["pull_up_bars", "parallel_bars", "monkey_bars", "abs_bench", "stall_bars", "water", "lighting"],
    always_open: false,
    address: "Parc interdépartemental des sports",
    description: "Grande plateforme au milieu des terrains de sport : plusieurs postes en parallèle, pratique pour les entraînements en groupe.",
  },
  {
    slug: "spot-du-port-de-bonneuil",
    name: "Spot du Port de Bonneuil",
    city: "Bonneuil-sur-Marne",
    lat: 48.7712,
    lng: 2.4938,
    facilities: ["pull_up_bars", "parallel_bars", "abs_bench"],
    always_open: true,
    address: "Chemin de halage",
    description: "Trois barres et un banc au départ du chemin de halage. Simple, tranquille, accessible à toute heure.",
  },
];

type EventSeed = {
  slug: string;
  name: string;
  kind: "hyrox" | "marathon" | "trail" | "competition" | "challenge" | "local";
  sport: string | null;
  /** Days from the day the seed runs. */
  inDays: number;
  lengthDays?: number;
  startTime: string | null;
  placeName: string;
  city: string;
  postalCode: string;
  lat: number;
  lng: number;
  formats: string[];
  level: "all" | "beginner" | "intermediate" | "advanced";
  priceFromCents: number | null;
  isFree?: boolean;
  organizer: string;
  summary: string;
  description: string;
};

const EVENTS: EventSeed[] = [
  {
    slug: "yoga-au-lever-du-soleil-lac-de-creteil",
    name: "Yoga au lever du soleil",
    kind: "local",
    sport: "yoga",
    inDays: 4,
    startTime: "07:30",
    placeName: "Lac de Créteil, ponton nord",
    city: "Créteil",
    postalCode: "94000",
    lat: 48.7758,
    lng: 2.4521,
    formats: ["Séance de 60 min", "Tous niveaux"],
    level: "all",
    priceFromCents: null,
    isFree: true,
    organizer: "Collectif Créteil en mouvement",
    summary: "Une heure de yoga face au lac pour commencer le week-end.",
    description:
      "Séance ouverte à tous, guidée par une professeure diplômée. Apportez votre tapis et une tenue chaude : la séance a lieu en extérieur. Annulée en cas de pluie.",
  },
  {
    slug: "challenge-30-jours-remise-en-forme",
    name: "Challenge 30 jours · Remise en forme",
    kind: "challenge",
    sport: "remise-en-forme",
    inDays: 8,
    lengthDays: 30,
    startTime: null,
    placeName: "Parc Dupeyroux et en ligne",
    city: "Créteil",
    postalCode: "94000",
    lat: 48.7931,
    lng: 2.4619,
    formats: ["3 séances par semaine", "Suivi en groupe"],
    level: "beginner",
    priceFromCents: 2900,
    organizer: "Coachs indépendants du Val-de-Marne",
    summary: "Trente jours pour reprendre une activité régulière, en groupe.",
    description:
      "Trois séances collectives par semaine au parc, un programme à suivre chez soi les autres jours et un bilan en fin de challenge. Pensé pour les personnes qui reprennent le sport.",
  },
  {
    slug: "les-10-km-de-creteil",
    name: "Les 10 km de Créteil",
    kind: "local",
    sport: "running",
    inDays: 17,
    startTime: "09:30",
    placeName: "Départ : Hôtel de ville",
    city: "Créteil",
    postalCode: "94000",
    lat: 48.7772,
    lng: 2.4575,
    formats: ["10 km", "5 km", "Course enfants"],
    level: "all",
    priceFromCents: 1200,
    organizer: "Comité des fêtes sportives",
    summary: "Une boucle plate et rapide autour du lac, pour battre son record.",
    description:
      "Parcours roulant de 10 km en une boucle, départ et arrivée devant l'hôtel de ville. Meneurs d'allure de 40 à 65 minutes, ravitaillement au 5e kilomètre, médaille pour tous les arrivants.",
  },
  {
    slug: "hyrox-paris",
    name: "HYROX Paris",
    kind: "hyrox",
    sport: "cross-training",
    inDays: 24,
    lengthDays: 2,
    startTime: "08:00",
    placeName: "Parc des expositions, Porte de Versailles",
    city: "Paris",
    postalCode: "75015",
    lat: 48.8322,
    lng: 2.2876,
    formats: ["Solo", "Duo", "Relais à quatre"],
    level: "intermediate",
    priceFromCents: 8900,
    organizer: "Organisation fictive (démonstration)",
    summary: "Huit fois 1 km de course, huit ateliers de fitness. Le format qui monte.",
    description:
      "Le principe : 1 km de course à pied suivi d'un atelier, à répéter huit fois (ski-erg, traîneau, burpees sautés, rameur, farmer carry, fentes, wall balls). Catégories solo, duo et relais, départs par vagues toute la journée.",
  },
  {
    slug: "trail-du-bois-de-vincennes",
    name: "Trail du Bois de Vincennes",
    kind: "trail",
    sport: "running",
    inDays: 31,
    startTime: "09:00",
    placeName: "Esplanade du château",
    city: "Vincennes",
    postalCode: "94300",
    lat: 48.8425,
    lng: 2.4357,
    formats: ["22 km", "11 km", "Marche nordique 8 km"],
    level: "all",
    priceFromCents: 1800,
    organizer: "Association Sentiers de l'Est parisien",
    summary: "Chemins forestiers, lacs et petites bosses aux portes de Paris.",
    description:
      "Deux distances sur les sentiers du bois, 90 % de chemins. Dénivelé modéré (250 m pour le 22 km), idéal pour un premier trail. Dossards limités à 1 200 coureurs.",
  },
  {
    slug: "open-de-boxe-du-val-de-marne",
    name: "Open de boxe du Val-de-Marne",
    kind: "competition",
    sport: "boxe",
    inDays: 38,
    lengthDays: 2,
    startTime: "10:00",
    placeName: "Palais des sports",
    city: "Créteil",
    postalCode: "94000",
    lat: 48.7818,
    lng: 2.4634,
    formats: ["Amateurs", "Éducative", "Gala du samedi soir"],
    level: "intermediate",
    priceFromCents: 800,
    organizer: "Comité départemental (fictif)",
    summary: "Deux jours de combats amateurs et un gala en soirée.",
    description:
      "Tournoi ouvert aux licenciés amateurs, assauts de boxe éducative le dimanche matin, gala le samedi à 19 h. Entrée payante pour le public, gratuite pour les moins de 12 ans.",
  },
  {
    slug: "semi-marathon-des-bords-de-marne",
    name: "Semi-marathon des Bords de Marne",
    kind: "marathon",
    sport: "running",
    inDays: 45,
    startTime: "09:00",
    placeName: "Quai de la Pie",
    city: "Saint-Maur-des-Fossés",
    postalCode: "94100",
    lat: 48.8041,
    lng: 2.5012,
    formats: ["Semi-marathon", "10 km"],
    level: "intermediate",
    priceFromCents: 2400,
    organizer: "Les Foulées du Val-de-Marne (club fictif)",
    summary: "21,1 km dans la boucle de la Marne, sans une seule côte.",
    description:
      "Un parcours plat le long de la rivière, réputé pour ses chronos. Sas de départ par objectif, quatre ravitaillements, consigne et douches à l'arrivée.",
  },
  {
    slug: "battle-street-workout-ile-de-loisirs",
    name: "Battle Street Workout",
    kind: "competition",
    sport: null,
    inDays: 52,
    startTime: "14:00",
    placeName: "Île de loisirs de Créteil",
    city: "Créteil",
    postalCode: "94000",
    lat: 48.7726,
    lng: 2.4498,
    formats: ["Freestyle", "Tractions max", "Initiation gratuite"],
    level: "all",
    priceFromCents: null,
    isFree: true,
    organizer: "Collectif Barres 94",
    summary: "Freestyle, tractions et initiations sur le spot du lac.",
    description:
      "Battles de freestyle en un contre un, concours de tractions et de dips, et un atelier d'initiation ouvert à tous de 14 h à 16 h. Inscription sur place, gratuite.",
  },
  {
    slug: "throwdown-94-cross-training",
    name: "Throwdown 94",
    kind: "competition",
    sport: "cross-training",
    inDays: 59,
    startTime: "08:30",
    placeName: "Gymnase des Ardoines",
    city: "Vitry-sur-Seine",
    postalCode: "94400",
    lat: 48.7861,
    lng: 2.4012,
    formats: ["Équipes de deux", "Scaled", "RX"],
    level: "intermediate",
    priceFromCents: 4500,
    organizer: "Team Cross 94 (club fictif)",
    summary: "Compétition de cross-training par équipes de deux, trois épreuves et une finale.",
    description:
      "Trois épreuves qualificatives et une finale pour les cinq meilleures équipes de chaque catégorie. Catégories Scaled et RX, mixtes ou non.",
  },
  {
    slug: "trail-nocturne-de-la-foret-notre-dame",
    name: "Trail nocturne de la forêt Notre-Dame",
    kind: "trail",
    sport: "running",
    inDays: 66,
    startTime: "18:30",
    placeName: "Parking de la forêt Notre-Dame",
    city: "Sucy-en-Brie",
    postalCode: "94370",
    lat: 48.7594,
    lng: 2.5452,
    formats: ["15 km", "8 km"],
    level: "intermediate",
    priceFromCents: 1600,
    organizer: "Association Sentiers de l'Est parisien",
    summary: "À la frontale dans les allées forestières. Lampe obligatoire.",
    description:
      "Départ à la tombée de la nuit pour deux boucles en forêt. Frontale et couverture de survie obligatoires. Soupe chaude à l'arrivée.",
  },
  {
    slug: "defi-1000-burpees-maisons-alfort",
    name: "Défi 1000 burpees",
    kind: "challenge",
    sport: "fitness",
    inDays: 73,
    startTime: "10:00",
    placeName: "Stade Cubizolles",
    city: "Maisons-Alfort",
    postalCode: "94700",
    lat: 48.8034,
    lng: 2.4368,
    formats: ["Équipes de quatre", "Solo"],
    level: "all",
    priceFromCents: 1000,
    organizer: "Collectif Créteil en mouvement",
    summary: "Mille burpees à se partager, au profit d'une association locale.",
    description:
      "Par équipes de quatre ou en solo pour les plus courageux. L'intégralité des inscriptions est reversée à une association sportive de quartier.",
  },
  {
    slug: "fete-du-sport-de-saint-maur",
    name: "Fête du sport de Saint-Maur",
    kind: "local",
    sport: null,
    inDays: 94,
    lengthDays: 2,
    startTime: "10:00",
    placeName: "Stade Chéron",
    city: "Saint-Maur-des-Fossés",
    postalCode: "94100",
    lat: 48.7982,
    lng: 2.4879,
    formats: ["Initiations", "Démonstrations", "Village des clubs"],
    level: "all",
    priceFromCents: null,
    isFree: true,
    organizer: "Ville (évènement fictif)",
    summary: "Deux jours pour essayer vingt disciplines et rencontrer les clubs.",
    description:
      "Initiations gratuites tout le week-end : boxe, yoga, natation, course d'orientation, street workout. Les clubs et les coachs indépendants tiennent un stand sur le village.",
  },
  {
    slug: "marathon-du-val-de-marne",
    name: "Marathon du Val-de-Marne",
    kind: "marathon",
    sport: "running",
    inDays: 122,
    startTime: "08:30",
    placeName: "Départ : Île de loisirs de Créteil",
    city: "Créteil",
    postalCode: "94000",
    lat: 48.7741,
    lng: 2.4533,
    formats: ["Marathon", "Marathon relais à quatre", "Semi-marathon"],
    level: "advanced",
    priceFromCents: 5500,
    organizer: "Organisation fictive (démonstration)",
    summary: "42,195 km entre Marne et Seine, à travers neuf communes.",
    description:
      "Un marathon en une seule boucle qui longe la Marne puis la Seine. Format relais à quatre pour le découvrir en équipe. Plan de préparation de seize semaines proposé par les coachs Bold Up.",
  },
];

export async function seedPlacesAndEvents(db: DB): Promise<{ clubs: number; spots: number; events: number }> {
  const check = (label: string, error: { message: string } | null) => {
    if (error) throw new Error(`${label}: ${error.message}`);
  };

  check("delete demo clubs and spots", (await db.from("venues").delete().eq("is_demo", true).in("category", ["club", "street_workout"])).error);
  check("delete demo events", (await db.from("events").delete().eq("is_demo", true)).error);

  const clubs = CLUBS.map((club) => {
    const { lat, lng, postal_code, city } = near(club.city, club.slug);
    return {
      slug: club.slug,
      name: club.name,
      category: "club" as const,
      description: club.description,
      address: club.address,
      postal_code,
      city,
      lat,
      lng,
      sports: club.sports,
      facilities: club.facilities,
      source: "demo",
      is_demo: true,
    };
  });
  check("clubs", (await db.from("venues").insert(clubs)).error);

  const spots = SPOTS.map((spot) => ({
    slug: spot.slug,
    name: spot.name,
    category: "street_workout" as const,
    description: spot.description,
    address: spot.address,
    postal_code: findCommune(spot.city)?.postcode ?? null,
    city: spot.city,
    lat: spot.lat,
    lng: spot.lng,
    facilities: spot.facilities,
    is_free: true,
    always_open: spot.always_open,
    source: "demo",
    is_demo: true,
  }));
  check("street workout spots", (await db.from("venues").insert(spots)).error);

  const today = parisKey(new Date());
  const events = EVENTS.map((event) => {
    const startsOn = addDays(today, event.inDays);
    return {
      slug: event.slug,
      name: event.name,
      kind: event.kind,
      sport_slug: event.sport,
      summary: event.summary,
      description: event.description,
      starts_on: startsOn,
      ends_on: event.lengthDays && event.lengthDays > 1 ? addDays(startsOn, event.lengthDays - 1) : null,
      start_time: event.startTime,
      place_name: event.placeName,
      postal_code: event.postalCode,
      city: event.city,
      lat: event.lat,
      lng: event.lng,
      formats: event.formats,
      level: event.level,
      price_from_cents: event.priceFromCents,
      is_free: event.isFree ?? false,
      organizer: event.organizer,
      source: "demo",
      is_demo: true,
    };
  });
  check("events", (await db.from("events").insert(events)).error);

  return { clubs: clubs.length, spots: spots.length, events: events.length };
}
