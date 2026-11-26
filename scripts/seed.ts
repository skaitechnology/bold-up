/**
 * Demo data for BOLD UP — repeatable.
 *
 *   npm run db:seed                      local Supabase (reads .env.local)
 *   ENV_FILE=.env.production.local npm run db:seed -- --allow-remote
 *
 * Everything created here is fictional and flagged `is_demo`. Each run first removes the
 * previous demo accounts and demo/OSM venues, then recreates them, so the scenario is
 * always the same: one approved coach, one coach awaiting validation, one customer with
 * bookings, one administrator. Accounts and data created by real users are never touched.
 *
 * Passwords are generated once, kept in .demo-credentials.json (git-ignored) and reused
 * on later runs. Set DEMO_PASSWORD_COACH / _CUSTOMER / _ADMIN to choose them yourself.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import type { Database } from "../src/lib/database.types";
import { findCommune, jitter } from "../src/lib/geo";
import { PRECHECK_ENGINE } from "../src/lib/verification/checks";
import { demoPdf } from "./lib/demo-pdf";
import { seedPlacesAndEvents } from "./lib/demo-places";

const root = path.resolve(__dirname, "..");
loadEnv({ path: path.join(root, process.env.ENV_FILE ?? ".env.local"), quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. See .env.example.");
  process.exit(1);
}
const isLocal = /127\.0\.0\.1|localhost/.test(url);
if (!isLocal && !process.argv.includes("--allow-remote")) {
  console.error(`Refusing to seed a remote project (${new URL(url).host}) without --allow-remote.`);
  process.exit(1);
}

type DB = SupabaseClient<Database>;
const db: DB = createClient<Database>(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

// ---------------------------------------------------------------- helpers

function must<T>(result: { data: T; error: { message: string } | null }, label: string): NonNullable<T> {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  if (result.data == null) throw new Error(`${label}: no data returned`);
  return result.data as NonNullable<T>;
}
async function run(promise: PromiseLike<{ error: { message: string } | null }>, label: string) {
  const { error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
}

const TZ = "Europe/Paris";
const parisKey = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const addDays = (key: string, days: number) => {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};
const isoWeekday = (key: string) => {
  const day = new Date(`${key}T12:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
};
/** The instant at which the clocks in Paris show `key` `time`. Handles daylight saving. */
function parisInstant(key: string, time: string): Date {
  const guess = new Date(`${key}T${time}:00Z`);
  const shown = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, dateStyle: "short", timeStyle: "medium" }).format(guess);
  const offsetMs = new Date(`${shown.replace(" ", "T")}Z`).getTime() - guess.getTime();
  return new Date(guess.getTime() - offsetMs);
}
/** First day at or after today+offset whose weekday is in `weekdays`. */
function dayOn(offset: number, weekdays: number[]): string {
  let key = addDays(parisKey(new Date()), offset);
  for (let i = 0; i < 8 && !weekdays.includes(isoWeekday(key)); i++) key = addDays(key, offset < 0 ? -1 : 1);
  return key;
}

function credentials(): Record<"coach" | "customer" | "admin" | "pending", string> {
  const file = path.join(root, ".demo-credentials.json");
  const store: Record<string, Record<string, string>> = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  const host = new URL(url as string).host;
  const generate = () => `Bold-${randomBytes(6).toString("base64url")}`;
  const current = store[host] ?? {};
  const next = {
    coach: process.env.DEMO_PASSWORD_COACH || current.coach || generate(),
    customer: process.env.DEMO_PASSWORD_CUSTOMER || current.customer || generate(),
    admin: process.env.DEMO_PASSWORD_ADMIN || current.admin || generate(),
    pending: current.pending || generate(),
  };
  store[host] = next;
  writeFileSync(file, `${JSON.stringify(store, null, 2)}\n`);
  return next;
}

// ---------------------------------------------------------------- scenario

const WEEKDAYS = [1, 2, 3, 4, 5];
type Range = [string, string];
type CoachSeed = {
  key: string;
  email: string;
  name: string;
  headline: string;
  bio: string;
  experience: string;
  years: number;
  city: string;
  radius: number;
  photo: string | null;
  gallery?: string[];
  sports: string[];
  where: { at_home?: boolean; at_gym?: boolean; outdoor?: boolean; online?: boolean };
  levels: string[];
  formats: string[];
  school?: string;
  instagram?: string;
  services: { name: string; description: string; duration: number; price: number; format?: "private" | "group" }[];
  qualifications: { kind: string; title: string; issuer?: string; year?: number }[];
  hours: Record<number, Range[]>;
  status: "approved" | "awaiting_review";
};

const everyDay = (days: number[], ranges: Range[]) => Object.fromEntries(days.map((day) => [day, ranges]));

const COACHES: CoachSeed[] = [
  {
    key: "alexandre",
    email: "alexandre@boldup.test",
    name: "Alexandre Moreau",
    headline: "Coach boxe & renforcement — Créteil",
    bio: "Séances individuelles de boxe et de renforcement musculaire, adaptées à vos objectifs. De votre toute première séance jusqu'à la préparation physique avancée, on avance à votre rythme, avec une technique propre et un vrai suivi.",
    experience:
      "Dix ans de pratique de la boxe anglaise en club, puis six ans d'encadrement. J'accompagne des débutants qui veulent se dépenser et reprendre confiance, comme des pratiquants confirmés qui préparent une échéance. Chaque séance mêle technique, cardio et renforcement fonctionnel.",
    years: 6,
    city: "Créteil",
    radius: 8,
    photo: "alexandre.jpg",
    gallery: ["boxing-gloves.jpg", "gym-bag.jpg", "gloves-blue.jpg"],
    sports: ["boxe", "musculation", "preparation-physique"],
    where: { at_gym: true, at_home: true, outdoor: true },
    levels: ["beginner", "intermediate", "advanced"],
    formats: ["private"],
    school: "CREPS Île-de-France",
    services: [
      { name: "Séance découverte", description: "Premier échange, bilan de forme et initiation aux bases.", duration: 30, price: 25 },
      { name: "Boxe individuelle", description: "Technique, déplacements, travail aux pattes d'ours et au sac.", duration: 60, price: 50 },
      { name: "Renforcement musculaire", description: "Force, gainage et mobilité, avec ou sans matériel.", duration: 60, price: 45 },
      { name: "Coaching personnalisé", description: "Programme sur mesure mêlant boxe, cardio et préparation physique.", duration: 60, price: 55 },
    ],
    qualifications: [
      { kind: "carte_pro", title: "Carte professionnelle d'éducateur sportif", issuer: "SDJES du Val-de-Marne", year: 2020 },
      { kind: "bpjeps", title: "BPJEPS Boxe", issuer: "CREPS Île-de-France", year: 2020 },
      { kind: "bpjeps", title: "BPJEPS Activités de la forme", issuer: "CREPS Île-de-France", year: 2022 },
    ],
    hours: { ...everyDay(WEEKDAYS, [["07:00", "10:00"], ["17:00", "21:00"]]), 6: [["09:00", "13:00"]] },
    status: "approved",
  },
  {
    key: "nadia",
    email: "nadia@boldup.test",
    name: "Nadia Fontaine",
    headline: "Boxe & cardio boxing — Joinville-le-Pont",
    bio: "Je propose une boxe accessible et exigeante à la fois : on apprend les bons gestes, on se dépense et on gagne en assurance. Séances individuelles ou en petit groupe, dans une ambiance bienveillante.",
    experience: "Ancienne compétitrice amateur, j'encadre depuis quatre ans des publics débutants, notamment des femmes qui découvrent la boxe.",
    years: 4,
    city: "Joinville-le-Pont",
    radius: 6,
    photo: "boxing-gloves.jpg",
    sports: ["boxe", "fitness"],
    where: { at_gym: true, outdoor: true },
    levels: ["beginner", "intermediate"],
    formats: ["private", "group"],
    services: [
      { name: "Boxe débutant", description: "Les bases en toute sécurité : garde, déplacements, enchaînements simples.", duration: 60, price: 45 },
      { name: "Cardio boxing en duo", description: "À deux, pour se motiver. Tarif par personne.", duration: 60, price: 30, format: "group" },
    ],
    qualifications: [{ kind: "bpjeps", title: "BPJEPS Boxe", issuer: "CREPS Île-de-France", year: 2022 }],
    hours: { ...everyDay([1, 3, 5], [["12:00", "14:00"], ["18:00", "21:00"]]), 6: [["10:00", "13:00"]] },
    status: "approved",
  },
  {
    key: "sarah",
    email: "sarah@boldup.test",
    name: "Sarah Lemoine",
    headline: "Yoga vinyasa & hatha — Saint-Maur-des-Fossés",
    bio: "Un yoga précis et apaisant, pour gagner en mobilité, en force et en calme. J'adapte chaque posture à votre corps et à votre journée, que vous débutiez ou que vous pratiquiez depuis longtemps.",
    experience: "Formée au yoga vinyasa puis au hatha, j'enseigne depuis sept ans en studio et à domicile, des bords de Marne aux salons de mes élèves.",
    years: 7,
    city: "Saint-Maur-des-Fossés",
    radius: 7,
    photo: "yoga.jpg",
    sports: ["yoga", "remise-en-forme"],
    where: { at_home: true, outdoor: true, online: true },
    levels: ["beginner", "intermediate", "advanced"],
    formats: ["private", "group"],
    services: [
      { name: "Yoga individuel", description: "Séance sur mesure : respiration, postures, relaxation.", duration: 60, price: 48 },
      { name: "Yoga en visio", description: "La même attention, depuis chez vous.", duration: 45, price: 32 },
    ],
    qualifications: [{ kind: "other", title: "Certification professeur de yoga 500 h", issuer: "École de yoga", year: 2018 }],
    hours: { ...everyDay([1, 2, 3, 4, 5], [["08:00", "12:00"], ["18:00", "20:00"]]) },
    status: "approved",
  },
  {
    key: "thomas",
    email: "thomas@boldup.test",
    name: "Thomas Girard",
    headline: "Running & préparation physique — Maisons-Alfort",
    bio: "Du premier footing au semi-marathon : je construis avec vous un entraînement progressif, sans blessure, sur les bords de Marne ou au bois de Vincennes. Technique de course, allures et renforcement spécifique.",
    experience: "Licencié STAPS et coureur de trail, j'entraîne des coureurs de tous niveaux depuis cinq ans.",
    years: 5,
    city: "Maisons-Alfort",
    radius: 10,
    photo: "running.jpg",
    sports: ["running", "preparation-physique"],
    where: { outdoor: true },
    levels: ["beginner", "intermediate", "advanced"],
    formats: ["private", "group"],
    services: [
      { name: "Séance running", description: "Technique de course, travail d'allure et conseils personnalisés.", duration: 60, price: 40 },
      { name: "Bilan et plan d'entraînement", description: "Test de terrain puis plan sur six semaines.", duration: 90, price: 65 },
    ],
    qualifications: [{ kind: "staps", title: "Licence STAPS Entraînement sportif", issuer: "Université Paris-Est Créteil", year: 2020 }],
    hours: { ...everyDay([2, 4], [["06:30", "09:00"], ["18:00", "20:30"]]), 6: [["08:00", "12:00"]], 7: [["08:00", "11:00"]] },
    status: "approved",
  },
  {
    key: "ines",
    email: "ines@boldup.test",
    name: "Inès Benali",
    headline: "Pilates & remise en forme — Créteil",
    bio: "Le Pilates pour retrouver un dos solide, une posture alignée et de l'énergie. Mes séances sont douces mais efficaces, idéales après une longue pause, une grossesse ou en complément d'un autre sport.",
    experience: "Instructrice Pilates depuis huit ans, spécialisée dans la remise en forme et le travail postural.",
    years: 8,
    city: "Créteil",
    radius: 5,
    photo: "pilates.jpg",
    sports: ["pilates", "remise-en-forme"],
    where: { at_gym: true, at_home: true },
    levels: ["beginner", "intermediate"],
    formats: ["private", "group"],
    services: [
      { name: "Pilates au sol", description: "Renforcement profond, mobilité et respiration.", duration: 55, price: 42 },
      { name: "Remise en forme douce", description: "Reprise progressive, à votre rythme.", duration: 45, price: 36 },
    ],
    qualifications: [{ kind: "bpjeps", title: "BPJEPS Activités de la forme", issuer: "CREPS Île-de-France", year: 2017 }],
    hours: { ...everyDay([1, 2, 4, 5], [["09:00", "12:30"], ["14:00", "17:00"]]) },
    status: "approved",
  },
  {
    key: "mehdi",
    email: "mehdi@boldup.test",
    name: "Mehdi Roussel",
    headline: "Cross-training & fitness — Alfortville",
    bio: "Des séances courtes, intenses et variées pour progresser vite : kettlebells, poids du corps, cardio. Je vous apprends les bons mouvements avant d'accélérer, pour durer.",
    experience: "Coach en cross-training depuis cinq ans, passé par plusieurs box d'Île-de-France.",
    years: 5,
    city: "Alfortville",
    radius: 6,
    photo: "kettlebell.jpg",
    sports: ["cross-training", "fitness", "musculation"],
    where: { at_gym: true, outdoor: true, at_home: true },
    levels: ["beginner", "intermediate", "advanced"],
    formats: ["private", "group"],
    services: [
      { name: "Cross-training individuel", description: "Force, cardio et technique des mouvements.", duration: 60, price: 48 },
      { name: "HIIT express", description: "Trente minutes pour tout donner.", duration: 30, price: 28 },
    ],
    qualifications: [{ kind: "bpjeps", title: "BPJEPS Activités de la forme", issuer: "CREPS Île-de-France", year: 2021 }],
    hours: { ...everyDay(WEEKDAYS, [["06:30", "09:00"], ["12:00", "14:00"], ["18:00", "21:00"]]) },
    status: "approved",
  },
  {
    key: "lucas",
    email: "lucas@boldup.test",
    name: "Lucas Marchand",
    headline: "Musculation & prise de force — Choisy-le-Roi",
    bio: "Apprendre à bien s'entraîner en musculation : technique des mouvements de base, progression mesurée et programme clair. Pour prendre de la force, du muscle ou simplement se sentir solide.",
    experience: "Préparateur physique et pratiquant de force athlétique, j'accompagne débutants et confirmés depuis neuf ans.",
    years: 9,
    city: "Choisy-le-Roi",
    radius: 8,
    photo: "kettlebell-sand.jpg",
    sports: ["musculation", "preparation-physique"],
    where: { at_gym: true },
    levels: ["beginner", "intermediate", "advanced"],
    formats: ["private"],
    services: [
      { name: "Musculation encadrée", description: "Squat, développé, soulevé de terre : la technique d'abord.", duration: 60, price: 52 },
      { name: "Programme personnalisé", description: "Bilan complet et programme sur huit semaines.", duration: 75, price: 70 },
    ],
    qualifications: [{ kind: "dejeps", title: "DEJEPS Haltérophilie, musculation", issuer: "CREPS Île-de-France", year: 2017 }],
    hours: { ...everyDay([1, 2, 3, 4], [["10:00", "13:00"], ["16:00", "20:00"]]), 6: [["09:00", "12:00"]] },
    status: "approved",
  },
  {
    key: "yanis",
    email: "yanis@boldup.test",
    name: "Yanis Bellamy",
    headline: "Boxe pieds-poings & cardio — Maisons-Alfort",
    bio: "Kick-boxing, boxe thaï et préparation physique : des séances dynamiques pour apprendre à frapper juste, se défouler et se dépasser, quel que soit votre niveau de départ.",
    experience: "Pratiquant depuis l'adolescence, diplômé depuis peu, je me lance comme coach indépendant dans le Val-de-Marne.",
    years: 2,
    city: "Maisons-Alfort",
    radius: 6,
    photo: "gloves-blue.jpg",
    sports: ["boxe", "fitness"],
    where: { at_gym: true, outdoor: true },
    levels: ["beginner", "intermediate"],
    formats: ["private", "group"],
    services: [{ name: "Kick-boxing individuel", description: "Technique pieds-poings, cardio et renforcement.", duration: 60, price: 42 }],
    qualifications: [{ kind: "bpjeps", title: "BPJEPS Sports de contact", issuer: "CREPS Île-de-France", year: 2025 }],
    hours: { ...everyDay([1, 3, 5], [["17:00", "21:00"]]), 6: [["10:00", "16:00"]] },
    status: "awaiting_review",
  },
];

const DEMO_VENUES = [
  {
    slug: "atelier-boxe-creteil-demo",
    name: "L'Atelier Boxe Créteil",
    category: "gym" as const,
    description:
      "Salle indépendante dédiée aux sports de combat et à la préparation physique : ring, sacs de frappe, espace de renforcement. Créneaux réservés aux coachs indépendants en journée.",
    address: "12 rue des Mèches",
    postal_code: "94000",
    city: "Créteil",
    lat: 48.7872,
    lng: 2.4489,
    facilities: ["Ring", "Sacs de frappe", "Espace musculation", "Vestiaires", "Créneaux coachs"],
    partner_status: "partner" as const,
    claim_status: "claimed" as const,
    photo: "gym-bag.jpg",
  },
  {
    slug: "studio-marne-demo",
    name: "Studio Bords de Marne",
    category: "studio" as const,
    description: "Studio lumineux pour le yoga, le Pilates et les cours en petit groupe. Location à l'heure possible pour les coachs.",
    address: "4 quai de la Pie",
    postal_code: "94100",
    city: "Saint-Maur-des-Fossés",
    lat: 48.8039,
    lng: 2.4741,
    facilities: ["Parquet", "Tapis et accessoires", "Vestiaires"],
    partner_status: "listed" as const,
    claim_status: "claimed" as const,
    photo: null,
  },
];

// ---------------------------------------------------------------- cleanup

async function removeFolder(bucket: string, folder: string) {
  const { data } = await db.storage.from(bucket).list(folder, { limit: 100 });
  if (data?.length) await db.storage.from(bucket).remove(data.map((file) => `${folder}/${file.name}`));
}

async function cleanup() {
  const { data: demo } = await db.from("profiles").select("id, email").or("is_demo.eq.true,email.like.%@boldup.test");
  for (const profile of demo ?? []) {
    await removeFolder("coach-documents", profile.id);
    await removeFolder("coach-media", profile.id);
    await run(db.auth.admin.deleteUser(profile.id), `delete user ${profile.email}`);
  }
  await removeFolder("venue-media", "demo");
  await run(db.from("venues").delete().or("is_demo.eq.true,source.eq.osm"), "delete demo venues");
  return demo?.length ?? 0;
}

// ---------------------------------------------------------------- creation

async function createUser(email: string, password: string, fullName: string, role: "customer" | "coach") {
  const created = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role, locale: "fr" },
  });
  if (created.error || !created.data.user) throw new Error(`create ${email}: ${created.error?.message}`);
  const id = created.data.user.id;
  await run(db.from("profiles").update({ is_demo: true }).eq("id", id), `flag demo ${email}`);
  return id;
}

async function upload(bucket: string, target: string, file: string) {
  const body = readFileSync(path.join(root, "scripts/data/media", file));
  await run(db.storage.from(bucket).upload(target, body, { contentType: "image/jpeg", upsert: true }), `upload ${target}`);
  return target;
}

async function seedCoach(coach: CoachSeed, password: string, adminId: string, sportIds: Map<string, string>) {
  const id = await createUser(coach.email, password, coach.name, "coach");
  const town = findCommune(coach.city);
  if (!town) throw new Error(`unknown town ${coach.city}`);
  const point = jitter(town, coach.key);

  const photoPath = coach.photo ? await upload("coach-media", `${id}/portrait.jpg`, coach.photo) : null;
  for (const [index, file] of (coach.gallery ?? []).entries()) {
    const target = await upload("coach-media", `${id}/gallery-${index + 1}.jpg`, file);
    await run(db.from("coach_media").insert({ coach_id: id, path: target, sort_order: index }), "gallery row");
  }

  await run(
    db
      .from("coach_profiles")
      .update({
        headline: coach.headline,
        bio: coach.bio,
        experience: coach.experience,
        years_experience: coach.years,
        photo_path: photoPath,
        city: town.name,
        postal_code: town.postcode,
        lat: point.lat,
        lng: point.lng,
        service_radius_km: coach.radius,
        at_home: Boolean(coach.where.at_home),
        at_gym: Boolean(coach.where.at_gym),
        outdoor: Boolean(coach.where.outdoor),
        online: Boolean(coach.where.online),
        levels: coach.levels,
        formats: coach.formats,
        training_school: coach.school ?? null,
        instagram: coach.instagram ?? null,
        min_notice_hours: 12,
        is_demo: true,
      })
      .eq("id", id),
    `profile ${coach.key}`,
  );

  await run(
    db.from("coach_sports").insert(
      coach.sports.map((slug) => {
        const sportId = sportIds.get(slug);
        if (!sportId) throw new Error(`unknown sport ${slug}`);
        return { coach_id: id, sport_id: sportId };
      }),
    ),
    "sports",
  );
  const services = must(
    await db
      .from("coach_services")
      .insert(
        coach.services.map((service, index) => ({
          coach_id: id,
          name: service.name,
          description: service.description,
          duration_min: service.duration,
          price_cents: service.price * 100,
          format: service.format ?? "private",
          sort_order: index,
        })),
      )
      .select("id, name, duration_min, price_cents"),
    "services",
  );
  await run(
    db.from("coach_qualifications").insert(
      coach.qualifications.map((qualification) => ({
        coach_id: id,
        kind: qualification.kind,
        title: qualification.title,
        issuer: qualification.issuer ?? null,
        year_obtained: qualification.year ?? null,
        status: coach.status === "approved" ? "verified" : "declared",
      })),
    ),
    "qualifications",
  );
  await run(
    db.from("availability_rules").insert(
      Object.entries(coach.hours).flatMap(([weekday, ranges]) =>
        ranges.map(([start, end]) => ({ coach_id: id, weekday: Number(weekday), start_time: start, end_time: end })),
      ),
    ),
    "availability",
  );

  // Fictional supporting documents (clearly marked as such inside the PDF itself).
  const approved = coach.status === "approved";
  const report = {
    engine: PRECHECK_ENGINE,
    simulated: true,
    passed: true,
    ran_at: new Date().toISOString(),
    checks: ["file_exists", "not_empty", "size_ok", "type_allowed", "signature_matches", "metadata_present"].map((code) => ({ code, passed: true })),
  };
  const documents = [
    { type: "carte_pro", title: "Carte professionnelle d'educateur sportif", file: "carte-professionnelle-demo.pdf", expires: addDays(parisKey(new Date()), 900) },
    { type: "insurance", title: "Attestation d'assurance RC professionnelle", file: "attestation-rc-pro-demo.pdf", expires: addDays(parisKey(new Date()), 240) },
  ];
  for (const document of documents) {
    const pdf = demoPdf(document.title, coach.name);
    const storagePath = `${id}/${randomUUID()}.pdf`;
    await run(db.storage.from("coach-documents").upload(storagePath, pdf, { contentType: "application/pdf" }), "document upload");
    const row = must(
      await db
        .from("coach_documents")
        .insert({
          coach_id: id,
          type_code: document.type,
          storage_path: storagePath,
          file_name: document.file,
          mime_type: "application/pdf",
          size_bytes: pdf.length,
          status: approved ? "approved" : "awaiting_review",
          precheck: report,
          reference: "DEMO-0000",
          expires_on: document.expires,
          reviewed_by: approved ? adminId : null,
          reviewed_at: approved ? new Date().toISOString() : null,
          is_demo: true,
        })
        .select("id")
        .single(),
      "document row",
    );
    const steps: [string | null, string, "coach" | "system" | "admin"][] = [
      [null, "uploaded", "coach"],
      ["uploaded", "precheck_pending", "system"],
      ["precheck_pending", "precheck_completed", "system"],
      ["precheck_completed", "awaiting_review", "system"],
      ...(approved ? ([["awaiting_review", "approved", "admin"]] as [string, string, "admin"][]) : []),
    ];
    await run(
      db.from("verification_events").insert(
        steps.map(([from, to, actor]) => ({
          coach_id: id,
          document_id: row.id,
          scope: "document",
          from_status: from,
          to_status: to,
          actor_role: actor,
          actor_id: actor === "admin" ? adminId : actor === "coach" ? id : null,
          note: actor === "admin" ? "Donnée de démonstration" : null,
        })),
      ),
      "document events",
    );
  }

  // Walk the real state machine: draft -> awaiting_review (-> approved).
  await run(
    db.from("coach_profiles").update({ verification_status: "awaiting_review", submitted_at: new Date().toISOString() }).eq("id", id),
    "submit",
  );
  await run(
    db.from("verification_events").insert({ coach_id: id, scope: "profile", from_status: "draft", to_status: "awaiting_review", actor_role: "coach", actor_id: id }),
    "submit event",
  );
  if (approved) {
    await run(
      db
        .from("coach_profiles")
        .update({ verification_status: "approved", verified_at: new Date().toISOString(), verified_by: adminId, is_published: true })
        .eq("id", id),
      "approve",
    );
    await run(
      db.from("verification_events").insert({
        coach_id: id,
        scope: "profile",
        from_status: "awaiting_review",
        to_status: "approved",
        actor_role: "admin",
        actor_id: adminId,
        note: "Donnée de démonstration",
      }),
      "approve event",
    );
  }
  return { id, services };
}

async function seedVenues() {
  const osm = JSON.parse(readFileSync(path.join(root, "scripts/data/osm-venues.json"), "utf8")) as {
    venues: { name: string; category: "gym" | "studio"; address: string | null; postal_code: string | null; city: string | null; lat: number; lng: number; website: string | null; phone: string | null; source_ref: string }[];
  };
  const slugify = (text: string) =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  const used = new Set<string>();
  const rows = osm.venues.map((venue) => {
    let slug = slugify(`${venue.name} ${venue.city ?? ""}`);
    while (used.has(slug)) slug += "-2";
    used.add(slug);
    return {
      slug,
      name: venue.name,
      category: venue.category,
      address: venue.address,
      postal_code: venue.postal_code,
      city: venue.city,
      lat: venue.lat,
      lng: venue.lng,
      website: venue.website,
      phone: venue.phone,
      source: "osm",
      source_ref: venue.source_ref,
      partner_status: "listed" as const,
      claim_status: "unclaimed" as const,
    };
  });
  await run(db.from("venues").insert(rows), "osm venues");

  for (const venue of DEMO_VENUES) {
    const { photo, ...row } = venue;
    const photoPath = photo ? await (async () => {
      const body = readFileSync(path.join(root, "scripts/data/media", photo));
      const target = `demo/${venue.slug}.jpg`;
      await run(db.storage.from("venue-media").upload(target, body, { contentType: "image/jpeg", upsert: true }), "venue photo");
      return target;
    })() : null;
    await run(db.from("venues").insert({ ...row, photo_path: photoPath, source: "demo", is_demo: true }), `venue ${venue.slug}`);
  }
  return rows.length + DEMO_VENUES.length;
}

async function main() {
  console.log(`Seeding ${new URL(url as string).host}…`);
  const passwords = credentials();
  const removed = await cleanup();
  console.log(`  removed ${removed} previous demo account(s)`);

  const sports = must(await db.from("sports").select("id, slug"), "sports");
  const sportIds = new Map(sports.map((sport) => [sport.slug, sport.id]));

  // --- administrator (role granted here, with the service key: never from the app)
  const adminId = await createUser("admin@boldup.test", passwords.admin, "BoldUP Admin", "customer");
  await run(db.from("profiles").update({ role: "admin", city: "Créteil" }).eq("id", adminId), "admin role");

  // --- coaches
  const coaches = new Map<string, Awaited<ReturnType<typeof seedCoach>>>();
  for (const coach of COACHES) {
    const password = coach.key === "alexandre" ? passwords.coach : passwords.pending;
    coaches.set(coach.key, await seedCoach(coach, password, adminId, sportIds));
    console.log(`  coach ${coach.name} (${coach.status})`);
  }

  // --- customers
  const camilleId = await createUser("camille@boldup.test", passwords.customer, "Camille Reynaud", "customer");
  await run(
    db
      .from("profiles")
      .update({ city: "Créteil", postal_code: "94000", favorite_sports: ["boxe"], level: "beginner", goal: "Découvrir la boxe et reprendre confiance en moi." })
      .eq("id", camilleId),
    "camille profile",
  );
  const julienId = await createUser("julien@boldup.test", passwords.pending, "Julien Mercier", "customer");
  await run(db.from("profiles").update({ city: "Maisons-Alfort", postal_code: "94700", favorite_sports: ["musculation"] }).eq("id", julienId), "julien profile");

  // --- bookings with Alexandre (times inside his opening hours, in Paris local time)
  const alexandre = coaches.get("alexandre")!;
  const service = (name: string) => {
    const found = alexandre.services.find((item) => item.name === name);
    if (!found) throw new Error(`service ${name}`);
    return found;
  };
  const booking = (customerId: string, serviceName: string, key: string, time: string, status: "requested" | "accepted" | "completed", extra: Record<string, unknown> = {}) => {
    const item = service(serviceName);
    const start = parisInstant(key, time);
    return {
      coach_id: alexandre.id,
      customer_id: customerId,
      service_id: item.id,
      service_name: item.name,
      duration_min: item.duration_min,
      price_cents: item.price_cents,
      starts_at: start.toISOString(),
      ends_at: new Date(start.getTime() + item.duration_min * 60000).toISOString(),
      status,
      decided_at: status === "requested" ? null : new Date().toISOString(),
      is_demo: true,
      ...extra,
    };
  };
  const today = parisKey(new Date());
  await run(
    db.from("bookings").insert([
      booking(camilleId, "Boxe individuelle", dayOn(3, WEEKDAYS), "18:00", "requested", {
        location_kind: "gym",
        message: "Bonjour Alexandre, je débute complètement la boxe. Est-ce que la séance est adaptée ?",
      }),
      booking(camilleId, "Séance découverte", dayOn(6, WEEKDAYS), "08:00", "accepted", { location_kind: "gym" }),
      booking(camilleId, "Renforcement musculaire", dayOn(-9, WEEKDAYS), "18:30", "completed", { location_kind: "outdoor" }),
      booking(julienId, "Coaching personnalisé", dayOn(2, WEEKDAYS), "19:00", "requested", {
        location_kind: "home",
        message: "Objectif : reprendre le sport après une blessure au genou.",
      }),
      ...(WEEKDAYS.includes(isoWeekday(today)) ? [booking(julienId, "Renforcement musculaire", today, "20:00", "accepted", { location_kind: "gym" })] : []),
    ]),
    "bookings",
  );
  await run(
    db.from("notifications").insert([
      { user_id: alexandre.id, kind: "booking_requested", data: { customer: "Camille Reynaud", service: "Boxe individuelle" }, link: "/pro/demandes" },
      { user_id: alexandre.id, kind: "booking_requested", data: { customer: "Julien Mercier", service: "Coaching personnalisé" }, link: "/pro/demandes" },
      { user_id: alexandre.id, kind: "profile_approved", data: {}, link: "/pro" },
      { user_id: camilleId, kind: "booking_accepted", data: { by: "Alexandre Moreau", service: "Séance découverte" }, link: "/reservations" },
      { user_id: adminId, kind: "coach_submitted", data: { coach_id: coaches.get("yanis")!.id, name: "Yanis Bellamy" }, link: `/admin/coachs/${coaches.get("yanis")!.id}` },
    ]),
    "notifications",
  );

  // --- a real conversation (inserted in order so timestamps follow)
  const conversation = must(
    await db.from("conversations").insert({ coach_id: alexandre.id, customer_id: camilleId }).select("id").single(),
    "conversation",
  );
  for (const [sender, body] of [
    [camilleId, "Bonjour Alexandre, je n'ai jamais fait de boxe. Faut-il du matériel pour la première séance ?"],
    [alexandre.id, "Bonjour Camille ! Rien à prévoir : je fournis les gants et les bandes. Venez avec une tenue de sport et une bouteille d'eau."],
    [camilleId, "Parfait, merci. J'ai envoyé une demande pour la semaine prochaine."],
  ] as const) {
    await run(db.from("messages").insert({ conversation_id: conversation.id, sender_id: sender, body }), "message");
  }
  await run(db.from("conversations").insert({ coach_id: alexandre.id, customer_id: julienId }), "conversation julien");

  await run(
    db.from("favorites").insert([
      { customer_id: camilleId, coach_id: alexandre.id },
      { customer_id: camilleId, coach_id: coaches.get("nadia")!.id },
    ]),
    "favorites",
  );

  // Sanity check with the database's own rule: every seeded coach must be complete,
  // otherwise the admin could not approve the pending one from the interface.
  for (const [key, seeded] of coaches) {
    const checklist = must(await db.rpc("coach_checklist", { p_coach_id: seeded.id }), `checklist ${key}`) as Record<string, unknown>;
    const missing = ["identity", "photo", "bio", "sports", "services", "location", "qualifications", "availability", "documents"].filter((step) => checklist[step] !== true);
    if (missing.length) throw new Error(`Seeded coach "${key}" is incomplete: ${missing.join(", ")}`);
  }

  const venueCount = await seedVenues();
  console.log(`  ${venueCount} venues`);
  const extra = await seedPlacesAndEvents(db);
  console.log(`  ${extra.clubs} clubs, ${extra.spots} street workout spots, ${extra.events} events`);

  const lines = [
    "# BOLD UP — demo accounts",
    "",
    `Project: ${new URL(url as string).host}`,
    "",
    "| Role | Persona | E-mail | Password |",
    "|---|---|---|---|",
    `| Coach (approved, published) | Alexandre Moreau | alexandre@boldup.test | ${passwords.coach} |`,
    `| Customer | Camille Reynaud | camille@boldup.test | ${passwords.customer} |`,
    `| Administrator | BoldUP Admin | admin@boldup.test | ${passwords.admin} |`,
    `| Coach (awaiting validation) | Yanis Bellamy | yanis@boldup.test | ${passwords.pending} |`,
    "",
    "The other demo coaches (nadia@, sarah@, thomas@, ines@, mehdi@, lucas@boldup.test) and the second",
    "customer (julien@boldup.test) use the same password as Yanis.",
    "",
    "Generated by `npm run db:seed`. This file is git-ignored: do not commit it.",
    "",
  ];
  writeFileSync(path.join(root, ".demo-credentials.md"), lines.join("\n"));
  console.log("\nDone. Credentials written to .demo-credentials.md");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
