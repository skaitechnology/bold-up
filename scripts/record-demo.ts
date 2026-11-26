/**
 * Records the product demo videos, one per user journey, with French captions.
 *
 *   NEXT_DIST_DIR=.next-video npm run build && NEXT_DIST_DIR=.next-video npx next start -p 3100
 *   npx tsx scripts/record-demo.ts [--from=1] [--only=5] [--out=~/Desktop/BOLD_UP_videos_FR_V1]
 *
 * It plays the real story against the LOCAL database: Alexandre signs up as a coach,
 * completes his profile, uploads documents, the admin approves him, Camille finds him,
 * requests a session, he accepts, they chat. Nothing is mocked.
 *
 * The story stays in the local database afterwards, so one journey can be recorded
 * again with --only=N. Run `npm run db:seed` to get the standard demo scenario back.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { demoPdf } from "./lib/demo-pdf";

const root = path.resolve(__dirname, "..");
loadEnv({ path: path.join(root, ".env.local"), quiet: true });

const arg = (name: string) => process.argv.find((item) => item.startsWith(`--${name}=`))?.split("=")[1];
const BASE = process.env.DEMO_BASE_URL ?? "http://localhost:3100";
const FROM = Number(arg("from") ?? 1);
const ONLY = arg("only") ? Number(arg("only")) : null;
const OUT = (arg("out") ?? path.join(os.homedir(), "Desktop", "BOLD_UP_videos_FR_V1")).replace(/^~/, os.homedir());
const WORK = path.join(root, "test-results", "demo-video");
const RAW = path.join(WORK, "raw");
const STATE = path.join(WORK, "state");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (!/127\.0\.0\.1|localhost/.test(SUPABASE_URL)) {
  console.error("The demo recorder only runs against local Supabase.");
  process.exit(1);
}
const db = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", { auth: { persistSession: false } });

const credentials = () => {
  const store = JSON.parse(readFileSync(path.join(root, ".demo-credentials.json"), "utf8")) as Record<string, Record<string, string>>;
  return store[new URL(SUPABASE_URL).host]!;
};

const COACH = { name: "Alexandre Moreau", email: "alexandre@boldup.test", slug: "alexandre-moreau" };
const CUSTOMER = { name: "Camille Reynaud", email: "camille@boldup.test" };
const ADMIN = { email: "admin@boldup.test" };

// ---------------------------------------------------------------- recording helpers

type Actor = ReturnType<typeof makeActor>;

function makeActor(page: Page, mobile: boolean) {
  const pause = (ms: number) => page.waitForTimeout(ms);
  /** French caption shown at the bottom of the screen (top on phones). */
  const say = async (text: string, hold = 0) => {
    await page.evaluate((value) => (window as unknown as { __demoCaption?: (t: string) => void }).__demoCaption?.(value), text).catch(() => {});
    if (hold) await pause(hold);
  };
  const reveal = async (locator: Locator) => {
    await locator.evaluate((element) => element.scrollIntoView({ behavior: "smooth", block: "center" })).catch(() => {});
    await pause(650);
  };
  const hover = async (locator: Locator) => {
    await reveal(locator);
    const box = await locator.boundingBox();
    if (box && !mobile) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 24 });
    await pause(180);
  };
  const click = async (locator: Locator, wait = 750) => {
    await hover(locator);
    if (mobile) await locator.tap();
    else await locator.click();
    await pause(wait);
  };
  const type = async (locator: Locator, text: string, delay = 30) => {
    await hover(locator);
    if (mobile) await locator.tap();
    else await locator.click();
    await locator.pressSequentially(text, { delay });
    await pause(280);
  };
  const scrollBy = async (pixels: number, wait = 1000) => {
    await page.evaluate((top) => window.scrollBy({ top, behavior: "smooth" }), pixels);
    await pause(wait);
  };
  const scrollTop = async () => {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await pause(700);
  };
  const goto = async (url: string, wait = 900) => {
    await page.goto(BASE + url, { waitUntil: "networkidle" });
    await pause(wait);
  };
  const login = async (email: string, password: string) => {
    await goto("/connexion", 600);
    await type(page.locator('input[name="email"]'), email, 22);
    await type(page.locator('input[name="password"]'), password, 22);
    await click(page.getByTestId("login-submit"), 300);
    await page.waitForURL((url) => !url.pathname.startsWith("/connexion"));
    await page.waitForLoadState("networkidle");
    await pause(900);
  };
  const mapReady = () => page.waitForSelector('[data-testid="map"][data-ready="true"]', { timeout: 30_000 });
  /** Moves the caption under the header when the action happens at the bottom of the screen. */
  const captionAt = (position: "top" | "bottom") =>
    page.evaluate((value) => (window as unknown as { __demoCaptionAt?: (p: string) => void }).__demoCaptionAt?.(value), position).catch(() => {});
  /** Makes a raw JSON answer readable in the video. */
  const enlargeRawAnswer = () =>
    page.addStyleTag({ content: "body{margin:0;padding:120px 110px;background:#f7f7f5}pre,body{font:600 30px/1.5 ui-monospace,Menlo,monospace!important;color:#111}.json-formatter-container{display:none}" }).catch(() => {});
  return { page, pause, say, reveal, hover, click, type, scrollBy, scrollTop, goto, login, mapReady, captionAt, enlargeRawAnswer };
}

/**
 * Overlays injected in every page: a visible cursor and the caption bar.
 * The code lives in a plain .js file because it is sent to the browser as text.
 */
async function addOverlays(context: BrowserContext, mobile: boolean) {
  await context.addInitScript({ content: `window.__demoMobile = ${mobile ? "true" : "false"};` });
  await context.addInitScript({ path: path.join(__dirname, "lib", "demo-overlay.js") });
}

const titleCard = (number: number, title: string, subtitle: string, mobile: boolean) => `<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#111;color:#fff;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif">
  <div style="padding:0 ${mobile ? 28 : 120}px;max-width:1100px">
    <div style="font-weight:900;letter-spacing:.02em;font-size:${mobile ? 20 : 26}px">BOLD UP<span style="display:inline-block;width:.3em;height:.3em;border-radius:50%;background:#b8975a;margin-left:.12em;vertical-align:top"></span></div>
    <div style="margin-top:${mobile ? 36 : 56}px;color:#b8975a;font-weight:600;letter-spacing:.16em;font-size:${mobile ? 12 : 15}px;text-transform:uppercase">Parcours ${String(number).padStart(2, "0")}</div>
    <div style="margin-top:14px;font-weight:800;letter-spacing:-.03em;line-height:1;font-size:${mobile ? 40 : 84}px">${title}</div>
    <div style="margin-top:${mobile ? 18 : 26}px;color:rgba(255,255,255,.72);font-size:${mobile ? 16 : 24}px;line-height:1.4;max-width:820px">${subtitle}</div>
  </div></body></html>`;

type Flow = {
  number: number;
  file: string;
  title: string;
  subtitle: string;
  mobile?: boolean;
  /** Start signed in as this role (cookies saved by an earlier flow). */
  as?: "coach" | "customer";
  run: (actor: Actor, context: BrowserContext) => Promise<void>;
};

const statePath = (role: string) => path.join(STATE, `${role}.json`);

async function record(browser: Browser, flow: Flow) {
  const mobile = Boolean(flow.mobile);
  const dir = path.join(RAW, flow.file);
  rmSync(dir, { recursive: true, force: true });
  const context = await browser.newContext({
    viewport: mobile ? { width: 430, height: 932 } : { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: mobile,
    hasTouch: mobile,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    colorScheme: "light",
    storageState: flow.as && existsSync(statePath(flow.as)) ? statePath(flow.as) : undefined,
    // Playwright never scales a recording up: record at the viewport size, upscale when encoding.
    recordVideo: { dir, size: mobile ? { width: 430, height: 932 } : { width: 1440, height: 900 } },
  });
  await addOverlays(context, mobile);
  const page = await context.newPage();
  const actor = makeActor(page, mobile);
  const started = Date.now();
  let failure: unknown = null;
  try {
    await page.setContent(titleCard(flow.number, flow.title, flow.subtitle, mobile));
    await actor.pause(2600);
    await flow.run(actor, context);
    await actor.pause(1600);
  } catch (error) {
    failure = error;
    await page.screenshot({ path: path.join(WORK, `${flow.file}-error.png`) }).catch(() => {});
  }
  await context.close(); // flushes the video file
  if (failure) throw failure;

  const raw = readdirSync(dir).find((name) => name.endsWith(".webm"));
  if (!raw) throw new Error(`no video for ${flow.file}`);
  mkdirSync(OUT, { recursive: true });
  const target = path.join(OUT, `BOLD_UP_${flow.file}.mp4`);
  // H.264 MP4 plays everywhere (QuickTime, phones, slides). The first 0.4 s is the blank page before the title card.
  const scale = mobile ? "scale=860:1864:flags=lanczos" : "scale=1920:1200:flags=lanczos";
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", "0.4", "-i", path.join(dir, raw), "-vf", scale, "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "25", "-movflags", "+faststart", "-an", target]);
  console.log(`  ✓ ${path.basename(target)}  (${Math.round((Date.now() - started) / 1000)} s)`);
}

// ---------------------------------------------------------------- the story

const tmp = path.join(WORK, "files");
const cardPdf = path.join(tmp, "carte-professionnelle.pdf");
const insurancePdf = path.join(tmp, "attestation-rc-pro.pdf");
const photo = path.join(root, "scripts/data/media/alexandre.jpg");

function flows(password: { coach: string; customer: string; admin: string; pending: string }): Flow[] {
  return [
    {
      number: 1,
      file: "01_Inscription_coach",
      title: "Inscription du coach",
      subtitle: "Créer son espace professionnel en trois actions.",
      run: async (a, context) => {
        const { page } = a;
        await a.goto("/");
        await a.say("Alexandre est coach de boxe à Créteil. Il découvre Bold Up.", 2600);
        await a.click(page.getByRole("banner").getByRole("link", { name: "Créer un compte" }));
        await a.say("Action 1 : il choisit « Je suis coach ».", 1200);
        await a.click(page.getByTestId("role-coach"));
        await a.say("Action 2 : un nom, un e-mail, un mot de passe. Rien d'autre.");
        await a.type(page.locator('input[name="fullName"]'), COACH.name);
        await a.type(page.locator('input[name="email"]'), COACH.email);
        await a.type(page.locator('input[name="password"]'), password.coach);
        await a.say("Action 3 : il crée son espace coach.", 900);
        await a.click(page.getByTestId("signup-submit"), 300);
        await page.waitForURL("**/pro");
        await page.waitForLoadState("networkidle");
        await a.say("Son tableau de bord s'ouvre aussitôt. Aucun diplôme n'est demandé à l'inscription.", 3600);
        await a.say("Le profil est complété à 0 % : Bold Up indique la prochaine étape.", 800);
        await a.reveal(page.getByTestId("checklist"));
        await a.pause(3000);
        await a.scrollTop();
        await context.storageState({ path: statePath("coach") });
      },
    },
    {
      number: 2,
      file: "02_Profil_progressif",
      title: "Profil progressif",
      subtitle: "Le coach complète son profil à son rythme. Chaque section s'enregistre.",
      as: "coach",
      run: async (a) => {
        const { page } = a;
        await a.goto("/pro");
        await a.say("Depuis le tableau de bord, un seul bouton : la prochaine étape.", 1800);
        await a.click(page.getByTestId("next-step"), 1200);

        await a.say("Identité : une accroche et une présentation.");
        const identity = page.getByTestId("identity-form");
        await a.type(identity.locator('input[name="headline"]'), "Coach boxe & renforcement — Créteil", 24);
        await a.type(
          identity.locator('textarea[name="bio"]'),
          "Séances individuelles de boxe et de renforcement musculaire, adaptées à vos objectifs. De la première séance à la préparation physique avancée.",
          9,
        );
        await a.click(page.getByTestId("identity-save"), 1500);

        await a.say("Il ajoute sa photo de profil.");
        await a.reveal(page.getByTestId("photo-preview"));
        await page.getByTestId("photo-input").setInputFiles(photo);
        await page.waitForSelector('[data-testid="photo-preview"][data-has-photo="true"]', { timeout: 20_000 });
        await a.pause(1800);

        await a.say("Ses spécialités et le public qu'il accompagne.");
        const coaching = page.getByTestId("coaching-form");
        for (const sport of ["boxe", "musculation", "preparation-physique"]) await a.click(coaching.locator(`[data-sport="${sport}"]`), 300);
        for (const level of ["Débutant", "Intermédiaire", "Confirmé"]) await a.click(coaching.getByText(level, { exact: true }), 250);
        await a.click(coaching.getByText("Séance individuelle", { exact: true }), 300);
        await a.type(coaching.locator('input[name="years_experience"]'), "6");
        await a.click(page.getByTestId("coaching-save"), 1500);

        await a.say("Ses prestations : une durée, un tarif. Il reste libre de ses prix.");
        for (const service of [
          { name: "Séance découverte", duration: "30", price: "25" },
          { name: "Boxe individuelle", duration: "60", price: "50" },
        ]) {
          await a.click(page.getByTestId("service-add").first(), 700);
          await a.type(page.locator('input[name="name"]'), service.name, 26);
          await page.locator('select[name="duration_min"]').selectOption(service.duration);
          await a.type(page.locator('input[name="price"]'), service.price);
          await a.click(page.getByTestId("service-save"), 1300);
        }

        await a.say("Sa zone d'intervention : une ville et un rayon. Jamais d'adresse précise.");
        await a.type(page.locator("#coach-city"), "Créteil", 60);
        await a.pause(600);
        await a.click(page.getByRole("option", { name: /Créteil/ }).first(), 500);
        const location = page.getByTestId("location-form");
        await location.locator('select[name="service_radius_km"]').selectOption("8");
        await a.click(location.getByText("En salle", { exact: true }), 300);
        await a.click(location.getByText("Au domicile du client", { exact: true }), 300);
        await a.click(page.getByTestId("location-save"), 1500);

        await a.say("Ses qualifications : elles restent « déclarées » tant qu'elles ne sont pas contrôlées.");
        const qualification = page.getByTestId("qualification-form");
        await a.type(qualification.locator('input[name="title"]'), "BPJEPS Boxe", 30);
        await a.type(qualification.locator('input[name="issuer"]'), "CREPS Île-de-France", 22);
        await a.type(qualification.locator('input[name="year_obtained"]'), "2020");
        await a.click(page.getByTestId("qualification-add"), 1600);
        await a.reveal(page.getByTestId("qualification-row").first());
        await a.pause(1400);

        await a.say("Enfin, ses disponibilités de la semaine, en heure de Paris.");
        await a.click(page.getByRole("link", { name: "Agenda" }).first(), 900);
        await a.click(page.getByTestId("tab-availability"), 900);
        const addRange = page.getByTestId("add-range");
        for (let day = 0; day < 6; day++) await a.click(addRange.nth(day), 260);
        await a.click(addRange.nth(1), 260);
        await a.click(addRange.nth(3), 260);
        await a.click(page.getByTestId("availability-save"), 1600);

        await a.click(page.getByRole("link", { name: "Tableau de bord" }).first(), 1200);
        await a.say("Le profil est complété à 89 %, calculé à partir des données réelles. Il ne manque que les justificatifs.", 2200);
        await a.reveal(page.getByTestId("checklist"));
        await a.pause(3200);
      },
    },
    {
      number: 3,
      file: "03_Documents_et_pre_verification",
      title: "Documents et pré-vérification",
      subtitle: "Envoi des justificatifs, pré-vérification IA simulée, puis soumission du profil.",
      as: "coach",
      run: async (a) => {
        const { page } = a;
        await a.goto("/pro");
        await a.click(page.getByRole("link", { name: "Documents" }).first(), 1200);
        await a.say("Les justificatifs restent privés : seule l'équipe de validation y a accès.", 3200);

        const upload = async (type: string, file: string, reference: string, expires: string, first: boolean) => {
          await a.click(page.getByTestId(`upload-${type}`), 800);
          await page.getByTestId("document-file").setInputFiles(file);
          await a.pause(900);
          await a.type(page.getByPlaceholder("Numéro de carte, de police…"), reference, 24);
          await page.locator('dialog input[type="date"]').fill(expires);
          await a.pause(500);
          if (first) await a.say("Document reçu, puis pré-vérification IA simulée : un contrôle technique du fichier, rien de plus.");
          await a.click(page.getByTestId("document-submit"), 200);
          await page.waitForSelector('[data-testid="document-progress"][data-stage="done"]', { timeout: 30_000 });
          if (first) await a.say("Pré-vérification terminée — en attente de validation humaine.", 3000);
          else await a.pause(1600);
          await a.click(page.getByTestId("document-close"), 1100);
        };
        await a.say("Il envoie sa carte professionnelle d'éducateur sportif.");
        await upload("carte_pro", cardPdf, "DEMO-CP-2020", "2029-05-08", true);
        await a.say("Puis son attestation d'assurance responsabilité civile professionnelle.");
        await upload("insurance", insurancePdf, "DEMO-RC-2026", "2027-07-18", false);

        await a.say("Chaque document suit son parcours : reçu, pré-vérifié, en attente de validation.", 800);
        await a.reveal(page.locator('[data-testid="doc-type-carte_pro"]'));
        await a.pause(2600);

        await a.say("Tout est prêt : il soumet son profil pour validation.");
        await a.reveal(page.getByTestId("submit-card"));
        await a.click(page.getByTestId("submit-profile"), 2200);
        await a.click(page.getByRole("link", { name: "Tableau de bord" }).first(), 1200);
        await a.say("Statut : en cours de validation. Le profil n'est pas encore public, et aucun badge « Vérifié » n'est affiché.", 4200);
      },
    },
    {
      number: 4,
      file: "04_Validation_administrateur",
      title: "Validation par l'administrateur",
      subtitle: "Un humain contrôle chaque pièce avant toute mention « Vérifié ».",
      run: async (a) => {
        const { page } = a;
        await a.say("L'administrateur Bold Up se connecte.");
        await a.login(ADMIN.email, password.admin);
        await a.say("Tous les chiffres de cette page viennent de la base de données.", 3000);
        const queued = page.getByTestId("queue-item").filter({ hasText: COACH.name });
        await a.say("Le dossier d'Alexandre attend dans la file.");
        await a.hover(queued);
        await a.pause(900);
        await a.click(queued.getByTestId("queue-review"), 400);
        await page.waitForURL("**/admin/coachs/**");
        await page.waitForLoadState("networkidle");
        await a.pause(1200);

        await a.say("Tant que les documents ne sont pas validés, l'approbation est impossible.", 3200);
        const pending = page.locator('[data-testid="admin-document"][data-status="awaiting_review"]');
        await a.say("Chaque document s'ouvre par un lien sécurisé, valable une minute.");
        await a.hover(pending.first().getByTestId("open-document"));
        await a.pause(1800);
        await a.say("La pré-vérification simulée ne dit rien de l'authenticité : la décision reste humaine.");
        await a.reveal(pending.first().getByText("Pré-vérification simulée"));
        await a.pause(3000);

        await a.say("Il note le contrôle externe effectué, en interne, puis valide le document.");
        await a.type(pending.first().locator('textarea[name="externalCheck"]'), "Carte contrôlée sur le portail officiel des éducateurs sportifs : numéro conforme.", 14);
        await a.click(pending.first().getByTestId("document-approve"), 400);
        await page.waitForFunction(() => document.querySelectorAll('[data-testid="admin-document"][data-status="awaiting_review"]').length === 1);
        await a.pause(1100);
        await a.click(pending.first().getByTestId("document-approve"), 400);
        await page.waitForFunction(() => document.querySelectorAll('[data-testid="admin-document"][data-status="awaiting_review"]').length === 0);
        await a.pause(1200);

        await a.say("Il confirme aussi la qualification déclarée.");
        await a.click(page.getByRole("button", { name: "Marquer vérifiée" }).first(), 1600);

        await a.say("Tous les documents obligatoires sont validés : il peut approuver le coach.");
        await a.reveal(page.getByTestId("decision-panel"));
        await a.click(page.getByTestId("coach-approve"), 400);
        await page.waitForFunction(() => document.querySelector('[data-testid="coach-status"]')?.textContent === "Vérifié");
        await a.scrollTop();
        await a.say("Statut : vérifié. Le profil est publié et les demandes de séance sont ouvertes.", 3400);

        await a.say("Chaque décision est tracée : qui, quand, et le contrôle externe en note interne.");
        await a.reveal(page.getByTestId("verification-history"));
        await a.pause(3600);
      },
    },
    {
      number: 5,
      file: "05_Decouverte_et_carte",
      title: "Découverte et carte",
      subtitle: "Une cliente cherche un coach de boxe près de Créteil.",
      run: async (a) => {
        const { page } = a;
        await a.goto("/");
        await a.say("Camille habite Créteil. Elle veut débuter la boxe, près de chez elle.", 2800);
        await a.hover(page.getByTestId("home-sport"));
        await page.getByTestId("home-sport").selectOption("boxe");
        await a.pause(900);
        await a.click(page.getByTestId("home-search"), 300);
        await page.waitForURL(/\/coachs\?sport=boxe/);
        await a.mapReady();
        await a.pause(2200);
        await a.say("Les coachs de boxe vérifiés, du plus proche au plus éloigné, avec leur distance réelle.", 3600);

        await a.say("La carte est interactive : chaque repère est placé aux coordonnées du coach.");
        const map = page.getByTestId("map");
        const box = (await map.boundingBox())!;
        await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.5, { steps: 20 });
        await page.mouse.wheel(0, -320);
        await a.pause(1500);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.42, box.y + box.height * 0.42, { steps: 26 });
        await page.mouse.up();
        await a.pause(1200);

        await a.say("Un clic sur un repère ouvre un aperçu du coach.");
        await a.click(page.locator('.bu-pin[data-kind="coach"]', { hasText: "25 €" }).first(), 2600);

        await a.say("Filtre de distance : 2 km autour de Créteil.");
        const radius = page.locator('[data-testid="filter-radius"]:visible');
        await a.hover(radius);
        await radius.selectOption("2");
        await a.pause(2800);
        await radius.selectOption("");
        await a.pause(1400);

        await a.say("Les salles sont là aussi : partenaires officiels ou simples fiches publiques, sans confusion.");
        await a.click(page.getByRole("tab", { name: /Salles/ }), 3000);
        await a.click(page.getByRole("tab", { name: /Coachs/ }), 1200);

        await a.say("Elle ouvre le profil d'Alexandre.");
        await a.click(page.locator('[data-testid="coach-card"]:visible').filter({ hasText: COACH.name }), 400);
        await page.waitForURL(`**/coach/${COACH.slug}`);
        await page.waitForLoadState("networkidle");
        await a.say("Un profil professionnel, vérifié par Bold Up.", 3200);
        await a.say("Prestations et tarifs affichés clairement. Aucun paiement en ligne dans cette version.");
        await a.reveal(page.locator("#prestations"));
        await a.pause(2800);
        await a.say("Sa zone d'intervention est approximative : jamais d'adresse exacte.");
        await a.reveal(page.getByText("Zone approximative"));
        await a.pause(3200);
      },
    },
    {
      number: 6,
      file: "06_Demande_de_seance",
      title: "Demande de séance",
      subtitle: "Camille choisit un créneau libre et envoie sa demande.",
      run: async (a, context) => {
        const { page } = a;
        await a.goto(`/coach/${COACH.slug}`);
        const panel = () => page.getByTestId("booking-panel").first();
        await a.say("Elle choisit une prestation, un jour, puis un créneau réellement libre.");
        await a.click(panel().getByText("Boxe individuelle", { exact: true }), 1400);
        await a.click(panel().getByTestId("day-available").nth(1), 900);
        await a.click(panel().getByTestId("slot").nth(2), 1100);
        await a.click(panel().getByTestId("booking-submit"), 300);
        await page.waitForURL(/\/connexion\?next=/);
        await a.say("Un compte n'est demandé qu'au moment de réserver.", 2000);
        await a.click(page.getByRole("link", { name: "Créer un compte" }), 500);
        await page.waitForURL(/\/inscription\?next=/);
        await a.click(page.getByTestId("role-customer"), 600);
        await a.type(page.locator('input[name="fullName"]'), CUSTOMER.name);
        await a.type(page.locator('input[name="email"]'), CUSTOMER.email);
        await a.type(page.locator('input[name="password"]'), password.customer);
        await a.click(page.getByTestId("signup-submit"), 300);
        await page.waitForURL(`**/coach/${COACH.slug}?reserver=1`);
        await page.waitForLoadState("networkidle");
        await a.pause(1500);
        await a.say("Elle revient sur le profil : son choix a été conservé.", 600);
        await a.reveal(panel().locator('[data-testid="slot"][aria-pressed="true"]'));
        await a.pause(1800);
        await a.click(panel().locator("label").filter({ hasText: "En salle" }), 500);
        await a.type(panel().locator('textarea[name="message"]'), "Bonjour, je débute complètement la boxe.", 22);
        await a.say("Le tarif est indicatif : le règlement se fait directement avec le coach.", 1800);
        await a.click(panel().getByTestId("booking-submit"), 300);
        await page.waitForSelector('[data-testid="booking-sent"]');
        await a.say("Votre demande a été envoyée. Elle est enregistrée en base de données.", 3200);
        await a.click(page.getByRole("link", { name: "Voir mes réservations" }), 400);
        await page.waitForURL("**/reservations");
        await page.waitForLoadState("networkidle");
        await a.say("Dans « Réservations » : en attente de réponse du coach.", 3600);
        await context.storageState({ path: statePath("customer") });
      },
    },
    {
      number: 7,
      file: "07_Le_coach_accepte",
      title: "Le coach accepte",
      subtitle: "La demande arrive chez Alexandre. Il confirme la séance.",
      run: async (a, context) => {
        const { page } = a;
        await a.say("Alexandre se connecte à son espace coach.");
        await a.login(COACH.email, password.coach);
        await a.say("Son profil est publié, et une demande l'attend.", 3400);
        await a.click(page.getByRole("link", { name: /Demandes/ }).first(), 1300);
        const request = page.getByTestId("booking-card").filter({ hasText: CUSTOMER.name });
        await a.say("Prestation, date, heure, lieu et message de Camille : tout est là.");
        await a.hover(request);
        await a.pause(2600);
        await a.click(request.getByTestId("booking-accept"), 2200);
        await a.say("Séance confirmée. Le créneau n'est plus proposé à personne d'autre.", 1200);
        await a.click(page.getByTestId("tab-confirmed"), 2400);
        await a.click(page.getByRole("link", { name: "Agenda" }).first(), 1300);
        await a.say("La séance apparaît dans son agenda.", 800);
        const next = page.getByRole("link", { name: "Semaine suivante" });
        if ((await page.getByTestId("agenda-session").count()) === 0) await a.click(next, 1200);
        await a.pause(2800);
        await context.storageState({ path: statePath("coach") });

        // same video, the customer's side
        await context.clearCookies();
        await context.addCookies(JSON.parse(readFileSync(statePath("customer"), "utf8")).cookies);
        await a.say("Côté Camille…");
        await a.goto("/reservations", 1200);
        await a.say("Sa réservation est passée à « Confirmée ».", 3600);
      },
    },
    {
      number: 8,
      file: "08_Messagerie",
      title: "Messagerie",
      subtitle: "Coach et cliente échangent directement. Les messages sont enregistrés.",
      as: "customer",
      run: async (a, context) => {
        const { page } = a;
        const customerCookies = JSON.parse(readFileSync(statePath("customer"), "utf8")).cookies;
        const coachCookies = JSON.parse(readFileSync(statePath("coach"), "utf8")).cookies;
        // Start from an empty conversation, so this journey can be recorded again on its own.
        const { data: coachRow } = await db.from("coach_profiles").select("id").eq("slug", COACH.slug).single();
        const { data: conversations } = await db.from("conversations").select("id, customer_id").eq("coach_id", coachRow?.id ?? "");
        for (const conversation of conversations ?? []) {
          await db.from("messages").delete().eq("conversation_id", conversation.id);
          await db.from("conversations").update({ last_message_at: null, last_message_preview: null }).eq("id", conversation.id);
          await db.from("notifications").delete().eq("kind", "message_received").in("user_id", [coachRow?.id ?? "", conversation.customer_id]);
        }
        await a.goto("/reservations");
        await a.captionAt("top"); // the message field is at the bottom of the screen
        await a.say("Camille écrit à son coach depuis sa réservation.");
        await a.click(page.getByRole("button", { name: "Écrire au coach" }), 400);
        await page.waitForURL(/\/messages\/[0-9a-f-]{36}/);
        await page.waitForLoadState("networkidle");
        await a.pause(900);
        await a.type(page.getByTestId("message-input"), "Bonjour Alexandre, faut-il apporter des gants ?", 26);
        await a.click(page.getByTestId("message-send"), 2000);
        await a.say("Conversation privée : seuls les deux participants y ont accès, pas même l'administrateur.", 3200);

        await context.clearCookies();
        await context.addCookies(coachCookies);
        await a.say("Côté Alexandre…");
        await a.goto("/pro", 1400);
        await a.say("Un message non lu l'attend.", 1600);
        await a.click(page.getByRole("link", { name: /Messages/ }).first(), 1300);
        await a.click(page.getByTestId("conversation").filter({ hasText: CUSTOMER.name }), 1500);
        await a.type(page.getByTestId("message-input"), "Bonjour Camille ! Non, je fournis tout le matériel. À très vite.", 24);
        await a.click(page.getByTestId("message-send"), 2200);

        await context.clearCookies();
        await context.addCookies(customerCookies);
        await a.say("Côté Camille…");
        await a.goto("/messages", 1400);
        await a.click(page.getByTestId("conversation").filter({ hasText: COACH.name }), 1500);
        await a.say("Elle lit la réponse. Aucun message automatique : tout est réel et conservé.", 3800);
      },
    },
    {
      number: 9,
      file: "09_Modification_du_profil",
      title: "Modification du profil",
      subtitle: "Le coach change un tarif : son profil public suit aussitôt.",
      as: "coach",
      run: async (a) => {
        const { page } = a;
        await a.goto("/pro/profil");
        await a.say("Alexandre ajuste le tarif de sa séance de boxe.");
        await a.reveal(page.locator("#prestations"));
        await a.click(page.getByTestId("service-edit").nth(1), 900);
        const price = page.locator('input[name="price"]');
        await a.hover(price);
        await price.fill("");
        await a.type(price, "55");
        await a.click(page.getByTestId("service-save"), 1800);
        await a.say("Le nouveau tarif est enregistré.", 2000);
        await a.scrollTop();
        await a.say("Aperçu du profil public…");
        await a.click(page.getByTestId("preview-profile"), 400);
        await page.waitForURL(`**/coach/${COACH.slug}`);
        await page.waitForLoadState("networkidle");
        await a.pause(1400);
        await a.reveal(page.locator("#prestations"));
        await a.say("Le profil public affiche 55 €. Une adresse simple à partager : /coach/alexandre-moreau", 4200);
      },
    },
    {
      number: 10,
      file: "10_Experience_mobile",
      title: "Sur mobile",
      subtitle: "Les mêmes parcours, pensés pour le téléphone.",
      mobile: true,
      run: async (a, context) => {
        const { page } = a;
        await a.goto("/");
        await a.say("L'accueil, sur téléphone.", 2200);
        await a.scrollBy(520, 1400);
        await a.scrollBy(620, 1600);
        await a.say("La recherche : la carte, avec les résultats en bas de l'écran.");
        await a.click(page.getByRole("navigation", { name: "Menu" }).last().getByRole("link", { name: "Rechercher" }), 400);
        await a.mapReady();
        await a.pause(2200);
        await a.click(page.locator('[data-testid="sport-boxe"]:visible').first(), 2400);
        await a.say("Toucher un repère sélectionne le coach.");
        await a.click(page.locator('.bu-pin[data-kind="coach"]').first(), 2400);
        await a.say("On bascule de la carte à la liste.");
        await a.click(page.getByTestId("view-toggle"), 2600);
        await a.click(page.locator('[data-testid="coach-card"]:visible').filter({ hasText: COACH.name }), 400);
        await page.waitForURL(`**/coach/${COACH.slug}`);
        await page.waitForLoadState("networkidle");
        await a.say("Le profil du coach.", 1800);
        await a.scrollBy(640, 1500);
        await a.scrollBy(640, 1500);
        await a.say("La demande de séance s'ouvre dans un volet.");
        await a.click(page.getByTestId("booking-open"), 1400);
        const sheet = page.getByRole("dialog");
        await a.click(sheet.getByTestId("day-available").nth(2), 900);
        await a.click(sheet.getByTestId("slot").first(), 2200);
        await a.click(sheet.getByRole("button", { name: "Fermer" }), 900);

        await context.addCookies(JSON.parse(readFileSync(statePath("coach"), "utf8")).cookies);
        await a.say("Et l'espace coach, lui aussi sur mobile.");
        await a.goto("/pro", 1800);
        await a.scrollBy(560, 1600);
        await a.scrollBy(-560, 900);
        await a.click(page.getByRole("navigation", { name: "Menu" }).getByRole("link", { name: /Demandes/ }), 2200);
        await a.click(page.getByRole("navigation", { name: "Menu" }).getByRole("link", { name: "Agenda" }), 2600);
      },
    },
    {
      number: 11,
      file: "11_Securite_et_permissions",
      title: "Sécurité et permissions",
      subtitle: "Les accès sont contrôlés par le serveur et la base de données.",
      run: async (a, context) => {
        await a.say("Sans connexion, l'espace coach renvoie vers la page de connexion.");
        await a.goto("/pro", 3000);
        await a.say("Sans connexion, impossible d'ouvrir un justificatif : accès refusé.");
        const { data: document } = await db.from("coach_documents").select("id, coach_profiles!inner(slug)").eq("coach_profiles.slug", COACH.slug).limit(1).single();
        await a.goto(`/api/documents/${document?.id}`, 200);
        await a.enlargeRawAnswer();
        await a.pause(3200);

        await context.addCookies(JSON.parse(readFileSync(statePath("customer"), "utf8")).cookies);
        await a.say("Connectée en tant que cliente, Camille tente d'ouvrir l'administration…");
        await a.goto("/admin", 800);
        await a.say("Page introuvable : pour elle, l'administration n'existe pas.", 3400);
        await a.say("Elle tente d'ouvrir le même justificatif : introuvable aussi.");
        await a.goto(`/api/documents/${document?.id}`, 200);
        await a.enlargeRawAnswer();
        await a.pause(3200);

        await context.clearCookies();
        await a.say("Un coach non validé n'apparaît pas publiquement : son profil est introuvable.");
        await a.goto("/coach/yanis-bellamy", 3400);
        await a.say("Le badge « Vérifié » n'existe qu'après la validation d'un administrateur.", 800);
        await a.goto(`/coach/${COACH.slug}`, 3600);
      },
    },
  ];
}

// ---------------------------------------------------------------- main

async function prepare() {
  console.log("Preparing the story (local database)…");
  execFileSync("npm", ["run", "db:seed"], { cwd: root, stdio: "ignore" });
  // The video tells the story from the start: Alexandre and Camille do not exist yet.
  const { data } = await db.from("profiles").select("id, email").in("email", [COACH.email, CUSTOMER.email, "julien@boldup.test"]);
  for (const profile of data ?? []) {
    for (const bucket of ["coach-documents", "coach-media"]) {
      const { data: files } = await db.storage.from(bucket).list(profile.id, { limit: 100 });
      if (files?.length) await db.storage.from(bucket).remove(files.map((file) => `${profile.id}/${file.name}`));
    }
    await db.auth.admin.deleteUser(profile.id);
  }
  await db.from("rate_limits").delete().gte("window_start", "1970-01-01");
  await db.from("audit_logs").delete().gte("id", 0);
  rmSync(WORK, { recursive: true, force: true });
}

async function main() {
  const password = credentials() as { coach: string; customer: string; admin: string; pending: string };
  if (FROM === 1 && ONLY === null) await prepare();
  mkdirSync(tmp, { recursive: true });
  mkdirSync(STATE, { recursive: true });
  writeFileSync(cardPdf, demoPdf("Carte professionnelle d'educateur sportif", COACH.name));
  writeFileSync(insurancePdf, demoPdf("Attestation d'assurance RC professionnelle", COACH.name));

  const browser = await chromium.launch();
  try {
    for (const flow of flows(password)) {
      if (ONLY !== null ? flow.number !== ONLY : flow.number < FROM) continue;
      console.log(`Recording ${flow.number}. ${flow.title}`);
      await record(browser, flow);
    }
  } finally {
    await browser.close();
  }
  console.log(`\nVideos saved in ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
